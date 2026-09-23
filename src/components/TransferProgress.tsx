import React from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
  HardDrive,
  Layers,
  StopCircle,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { TransferProgress as TransferProgressType, TransferStatus } from '../types';
import { formatBytes, formatSpeed, formatTimeRemaining } from '../utils/formatters';
import { FileIcon } from './FileIcon';

interface TransferProgressProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  status: TransferStatus;
  progress: TransferProgressType | null;
  direction: 'send' | 'receive';
  onCancel?: () => void;
  errorMessage?: string | null;
}

export const TransferProgress: React.FC<TransferProgressProps> = ({
  fileName,
  fileSize,
  fileType,
  status,
  progress,
  direction,
  onCancel,
  errorMessage,
}) => {
  const isSend = direction === 'send';
  const percentage = progress?.percentage ?? (status === 'completed' ? 100 : 0);
  const bytesTransferred = progress?.bytesTransferred ?? (status === 'completed' ? fileSize : 0);
  const speed = progress?.speed ?? 0;
  const timeRemaining = progress?.timeRemaining ?? 0;
  const currentChunk = progress?.currentChunk ?? (status === 'completed' ? Math.ceil(fileSize / (64 * 1024)) : 0);
  const totalChunks = progress?.totalChunks ?? Math.max(1, Math.ceil(fileSize / (64 * 1024)));

  const isTransferring = status === 'transferring';
  const isConnecting = status === 'connecting';
  const isWaiting = status === 'waiting';
  const isConnected = status === 'connected';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';

  // Status badge with icon & color
  const getStatusBadge = () => {
    if (isWaiting) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          Waiting for peer...
        </span>
      );
    }
    if (isConnecting) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          WebRTC Handshake...
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
          <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          DataChannel Ready
        </span>
      );
    }
    if (isTransferring) {
      return isSend ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-400" />
          </span>
          Uploading Stream...
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600 dark:bg-teal-400" />
          </span>
          Downloading Stream...
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Transfer Complete
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
          Transfer Cancelled
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80">
          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          Transfer Failed
        </span>
      );
    }
    return null;
  };

  // Progress bar fill color gradient based on state & direction
  const getProgressBarGradient = () => {
    if (isCompleted) return 'bg-emerald-500';
    if (isFailed || isCancelled) return 'bg-rose-500';
    if (isSend) {
      return 'bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400';
    }
    return 'bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-400';
  };

  return (
    <div
      id="transfer-progress-card"
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm transition-colors"
    >
      {/* Direction & Status Header */}
      <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isSend
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
                : 'bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400'
            }`}
          >
            {isSend ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isSend ? 'Upload Session' : 'Download Session'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Direct WebRTC DataChannel
            </p>
          </div>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* File Info */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-13 h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <FileIcon mimeType={progress?.currentFileName ? 'application/octet-stream' : fileType} filename={progress?.currentFileName || fileName} size={28} />
          </div>
          <div className="min-w-0">
            <h4
              id="transfer-file-name"
              className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              title={progress?.currentFileName || fileName}
            >
              {progress?.currentFileName || fileName}
            </h4>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
              {progress?.totalFiles && progress.totalFiles > 1 && (
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                  File {progress.currentFileIndex ?? 1} of {progress.totalFiles}
                </span>
              )}
              <span>{formatBytes(fileSize)} total</span>
              <span>•</span>
              <span className="capitalize">{fileType.split('/')[1] || 'Batch'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visual Progress Bar Section */}
      <div className="space-y-3 mb-6">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span
              id="transfer-percentage"
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight tabular-nums"
            >
              {percentage}%
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {isCompleted
                ? 'Completed'
                : isTransferring
                ? isSend
                  ? 'Uploaded'
                  : 'Downloaded'
                : 'Progress'}
            </span>
          </div>
          <div className="text-right">
            <span
              id="transfer-bytes-ratio"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums"
            >
              {formatBytes(bytesTransferred)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
              of {formatBytes(fileSize)}
            </span>
          </div>
        </div>

        {/* The Track & Animated Fill */}
        <div
          id="transfer-progress-track"
          className="relative w-full h-4 sm:h-5 bg-slate-100 dark:bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-inner"
        >
          <motion.div
            id="transfer-progress-bar-fill"
            className={`h-full rounded-full relative ${getProgressBarGradient()} ${
              isTransferring ? 'animate-progress-stripes' : ''
            }`}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(isTransferring ? 2 : 0, Math.min(100, percentage))}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          >
            {/* Shimmer / Glow Bead at leading edge */}
            {isTransferring && percentage > 2 && percentage < 99 && (
              <span className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/70 rounded-full blur-[1px] shadow-sm animate-pulse" />
            )}
          </motion.div>
        </div>

        {/* Real-Time Chunks Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Chunk {currentChunk} of {totalChunks}
            </span>
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            64 KB / WebRTC chunk
          </span>
        </div>
      </div>

      {/* Real-time Transfer Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
        {/* Metric 1: Speed */}
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Zap className={`w-3.5 h-3.5 ${isSend ? 'text-indigo-500' : 'text-teal-500'}`} />
            <span>Speed</span>
          </div>
          <p
            id="transfer-speed"
            className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums"
          >
            {isTransferring ? formatSpeed(speed) : isCompleted ? 'Finished' : '—'}
          </p>
        </div>

        {/* Metric 2: Time Remaining */}
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Time Left</span>
          </div>
          <p
            id="transfer-eta"
            className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate"
          >
            {isTransferring
              ? formatTimeRemaining(timeRemaining)
              : isCompleted
              ? 'Complete'
              : isWaiting || isConnecting
              ? 'Standby'
              : '—'}
          </p>
        </div>

        {/* Metric 3: Data Processed */}
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isSend ? 'Uploaded' : 'Downloaded'}</span>
          </div>
          <p
            id="transfer-amount"
            className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums"
          >
            {formatBytes(bytesTransferred)}
          </p>
        </div>

        {/* Metric 4: Protocol / Encryption */}
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
            <span>Channel</span>
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            WebRTC (E2EE)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          id="transfer-error-banner"
          className="mt-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5"
        >
          <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Cancel Button (active while transferring / connecting / waiting) */}
      {(isTransferring || isConnecting || isWaiting) && onCancel && (
        <div className="mt-5 flex justify-end">
          <button
            id="cancel-transfer-btn"
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <StopCircle className="w-4 h-4" />
            Cancel Transfer
          </button>
        </div>
      )}
    </div>
  );
};
