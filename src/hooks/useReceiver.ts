import { useState, useRef, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSocket } from './useSocket';
import {
  TransferStatus,
  TransferProgress,
  FileMetadata,
  BatchMetadata,
  ReceivedFile,
  TransferHistoryItem,
  DataChannelMessage,
} from '../types';
import { getStoredIceServers } from '../utils/iceServers';
import { playInitiatedSound, playCompletedSound, playErrorSound } from '../utils/sound';

export function useReceiver() {
  const { socket, isConnected } = useSocket();
  const [code, setCode] = useState<string>('');
  const [status, setStatus] = useState<TransferStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);
  const [batchMeta, setBatchMeta] = useState<BatchMetadata | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [receivedBlob, setReceivedBlob] = useState<Blob | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const receivedBuffersRef = useRef<ArrayBuffer[]>([]);
  const overallBytesTransferredRef = useRef<number>(0);
  const previousFilesBytesRef = useRef<number>(0);
  const totalBatchBytesRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastSpeedTimeRef = useRef<number>(0);
  const lastSpeedBytesRef = useRef<number>(0);
  const speedEmaRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(0);
  const currentMetaRef = useRef<FileMetadata | null>(null);
  const batchMetaRef = useRef<BatchMetadata | null>(null);
  const codeRef = useRef<string>('');
  codeRef.current = code;
  const statusRef = useRef(status);
  statusRef.current = status;
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const cleanupWebRtc = useCallback(() => {
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
    (
      filesList: ReceivedFile[],
      currentCode: string,
      transferStatus: 'completed' | 'failed' | 'cancelled'
    ) => {
      try {
        if (!filesList || filesList.length === 0) return;
        const totalSize = filesList.reduce((acc, f) => acc + f.metadata.size, 0);
        const item: TransferHistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: currentCode,
          fileName:
            filesList.length === 1
              ? filesList[0].metadata.name
              : `${filesList.length} files (${filesList.map((f) => f.metadata.name).slice(0, 2).join(', ')}${filesList.length > 2 ? '...' : ''})`,
          fileSize: totalSize,
          fileType: filesList.length === 1 ? filesList[0].metadata.type || 'application/octet-stream' : 'batch',
          direction: 'receive',
          status: transferStatus,
          timestamp: Date.now(),
          downloadUrl: filesList.length === 1 ? filesList[0].downloadUrl : undefined,
          fileCount: filesList.length,
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

  // Validate 6-digit code without joining
  const validateCode = useCallback(
    (inputCode: string): Promise<{ valid: boolean; fileMeta?: any; error?: string }> => {
      return new Promise((resolve) => {
        if (!socket || !socket.connected) {
          resolve({ valid: false, error: 'Signaling server disconnected.' });
          return;
        }
        setIsValidating(true);
        if (!/^\d{6}$/.test(inputCode.trim())) {
          resolve({ valid: false, error: 'Please enter a valid 6-digit code.' });
          return;
        }
        socket.emit('validate-code', { code: inputCode.trim() }, (res: { valid: boolean; fileMeta?: FileMetadata; error?: string }) => {
          setIsValidating(false);
          if (res.valid) {
            resolve({ valid: true, fileMeta: res.fileMeta });
          } else {
            resolve({ valid: false, error: res.error || 'Invalid or expired code.' });
          }
        });
      });
    },
    [socket]
  );

  // Join transfer session
  const joinTransfer = useCallback(
    (inputCode: string) => {
      const cleanCode = inputCode.trim();
      if (!socket || !socket.connected) {
        setErrorMessage('Signaling server is disconnected.');
        return;
      }
      if (!/^\d{6}$/.test(cleanCode)) {
        setErrorMessage('Please enter a valid 6-digit code.');
        return;
      }

      cleanupWebRtc();
      setCode(cleanCode);
      setErrorMessage(null);
      setStatus('connecting');
      setProgress(null);
      setDownloadUrl(null);
      setReceivedBlob(null);
      setReceivedFiles([]);
      setBatchMeta(null);
      receivedBuffersRef.current = [];
      overallBytesTransferredRef.current = 0;
      previousFilesBytesRef.current = 0;
      totalBatchBytesRef.current = 0;

      socket.emit(
        'join-room',
        { code: cleanCode },
        (res: { success: boolean; fileMeta?: any; error?: string }) => {
          if (res.success) {
            if (res.fileMeta) {
              setFileMeta(res.fileMeta);
              currentMetaRef.current = res.fileMeta;
              totalBatchBytesRef.current = res.fileMeta.size || 0;
            }
            setStatus('connecting');
          } else {
            setStatus('failed');
            setErrorMessage(res.error || 'Failed to join transfer room.');
            playErrorSound();
          }
        }
      );
    },
    [socket, cleanupWebRtc]
  );

  // Setup WebRTC listeners for offer & ICE candidates
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async (data: { offer: RTCSessionDescriptionInit; senderId: string }) => {
      setStatus('connecting');

      try {
        cleanupWebRtc();
        const iceServers = getStoredIceServers();
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        // Exchange ICE candidates
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
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            if (statusRef.current !== 'completed' && statusRef.current !== 'cancelled') {
              setStatus('failed');
              setErrorMessage('Direct connection to sender was lost.');
              playErrorSound();
            }
          }
        };

        // Listen to DataChannel created by Sender
        pc.ondatachannel = (event) => {
          const dataChannel = event.channel;
          dataChannel.binaryType = 'arraybuffer';
          dataChannelRef.current = dataChannel;

          dataChannel.onopen = () => {
            setStatus('connected');
          };

          dataChannel.onmessage = (msgEvent) => {
            const rawData = msgEvent.data;

            // 1. Text control messages
            if (typeof rawData === 'string') {
              try {
                const message: DataChannelMessage = JSON.parse(rawData);

                if (message.type === 'BATCH_HEADER') {
                  batchMetaRef.current = message.batch;
                  setBatchMeta(message.batch);
                  totalBatchBytesRef.current = message.batch.totalBytes;
                  overallBytesTransferredRef.current = 0;
                  previousFilesBytesRef.current = 0;
                  startTimeRef.current = performance.now();
                  lastSpeedTimeRef.current = startTimeRef.current;
                  lastSpeedBytesRef.current = 0;
                  speedEmaRef.current = 0;
                  setStatus('transferring');
                  playInitiatedSound();
                } else if (message.type === 'HEADER') {
                  currentMetaRef.current = message.metadata;
                  setFileMeta(message.metadata);
                  receivedBuffersRef.current = [];

                  // If not already in transferring status or first file
                  if (!startTimeRef.current) {
                    startTimeRef.current = performance.now();
                    lastSpeedTimeRef.current = startTimeRef.current;
                    lastSpeedBytesRef.current = 0;
                    speedEmaRef.current = 0;
                    if (!totalBatchBytesRef.current) {
                      totalBatchBytesRef.current = message.metadata.size;
                    }
                  }
                  setStatus('transferring');
                } else if (message.type === 'FILE_COMPLETE') {
                  const meta = currentMetaRef.current;
                  if (!meta) return;

                  // Assemble complete Blob for this completed file
                  const blob = new Blob(receivedBuffersRef.current, {
                    type: meta.type || 'application/octet-stream',
                  });
                  const url = URL.createObjectURL(blob);

                  const completedFileItem: ReceivedFile = {
                    metadata: meta,
                    blob,
                    downloadUrl: url,
                  };

                  setReceivedFiles((prev) => [...prev, completedFileItem]);
                  receivedBuffersRef.current = [];
                  previousFilesBytesRef.current += meta.size;

                  // Set as active single file for simple single-file preview
                  setReceivedBlob(blob);
                  setDownloadUrl(url);
                } else if (message.type === 'TRANSFER_COMPLETE') {
                  setStatus('completed');
                  playCompletedSound();

                  // Celebration confetti
                  try {
                    confetti({
                      particleCount: 80,
                      spread: 60,
                      origin: { y: 0.6 },
                    });
                  } catch {
                    // ignore
                  }

                  // Retrieve all completed files
                  setReceivedFiles((currentReceived) => {
                    if (codeRef.current && currentReceived.length > 0) {
                      saveHistory(currentReceived, codeRef.current, 'completed');
                    }
                    return currentReceived;
                  });
                } else if (message.type === 'TRANSFER_CANCEL') {
                  setStatus('cancelled');
                  setErrorMessage(message.reason || 'Transfer cancelled by sender.');
                }
              } catch (e) {
                console.error('[Error parsing control message]', e);
              }
              return;
            }

            // 2. Binary ArrayBuffer chunks
            if (rawData instanceof ArrayBuffer) {
              receivedBuffersRef.current.push(rawData);
              overallBytesTransferredRef.current += rawData.byteLength;

              const totalBytes =
                totalBatchBytesRef.current || currentMetaRef.current?.size || 0;
              const transferred = overallBytesTransferredRef.current;
              const now = performance.now();
              const elapsedSinceLastSpeed = (now - lastSpeedTimeRef.current) / 1000;

              if (elapsedSinceLastSpeed >= 0.25 || transferred >= totalBytes) {
                const bytesInWindow = transferred - lastSpeedBytesRef.current;
                const instSpeed = bytesInWindow / Math.max(elapsedSinceLastSpeed, 0.01);
                speedEmaRef.current =
                  speedEmaRef.current === 0 ? instSpeed : speedEmaRef.current * 0.7 + instSpeed * 0.3;
                lastSpeedTimeRef.current = now;
                lastSpeedBytesRef.current = transferred;
              }

              const speed = speedEmaRef.current;
              const remainingBytes = Math.max(0, totalBytes - transferred);
              const timeRemaining = speed > 0 ? remainingBytes / speed : 0;
              const percentage =
                totalBytes === 0 ? 100 : Math.min(100, Math.round((transferred / totalBytes) * 100));

              setStatus('transferring');

              if (now - lastProgressTimeRef.current >= 35 || transferred >= totalBytes) {
                lastProgressTimeRef.current = now;
                const batch = batchMetaRef.current;
                const currentMeta = currentMetaRef.current;
                const fileIdx = batch?.files.findIndex((f) => f.id === currentMeta?.id);

                setProgress({
                  bytesTransferred: transferred,
                  totalBytes,
                  percentage,
                  speed,
                  timeRemaining,
                  currentChunk: receivedBuffersRef.current.length,
                  totalChunks: currentMeta?.totalChunks || Math.ceil(totalBytes / (64 * 1024)),
                  startTime: startTimeRef.current,
                  currentFileIndex: fileIdx !== undefined && fileIdx >= 0 ? fileIdx + 1 : undefined,
                  totalFiles: batch?.totalFiles || 1,
                  currentFileName: currentMeta?.name,
                });
              }
            }
          };

          dataChannel.onerror = (e) => {
            console.error('[Receiver DataChannel Error]', e);
            if (statusRef.current !== 'completed') {
              setStatus('failed');
              setErrorMessage('DataChannel transfer error occurred.');
              playErrorSound();
            }
          };
        };

        // Set remote offer & create answer
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        for (const candidate of pendingIceCandidatesRef.current.splice(0)) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (codeRef.current) {
          socket.emit('answer', {
            code: codeRef.current,
            answer,
          });
        }
      } catch (err: unknown) {
        console.error('[WebRTC Answer Error]', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setStatus('failed');
        setErrorMessage(`Failed to connect WebRTC: ${message}`);
        playErrorSound();
      }
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        if (pcRef.current && data.candidate) {
          if (!pcRef.current.remoteDescription) pendingIceCandidatesRef.current.push(data.candidate);
          else await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err: unknown) {
        console.warn('[Add ICE Candidate Error]', err);
      }
    };

    const handlePeerDisconnected = (data: { role: string; message?: string }) => {
      if (statusRef.current !== 'completed') {
        setStatus('failed');
        setErrorMessage(data.message || 'Sender disconnected before transfer completed.');
        playErrorSound();
      }
    };

    const handlePeerCancelled = (data: { reason?: string }) => {
      setStatus('cancelled');
      setErrorMessage(data.reason || 'Sender cancelled the transfer.');
    };

    socket.on('offer', handleOffer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('peer-disconnected', handlePeerDisconnected);
    socket.on('peer-cancelled', handlePeerCancelled);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('peer-disconnected', handlePeerDisconnected);
      socket.off('peer-cancelled', handlePeerCancelled);
    };
  }, [socket, cleanupWebRtc, saveHistory]);

  const cancelTransfer = useCallback(() => {
    if (codeRef.current && socket) {
      socket.emit('cancel-transfer', {
        code: codeRef.current,
        reason: 'Receiver cancelled the transfer.',
      });
    }
    cleanupWebRtc();
    setStatus('cancelled');
  }, [socket, cleanupWebRtc]);

  const reset = useCallback(() => {
    cleanupWebRtc();
    setCode('');
    setStatus('idle');
    setErrorMessage(null);
    setFileMeta(null);
    setBatchMeta(null);
    setProgress(null);
    setDownloadUrl(null);
    setReceivedBlob(null);
    setReceivedFiles([]);
    receivedBuffersRef.current = [];
    overallBytesTransferredRef.current = 0;
    previousFilesBytesRef.current = 0;
    totalBatchBytesRef.current = 0;
  }, [cleanupWebRtc]);

  return {
    code,
    status,
    errorMessage,
    fileMeta,
    batchMeta,
    progress,
    downloadUrl,
    receivedBlob,
    receivedFiles,
    isValidating,
    isConnected,
    validateCode,
    joinTransfer,
    cancelTransfer,
    reset,
  };
}
