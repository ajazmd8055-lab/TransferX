import React, { useState, useEffect } from 'react';
import {
  Download,
  KeyRound,
  RefreshCw,
  FileCheck,
  AlertCircle,
  QrCode,
  Archive,
  Check,
  FileText,
} from 'lucide-react';
import JSZip from 'jszip';
import { useReceiver } from '../hooks/useReceiver';
import { formatBytes, getFileCategory } from '../utils/formatters';
import { FileIcon } from './FileIcon';
import { TransferProgress } from './TransferProgress';
import { QrScannerModal } from './QrScannerModal';
import { OtpInput } from './OtpInput';

interface ReceiverViewProps {
  initialCode?: string;
}

export const ReceiverView: React.FC<ReceiverViewProps> = ({ initialCode = '' }) => {
  const {
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
  } = useReceiver();

  const [inputCode, setInputCode] = useState<string>(initialCode);
  const [validatedMeta, setValidatedMeta] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(null);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [downloadedSet, setDownloadedSet] = useState<Set<number>>(new Set());
  const [zipDownloaded, setZipDownloaded] = useState<boolean>(false);

  // If initialCode changes or is provided via URL parameter
  useEffect(() => {
    if (initialCode && initialCode.length === 6) {
      setInputCode(initialCode);
      joinTransfer(initialCode);
    }
  }, [initialCode, joinTransfer]);

  // Validate code dynamically when 6 digits are typed
  useEffect(() => {
    const clean = inputCode.replace(/\D/g, '');
    if (clean.length === 6 && status === 'idle') {
      validateCode(clean).then((res) => {
        if (res.valid && res.fileMeta) {
          setValidatedMeta(res.fileMeta);
          setValidationError(null);
        } else {
          setValidatedMeta(null);
          setValidationError(res.error || 'Transfer room not found or code expired.');
        }
      });
    } else {
      setValidatedMeta(null);
      setValidationError(null);
    }
  }, [inputCode, status, validateCode]);

  // Load preview snippet if single file is text/code
  useEffect(() => {
    if (receivedBlob && fileMeta) {
      const category = getFileCategory(fileMeta.type, fileMeta.name);
      if (category === 'document' || category === 'code') {
        if (fileMeta.size < 2 * 1024 * 1024) {
          receivedBlob
            .text()
            .then((txt) => {
              setTextPreviewContent(txt.slice(0, 2000));
            })
            .catch(() => {});
        }
      }
    }
  }, [receivedBlob, fileMeta]);

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.replace(/\D/g, '');
    if (clean.length === 6) {
      joinTransfer(clean);
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    setInputCode(scannedCode);
    joinTransfer(scannedCode);
  };

  const handleSingleDownload = (url: string, filename: string, index?: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (index !== undefined) {
      setDownloadedSet((prev) => new Set(prev).add(index));
    }
  };

  const handleDownloadAllZip = async () => {
    if (receivedFiles.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const item of receivedFiles) {
        zip.file(item.metadata.name, item.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peerdrop-${code || 'transfer'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setZipDownloaded(true);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      console.error('Failed to create ZIP package:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const fileCategory = fileMeta ? getFileCategory(fileMeta.type, fileMeta.name) : 'other';
  const isMultipleFiles = receivedFiles.length > 1 || (fileMeta?.fileCount && fileMeta.fileCount > 1);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* Code Input Form (Idle State) */}
      {status === 'idle' && (
        <div
          id="receiver-input-card"
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6 transition-colors"
        >
          {/* Header in App Indigo Theme */}
          <div className="text-center space-y-1.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100/80 dark:border-indigo-900/60 shadow-2xs">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Enter 6-Digit Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type the transfer key or scan sender's QR code
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Clean Indigo Styled OTP Input */}
            <div className="py-2">
              <OtpInput
                value={inputCode}
                onChange={setInputCode}
                onComplete={(completedCode) => {
                  // Optional auto-trigger or validation
                }}
                disabled={!isConnected}
              />
            </div>

            {/* Validation Feedback & Incoming File Preview */}
            {isValidating && (
              <p className="text-xs text-center text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">
                Locating transfer session...
              </p>
            )}

            {validationError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Preview of incoming transfer (Single or Multiple files) */}
            {validatedMeta && !validationError && (
              <div
                id="incoming-file-preview"
                className="p-4 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/70 dark:border-indigo-800/70 transition-all animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 border border-indigo-200/80 dark:border-indigo-800 shadow-2xs">
                    <FileIcon
                      mimeType={validatedMeta.type || 'application/octet-stream'}
                      filename={validatedMeta.name}
                      size={22}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-100 truncate">
                        {validatedMeta.name}
                      </h4>
                      {validatedMeta.fileCount && validatedMeta.fileCount > 1 && (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          {validatedMeta.fileCount} files
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5 font-medium">
                      {formatBytes(validatedMeta.size)} • Ready for direct P2P transfer
                    </p>
                  </div>
                </div>

                {/* If multiple files are listed in metadata */}
                {validatedMeta.files && validatedMeta.files.length > 1 && (
                  <div className="mt-3 pt-2.5 border-t border-indigo-200/50 dark:border-indigo-800/50 max-h-32 overflow-y-auto space-y-1 pr-1">
                    {validatedMeta.files.map((f: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 py-0.5"
                      >
                        <span className="truncate pr-2">• {f.name}</span>
                        <span className="shrink-0 text-slate-400">{formatBytes(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                id="connect-transfer-btn"
                type="submit"
                disabled={inputCode.length !== 6 || !isConnected}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Connect & Receive
              </button>

              <button
                id="scan-qr-btn"
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-all cursor-pointer"
                title="Scan QR code with camera"
              >
                <QrCode className="w-4 h-4" />
                Scan QR
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Progress & Live Transfer View */}
      {(status === 'connecting' ||
        status === 'connected' ||
        status === 'transferring' ||
        status === 'failed' ||
        status === 'cancelled') && (
        <div className="space-y-4">
          <TransferProgress
            fileName={
              fileMeta?.name ||
              (batchMeta ? `${batchMeta.totalFiles} files` : 'Incoming files')
            }
            fileSize={fileMeta?.size || batchMeta?.totalBytes || 0}
            fileType={fileMeta?.type || 'batch'}
            status={status}
            progress={progress}
            direction="receive"
            onCancel={cancelTransfer}
            errorMessage={errorMessage}
          />

          {/* Retry Button */}
          {(status === 'failed' || status === 'cancelled') && (
            <div className="flex justify-center pt-2">
              <button
                id="receiver-retry-btn"
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try Another Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Transfer Completed View */}
      {status === 'completed' && (
        <div
          id="receiver-completed-card"
          className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 p-6 sm:p-8 shadow-sm space-y-6 transition-colors"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <FileCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Transfer Completed!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {receivedFiles.length > 1
                ? `All ${receivedFiles.length} files were successfully received via direct P2P. Save them individually or download as a single ZIP.`
                : 'Your file was assembled directly in memory from WebRTC chunks. Click below to save.'}
            </p>
          </div>

          {/* Multi-File Actions: Download All as ZIP */}
          {receivedFiles.length > 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-100">
                      All {receivedFiles.length} Files Ready
                    </h4>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      {formatBytes(receivedFiles.reduce((acc, f) => acc + f.metadata.size, 0))} total
                    </p>
                  </div>
                </div>

                <button
                  id="download-all-zip-btn"
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isZipping ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : zipDownloaded ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {isZipping ? 'Packaging ZIP...' : zipDownloaded ? 'ZIP Saved' : 'Download All (.zip)'}
                </button>
              </div>

              {/* Individual Files List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Received Files ({receivedFiles.length})
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {receivedFiles.map((item, idx) => {
                    const isDownloaded = downloadedSet.has(idx);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                            <FileIcon
                              mimeType={item.metadata.type}
                              filename={item.metadata.name}
                              size={18}
                            />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate"
                              title={item.metadata.name}
                            >
                              {item.metadata.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatBytes(item.metadata.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSingleDownload(item.downloadUrl, item.metadata.name, idx)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          {isDownloaded ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-indigo-500" />
                          )}
                          {isDownloaded ? 'Saved' : 'Save'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Single File Presentation */}
          {receivedFiles.length <= 1 && fileMeta && downloadUrl && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <FileIcon mimeType={fileMeta.type} filename={fileMeta.name} size={26} />
                  </div>
                  <div className="min-w-0">
                    <h4
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
                      title={fileMeta.name}
                    >
                      {fileMeta.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatBytes(fileMeta.size)} • {fileMeta.type || 'File'}
                    </p>
                  </div>
                </div>
              </div>

              {/* In-Browser Previews for Images / Media */}
              {fileCategory === 'image' && (
                <div className="p-3 bg-slate-900 dark:bg-slate-950 rounded-2xl flex items-center justify-center overflow-hidden max-h-72 border border-slate-800">
                  <img
                    src={downloadUrl}
                    alt={fileMeta.name}
                    referrerPolicy="no-referrer"
                    className="max-h-64 object-contain rounded-lg"
                  />
                </div>
              )}

              {fileCategory === 'audio' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <audio controls src={downloadUrl} className="w-full" />
                </div>
              )}

              {fileCategory === 'video' && (
                <div className="bg-black rounded-2xl overflow-hidden max-h-72 flex items-center justify-center">
                  <video controls src={downloadUrl} className="max-h-64 w-full object-contain" />
                </div>
              )}

              {textPreviewContent && (
                <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 rounded-2xl p-4 font-mono text-xs max-h-48 overflow-auto border border-slate-800 whitespace-pre-wrap">
                  {textPreviewContent}
                  {textPreviewContent.length >= 2000 && (
                    <span className="text-slate-500">... (truncated preview)</span>
                  )}
                </div>
              )}

              <button
                id="download-file-btn"
                type="button"
                onClick={() => handleSingleDownload(downloadUrl, fileMeta.name)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Save {fileMeta.name}
              </button>
            </div>
          )}

          {/* Reset Action */}
          <div className="pt-2">
            <button
              id="receive-another-btn"
              type="button"
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Receive Another Transfer
            </button>
          </div>
        </div>
      )}

      {/* QR Code Scanner Modal */}
      <QrScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
