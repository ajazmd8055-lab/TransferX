import { FileMetadata, BatchMetadata, TransferProgress, DataChannelMessage } from '../types';

export const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk (standard WebRTC safe limit)
export const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024; // 256 KB backpressure threshold
export const BUFFERED_AMOUNT_HIGH_THRESHOLD = 1024 * 1024; // 1 MB pause threshold

export interface SendProgressCallback {
  (progress: TransferProgress): void;
}

export interface SendMultipleFilesOptions {
  files: File[];
  dataChannel: RTCDataChannel;
  onProgress: SendProgressCallback;
  signal?: AbortSignal;
}

export interface SendOptions {
  file: File;
  dataChannel: RTCDataChannel;
  onProgress: SendProgressCallback;
  signal?: AbortSignal;
}

/**
 * Sends any number of files (no limit) sequentially through an RTCDataChannel
 * with backpressure flow control, per-file & batch tracking.
 */
export async function sendMultipleFilesThroughDataChannel({
  files,
  dataChannel,
  onProgress,
  signal,
}: SendMultipleFilesOptions): Promise<void> {
  if (dataChannel.readyState !== 'open') {
    throw new Error('DataChannel is not open');
  }
  if (!files || files.length === 0) {
    throw new Error('No files to send');
  }

  const totalBatchBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalChunksAcrossAll = Math.max(
    1,
    files.reduce((acc, f) => acc + Math.ceil(f.size / CHUNK_SIZE), 0)
  );

  const batchMetadata: BatchMetadata = {
    batchId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    totalFiles: files.length,
    totalBytes: totalBatchBytes,
    files: files.map((file, idx) => ({
      id: `file-${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      chunkSize: CHUNK_SIZE,
    })),
  };

  // Configure DataChannel
  dataChannel.binaryType = 'arraybuffer';
  dataChannel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;

  // 1. Send BATCH_HEADER
  const batchMsg: DataChannelMessage = {
    type: 'BATCH_HEADER',
    batch: batchMetadata,
  };
  dataChannel.send(JSON.stringify(batchMsg));

  // Small pause for receiver setup
  await new Promise((resolve) => setTimeout(resolve, 50));

  let previousFilesBytes = 0;
  let overallChunkIndex = 0;
  const startTime = performance.now();
  let lastSpeedCalcTime = startTime;
  let lastSpeedCalcBytes = 0;
  let currentSpeed = 0;
  let lastProgressTime = 0;

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const file = files[fileIdx];
    const fileMeta = batchMetadata.files[fileIdx];

    if (signal?.aborted) {
      try {
        const cancelMsg: DataChannelMessage = {
          type: 'TRANSFER_CANCEL',
          reason: 'Sender cancelled the transfer',
        };
        dataChannel.send(JSON.stringify(cancelMsg));
      } catch {
        // ignore
      }
      throw new Error('Transfer aborted by sender');
    }

    // 2. Send per-file HEADER
    const headerMsg: DataChannelMessage = {
      type: 'HEADER',
      metadata: fileMeta,
      fileIndex: fileIdx,
      totalFiles: files.length,
    };
    dataChannel.send(JSON.stringify(headerMsg));

    await new Promise((resolve) => setTimeout(resolve, 30));

    let offset = 0;

    while (offset < file.size) {
      if (signal?.aborted) {
        try {
          const cancelMsg: DataChannelMessage = {
            type: 'TRANSFER_CANCEL',
            reason: 'Sender cancelled the transfer',
          };
          dataChannel.send(JSON.stringify(cancelMsg));
        } catch {
          // ignore
        }
        throw new Error('Transfer aborted by sender');
      }

      // Backpressure check
      if (dataChannel.bufferedAmount >= BUFFERED_AMOUNT_HIGH_THRESHOLD) {
        await new Promise<void>((resolve, reject) => {
          const onLow = () => {
            dataChannel.removeEventListener('bufferedamountlow', onLow);
            resolve();
          };
          const onError = (e: any) => {
            dataChannel.removeEventListener('bufferedamountlow', onLow);
            reject(e);
          };
          dataChannel.addEventListener('bufferedamountlow', onLow);
          dataChannel.addEventListener('error', onError, { once: true });

          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                dataChannel.removeEventListener('bufferedamountlow', onLow);
                reject(new Error('Transfer aborted'));
              },
              { once: true }
            );
          }
        });
      }

      const chunkBlob = file.slice(offset, offset + CHUNK_SIZE);
      const chunkBuffer = await chunkBlob.arrayBuffer();

      dataChannel.send(chunkBuffer);

      offset += chunkBuffer.byteLength;
      overallChunkIndex++;

      const currentTotalTransferred = previousFilesBytes + offset;
      const now = performance.now();
      const elapsedSinceLastSpeed = (now - lastSpeedCalcTime) / 1000;

      if (elapsedSinceLastSpeed >= 0.25 || currentTotalTransferred >= totalBatchBytes) {
        const bytesInWindow = currentTotalTransferred - lastSpeedCalcBytes;
        const instantaneousSpeed = bytesInWindow / Math.max(elapsedSinceLastSpeed, 0.01);
        currentSpeed =
          currentSpeed === 0 ? instantaneousSpeed : currentSpeed * 0.7 + instantaneousSpeed * 0.3;
        lastSpeedCalcTime = now;
        lastSpeedCalcBytes = currentTotalTransferred;
      }

      const remainingBytes = Math.max(0, totalBatchBytes - currentTotalTransferred);
      const timeRemaining = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
      const percentage =
        totalBatchBytes === 0
          ? 100
          : Math.min(100, Math.round((currentTotalTransferred / totalBatchBytes) * 100));

      if (now - lastProgressTime >= 35 || currentTotalTransferred >= totalBatchBytes) {
        lastProgressTime = now;
        onProgress({
          bytesTransferred: currentTotalTransferred,
          totalBytes: totalBatchBytes,
          percentage,
          speed: currentSpeed,
          timeRemaining,
          currentChunk: overallChunkIndex,
          totalChunks: totalChunksAcrossAll,
          startTime,
          currentFileIndex: fileIdx + 1,
          totalFiles: files.length,
          currentFileName: file.name,
        });
      }
    }

    // 3. Notify this file is complete
    const fileCompleteMsg: DataChannelMessage = {
      type: 'FILE_COMPLETE',
      fileId: fileMeta.id,
      fileIndex: fileIdx,
    };
    dataChannel.send(JSON.stringify(fileCompleteMsg));

    previousFilesBytes += file.size;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  // 4. Final complete message for the entire batch
  const completeMessage: DataChannelMessage = {
    type: 'TRANSFER_COMPLETE',
    totalFiles: files.length,
    totalBytes: totalBatchBytes,
  };
  dataChannel.send(JSON.stringify(completeMessage));
}

/**
 * Backward-compatible single file wrapper
 */
export async function sendFileThroughDataChannel(options: SendOptions): Promise<void> {
  return sendMultipleFilesThroughDataChannel({
    files: [options.file],
    dataChannel: options.dataChannel,
    onProgress: options.onProgress,
    signal: options.signal,
  });
}
