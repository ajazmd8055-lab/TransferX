export type TransferStatus =
  | 'idle'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  totalChunks?: number;
  chunkSize?: number;
}

export interface BatchMetadata {
  batchId: string;
  totalFiles: number;
  totalBytes: number;
  files: FileMetadata[];
}

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
  currentChunk: number;
  totalChunks: number;
  startTime: number;
  currentFileIndex?: number;
  totalFiles?: number;
  currentFileName?: string;
}

export interface ReceivedFile {
  metadata: FileMetadata;
  blob: Blob;
  downloadUrl: string;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface TransferHistoryItem {
  id: string;
  code: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: 'send' | 'receive';
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: number;
  duration?: number;
  downloadUrl?: string;
  fileCount?: number;
}

// WebRTC DataChannel message protocols
export type DataChannelMessage =
  | {
      type: 'BATCH_HEADER';
      batch: BatchMetadata;
    }
  | {
      type: 'HEADER';
      metadata: FileMetadata;
      fileIndex?: number;
      totalFiles?: number;
    }
  | {
      type: 'HEADER_ACK';
    }
  | {
      type: 'FILE_COMPLETE';
      fileId: string;
      fileIndex?: number;
    }
  | {
      type: 'TRANSFER_COMPLETE';
      totalFiles?: number;
      totalBytes?: number;
      fileId?: string;
      totalChunks?: number;
    }
  | {
      type: 'TRANSFER_CANCEL';
      reason: string;
    };
