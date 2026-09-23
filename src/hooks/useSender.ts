import { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { TransferStatus, TransferProgress, TransferHistoryItem } from '../types';
import { getStoredIceServers } from '../utils/iceServers';
import { sendMultipleFilesThroughDataChannel } from '../utils/webrtc';
import { playInitiatedSound, playCompletedSound, playErrorSound } from '../utils/sound';

export function useSender() {
  const { socket, isConnected } = useSocket();
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<TransferStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const codeRef = useRef<string | null>(null);
  codeRef.current = code;
  const statusRef = useRef(status);
  statusRef.current = status;
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const filesRef = useRef<File[]>([]);
  filesRef.current = files;

  // Cleanup WebRTC state
  const cleanupWebRtc = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (e) {
        // ignore
      }
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        // ignore
      }
      pcRef.current = null;
    }
  }, []);

  const saveHistory = useCallback(
    (currentFiles: File[], currentCode: string, transferStatus: 'completed' | 'failed' | 'cancelled') => {
      try {
        if (!currentFiles || currentFiles.length === 0) return;
        const totalSize = currentFiles.reduce((acc, f) => acc + f.size, 0);
        const item: TransferHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: currentCode,
          fileName:
            currentFiles.length === 1
              ? currentFiles[0].name
              : `${currentFiles.length} files (${currentFiles.map((f) => f.name).slice(0, 2).join(', ')}${currentFiles.length > 2 ? '...' : ''})`,
          fileSize: totalSize,
          fileType: currentFiles.length === 1 ? currentFiles[0].type || 'application/octet-stream' : 'batch',
          direction: 'send',
          status: transferStatus,
          timestamp: Date.now(),
          fileCount: currentFiles.length,
        };
        const existing = JSON.parse(localStorage.getItem('peerdrop_history') || '[]');
        const updated = [item, ...existing].slice(0, 50);
        localStorage.setItem('peerdrop_history', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to record transfer history', e);
      }
    },
    []
  );

  // Add more files to selection (no limit)
  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;
    setFiles((prev) => {
      // Append new files without duplicate name+size+lastModified
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const filtered = newFiles.filter(
        (f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
      );
      return [...prev, ...filtered];
    });
  }, []);

  // Remove a file from selection
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Generate 6-digit room code and begin waiting for receiver
  const startSending = useCallback(
    async (inputFiles?: File | File[]) => {
      if (!socket || !socket.connected) {
        setErrorMessage('Signaling server is not connected. Please check your internet connection.');
        return;
      }

      let toSend: File[] = [];
      if (inputFiles) {
        toSend = Array.isArray(inputFiles) ? inputFiles : [inputFiles];
        setFiles(toSend);
      } else {
        toSend = filesRef.current;
      }

      if (toSend.length === 0) {
        setErrorMessage('Please select at least one file to send.');
        return;
      }

      cleanupWebRtc();
      setErrorMessage(null);
      setProgress(null);
      setStatus('waiting');

      const totalSize = toSend.reduce((acc, f) => acc + f.size, 0);
      const summaryMeta = {
        name:
          toSend.length === 1
            ? toSend[0].name
            : `${toSend.length} files (${toSend[0].name}${toSend.length > 1 ? ` +${toSend.length - 1} more` : ''})`,
        size: totalSize,
        type: toSend.length === 1 ? toSend[0].type || 'application/octet-stream' : 'batch',
        fileCount: toSend.length,
        files: toSend.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
        })),
      };

      socket.emit(
        'create-room',
        { fileMeta: summaryMeta },
        (res: { success: boolean; code?: string; expiresAt?: number; error?: string }) => {
          if (res.success && res.code) {
            setCode(res.code);
            setExpiresAt(res.expiresAt || Date.now() + 15 * 60 * 1000);
          } else {
            setStatus('failed');
            setErrorMessage(res.error || 'Failed to create transfer room.');
            playErrorSound();
          }
        }
      );
    },
    [socket, cleanupWebRtc]
  );

  // Setup WebRTC connection when receiver joins
  useEffect(() => {
    if (!socket) return;

    const handleReceiverJoined = async () => {
      const activeFiles = filesRef.current;
      if (!activeFiles || activeFiles.length === 0) return;

      setStatus('connecting');
      cleanupWebRtc();

      try {
        const iceServers = getStoredIceServers();
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        // Create reliable ordered DataChannel
        const dataChannel = pc.createDataChannel('fileTransfer', {
          ordered: true,
        });
        dataChannel.binaryType = 'arraybuffer';
        dataChannelRef.current = dataChannel;

        // ICE candidate exchange
        pc.onicecandidate = (event) => {
          if (event.candidate && codeRef.current) {
            socket.emit('ice-candidate', {
              code: codeRef.current,
              candidate: event.candidate,
            });
          }
        };

      pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'connected') {
    setStatus((prev) => (prev === 'connecting' ? 'connected' : prev));
  } else if (
    pc.connectionState === 'failed' ||
    pc.connectionState === 'closed'
  ) {
    setStatus((prev) => {
      if (prev === 'completed' || prev === 'cancelled') {
        return prev;
      }

      return 'failed';
    });

    setErrorMessage('Direct TransferX connection failed or was closed.');
    playErrorSound();
  }
};

        // DataChannel lifecycle
        dataChannel.onopen = async () => {
          setStatus('transferring');
          playInitiatedSound();
          abortControllerRef.current = new AbortController();

          try {
            await sendMultipleFilesThroughDataChannel({
              files: activeFiles,
              dataChannel,
              onProgress: (p) => setProgress(p),
              signal: abortControllerRef.current.signal,
            });

            setStatus('completed');
            playCompletedSound();
            if (codeRef.current) {
              saveHistory(activeFiles, codeRef.current, 'completed');
              socket.emit('transfer-done', { code: codeRef.current });
            }
          } catch (err: unknown) {
            console.error('[Multi-File Send Error]', err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            if (message.toLowerCase().includes('abort')) {
              setStatus('cancelled');
              if (codeRef.current) saveHistory(activeFiles, codeRef.current, 'cancelled');
            } else {
              setStatus('failed');
              setErrorMessage(message || 'File transfer failed');
              playErrorSound();
              if (codeRef.current) saveHistory(activeFiles, codeRef.current, 'failed');
            }
          }
        };

        dataChannel.onerror = (e) => {
          console.error('[Sender DataChannel Error]', e);
          if (statusRef.current !== 'completed') {
            setStatus('failed');
            setErrorMessage('DataChannel encountered a transmission error.');
            playErrorSound();
          }
        };

        // Create SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (codeRef.current) {
          socket.emit('offer', {
            code: codeRef.current,
            offer,
          });
        }
      } catch (err: unknown) {
        console.error('[WebRTC Offer Setup Error]', err);
        setStatus('failed');
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrorMessage(`WebRTC initialization failed: ${message}`);
        playErrorSound();
      }
    };

    // Receive Answer from Receiver
    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (err: unknown) {
        console.error('[Set Remote Description Error]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrorMessage(`Failed to apply receiver answer: ${message}`);
      }
    };

    // Receive ICE Candidate
    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        if (pcRef.current && data.candidate) {
          if (!pcRef.current.remoteDescription) {
            pendingIceCandidatesRef.current.push(data.candidate);
          } else {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err: unknown) {
        console.warn('[Add ICE Candidate Error]', err);
      }
    };

    // Handle Peer Disconnect / Cancel
    const handlePeerDisconnected = (data: { role: string; message?: string }) => {
      if (statusRef.current !== 'completed') {
        setStatus('failed');
        setErrorMessage(data.message || 'Receiver disconnected before transfer completed.');
        playErrorSound();
      }
    };

    const handlePeerCancelled = (data: { reason?: string }) => {
      setStatus('cancelled');
      setErrorMessage(data.reason || 'Receiver cancelled the transfer.');
      const activeFiles = filesRef.current;
      if (activeFiles.length > 0 && codeRef.current) {
        saveHistory(activeFiles, codeRef.current, 'cancelled');
      }
    };

    socket.on('receiver-joined', handleReceiverJoined);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('peer-disconnected', handlePeerDisconnected);
    socket.on('peer-cancelled', handlePeerCancelled);

    return () => {
      socket.off('receiver-joined', handleReceiverJoined);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('peer-disconnected', handlePeerDisconnected);
      socket.off('peer-cancelled', handlePeerCancelled);
    };
}, [socket, cleanupWebRtc, saveHistory]);

  const cancelTransfer = useCallback(() => {
    if (codeRef.current && socket) {
      socket.emit('cancel-transfer', {
        code: codeRef.current,
        reason: 'Sender cancelled the transfer.',
      });
    }
    const activeFiles = filesRef.current;
    if (activeFiles.length > 0 && codeRef.current && status !== 'completed') {
      saveHistory(activeFiles, codeRef.current, 'cancelled');
    }
    cleanupWebRtc();
    setStatus('cancelled');
  }, [socket, status, cleanupWebRtc, saveHistory]);

  const reset = useCallback(() => {
    cleanupWebRtc();
    setFiles([]);
    setCode(null);
    setExpiresAt(null);
    setStatus('idle');
    setErrorMessage(null);
    setProgress(null);
  }, [cleanupWebRtc]);

  return {
    file: files[0] || null,
    files,
    code,
    expiresAt,
    status,
    errorMessage,
    progress,
    isConnected,
    addFiles,
    removeFile,
    clearFiles,
    startSending,
    cancelTransfer,
    reset,
  };
}
