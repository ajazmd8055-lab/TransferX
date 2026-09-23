import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  UploadCloud,
  Copy,
  Check,
  QrCode,
  Link as LinkIcon,
  RefreshCw,
  Clock,
  Send,
  Plus,
  Trash2,
  Files,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useSender } from '../hooks/useSender';
import { formatBytes } from '../utils/formatters';
import { FileIcon } from './FileIcon';
import { TransferProgress } from './TransferProgress';

export const SenderView: React.FC = () => {
  const {
    files,
    code,
    expiresAt,
    status,
    errorMessage,
    progress,
    isConnected,
    startSending,
    cancelTransfer,
    reset: hookReset,
  } = useSender();

  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState<boolean>(false);
  const [isWindowDragging, setIsWindowDragging] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showFilesListInWaiting, setShowFilesListInWaiting] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>('15:00');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const windowDragCounter = useRef<number>(0);

  const addFilesToStaging = (newFiles: FileList | File[]) => {
    const list = Array.from(newFiles);
    if (list.length === 0) return;
    setStagedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const nonDuplicates = list.filter(
        (f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`)
      );
      return [...prev, ...nonDuplicates];
    });
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearStagedFiles = () => {
    setStagedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetAll = () => {
    hookReset();
    setStagedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Window-wide drag and drop listener
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        windowDragCounter.current += 1;
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      windowDragCounter.current -= 1;
      if (windowDragCounter.current <= 0) {
        windowDragCounter.current = 0;
        setIsWindowDragging(false);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      windowDragCounter.current = 0;
      setIsWindowDragging(false);
      setIsDraggingOverZone(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        if (status === 'idle') {
          addFilesToStaging(e.dataTransfer.files);
        }
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [status]);

  // Timer countdown for room expiry
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverZone(true);
  };

  const handleZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverZone(false);
  };

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverZone(false);
    setIsWindowDragging(false);
    windowDragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToStaging(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToStaging(e.target.files);
    }
  };

  const copyCodeToClipboard = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyShareableLink = () => {
    if (!code) return;
    const url = `${window.location.origin}?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalStagedSize = stagedFiles.reduce((acc, f) => acc + f.size, 0);
  const activeFiles = files.length > 0 ? files : stagedFiles;
  const activeTotalSize = activeFiles.reduce((acc, f) => acc + f.size, 0);
  const directLink = code ? `${window.location.origin}?code=${code}` : '';

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 relative">
      {/* Hidden File Input supporting multiple files (No limit) */}
      <input
        id="sender-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Full-Window Drag Overlay when dragging files anywhere */}
      {isWindowDragging && (
        <div
          id="window-drag-overlay"
          className="fixed inset-0 z-50 bg-indigo-950/60 backdrop-blur-xs flex items-center justify-center p-6 transition-all duration-200 pointer-events-none"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center shadow-2xl border-2 border-dashed border-indigo-500 max-w-md w-full animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-200 dark:border-indigo-800 shadow-sm animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              Drop any files here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No file count or size limits • Direct P2P transfer
            </p>
          </div>
        </div>
      )}

      {/* File Dropzone & Staging Area (Idle State) */}
      {status === 'idle' && (
        <div className="space-y-4">
          {/* Dropzone Container */}
          <div
            id="sender-dropzone"
            onDragOver={handleZoneDragOver}
            onDragLeave={handleZoneDragLeave}
            onDrop={handleZoneDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl ${
              stagedFiles.length > 0 ? 'p-6 sm:p-7' : 'p-10 sm:p-12'
            } text-center cursor-pointer transition-all duration-150 relative ${
              isDraggingOverZone
                ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 scale-[1.01] shadow-md ring-4 ring-indigo-500/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-2xs transition-transform ${
                isDraggingOverZone
                  ? 'bg-indigo-600 text-white border-indigo-600 scale-110'
                  : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-100/80 dark:border-indigo-900/60'
              }`}
            >
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {isDraggingOverZone
                ? 'Drop to add files'
                : stagedFiles.length > 0
                ? 'Add more files'
                : 'Choose files to send'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Select or drop any number of files • No limits
            </p>

            <button
              id="select-file-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {stagedFiles.length > 0 ? 'Browse More Files' : 'Select Files'}
            </button>
          </div>

          {/* Staged Files Review Panel */}
          {stagedFiles.length > 0 && (
            <div
              id="staged-files-panel"
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
            >
              {/* Header Summary */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {stagedFiles.length} {stagedFiles.length === 1 ? 'File' : 'Files'} Selected
                  </h4>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatBytes(totalStagedSize)} total
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add More
                  </button>
                  <button
                    type="button"
                    onClick={clearStagedFiles}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              </div>

              {/* Scrollable File List */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {stagedFiles.map((f, index) => (
                  <div
                    key={`${f.name}-${index}`}
                    className="group flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <FileIcon mimeType={f.type} filename={f.name} size={18} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate"
                          title={f.name}
                        >
                          {f.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatBytes(f.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeStagedFile(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Primary Action Button */}
              <button
                id="start-send-staged-btn"
                type="button"
                onClick={() => startSending(stagedFiles)}
                disabled={!isConnected}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Generate Code & Send ({stagedFiles.length}{' '}
                {stagedFiles.length === 1 ? 'file' : 'files'})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Code Display & Waiting State */}
      {status === 'waiting' && code && (
        <div
          id="sender-waiting-card"
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-5 transition-colors"
        >
          {/* File summary pill */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                  {activeFiles.length > 1 ? (
                    <Files className="w-5 h-5" />
                  ) : (
                    <FileIcon
                      mimeType={activeFiles[0]?.type || ''}
                      filename={activeFiles[0]?.name || ''}
                      size={20}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {activeFiles.length === 1
                      ? activeFiles[0].name
                      : `${activeFiles.length} Files Ready to Send`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatBytes(activeTotalSize)} total
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {activeFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowFilesListInWaiting(!showFilesListInWaiting)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                  >
                    {showFilesListInWaiting ? 'Hide' : 'View'} ({activeFiles.length})
                  </button>
                )}
                <button
                  id="change-file-btn"
                  type="button"
                  onClick={resetAll}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Expandable list in waiting state */}
            {showFilesListInWaiting && activeFiles.length > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {activeFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300"
                  >
                    <span className="truncate pr-2">• {f.name}</span>
                    <span className="text-slate-400 shrink-0">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clean Indigo OTP 6-Digit Code Display */}
          <div className="text-center py-2 space-y-2.5">
            <div
              id="sender-otp-code-display"
              onClick={copyCodeToClipboard}
              className="inline-flex items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group shadow-2xs"
              title="Click to copy code"
            >
              {/* First 3 Digits */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {code.slice(0, 3).split('').map((digit, idx) => (
                  <span
                    key={idx}
                    className="w-10 h-13 sm:w-12 sm:h-15 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-400/50 dark:border-indigo-600/50 text-indigo-900 dark:text-indigo-100 font-mono font-black text-2xl sm:text-3xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform"
                  >
                    {digit}
                  </span>
                ))}
              </div>

              {/* Clean Theme Dot Separator */}
              <div className="px-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 block" />
              </div>

              {/* Second 3 Digits */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {code.slice(3, 6).split('').map((digit, idx) => (
                  <span
                    key={idx + 3}
                    className="w-10 h-13 sm:w-12 sm:h-15 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-400/50 dark:border-indigo-600/50 text-indigo-900 dark:text-indigo-100 font-mono font-black text-2xl sm:text-3xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform"
                  >
                    {digit}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Expires in {timeLeft}
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={copyCodeToClipboard}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                {copiedCode ? 'Copied to clipboard!' : 'Click code to copy'}
              </button>
            </div>
          </div>

          {/* Action Buttons: Copy Code, Share Link, QR Code */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="copy-code-btn"
              type="button"
              onClick={copyCodeToClipboard}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedCode ? 'Copied' : 'Copy Code'}
            </button>

            <button
              id="copy-link-btn"
              type="button"
              onClick={copyShareableLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <LinkIcon className="w-3.5 h-3.5" />
              )}
              {copiedLink ? 'Link Copied' : 'Share Link'}
            </button>

            <button
              id="show-qr-btn"
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              Show QR
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              id="cancel-waiting-btn"
              type="button"
              onClick={resetAll}
              className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            >
              Cancel Transfer Room
            </button>
          </div>
        </div>
      )}

      {/* Progress & Live Transfer View */}
      {(status === 'connecting' ||
        status === 'connected' ||
        status === 'transferring' ||
        status === 'completed' ||
        status === 'failed' ||
        status === 'cancelled') && (
        <div className="space-y-4">
          <TransferProgress
            fileName={
              activeFiles.length === 1
                ? activeFiles[0].name
                : `${activeFiles.length} files (${activeFiles.map((f) => f.name).slice(0, 2).join(', ')}${activeFiles.length > 2 ? '...' : ''})`
            }
            fileSize={activeTotalSize}
            fileType={activeFiles.length === 1 ? activeFiles[0].type : 'batch'}
            status={status}
            progress={progress}
            direction="send"
            onCancel={cancelTransfer}
            errorMessage={errorMessage}
          />

          {/* Success summary & Send more */}
          {status === 'completed' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 text-center space-y-3">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {activeFiles.length > 1
                  ? `All ${activeFiles.length} files (${formatBytes(activeTotalSize)}) were transferred successfully!`
                  : `"${activeFiles[0]?.name}" was sent successfully!`}
              </p>
              <button
                id="send-another-file-btn"
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Send More Files
              </button>
            </div>
          )}

          {/* Retry on fail/cancel */}
          {(status === 'failed' || status === 'cancelled') && (
            <div className="flex justify-center pt-2">
              <button
                id="sender-retry-btn"
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try Sending Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && code && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Scan to Receive
              </h3>
              <button
                id="close-qr-modal-btn"
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-inner">
              <QRCodeSVG
                value={directLink}
                size={200}
                level="M"
                includeMargin
                className="rounded-lg shadow-2xs"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest mb-1">
                {code}
              </p>
              <p>Scan with receiver's QR scanner to connect and download instantly.</p>
            </div>

            <button
              id="done-qr-btn"
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
