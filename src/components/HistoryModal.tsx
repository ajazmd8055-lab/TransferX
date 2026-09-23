import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileBox,
} from 'lucide-react';
import { TransferHistoryItem } from '../types';
import { formatBytes } from '../utils/formatters';
import { FileIcon } from './FileIcon';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem('peerdrop_history');
        if (raw) {
          setHistory(JSON.parse(raw));
        }
      } catch (e) {
        console.warn('Failed to load history', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    localStorage.removeItem('peerdrop_history');
    setHistory([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/60">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Transfer History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recent direct peer-to-peer transmissions</p>
            </div>
          </div>
          <button
            id="close-history-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <FileBox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-sm font-medium">No transfer history yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Files you send or receive will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>{history.length} Transfers Recorded</span>
              <button
                id="clear-history-btn"
                type="button"
                onClick={handleClearHistory}
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear History
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {history.map((item) => {
                const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <FileIcon mimeType={item.fileType} filename={item.fileName} size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={item.fileName}>
                          {item.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          <span>{formatBytes(item.fileSize)}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">Code: {item.code}</span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          item.direction === 'send'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80'
                            : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/80'
                        }`}
                      >
                        {item.direction === 'send' ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" /> Sent
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3" /> Received
                          </>
                        )}
                      </span>

                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" title="Completed" />
                      ) : item.status === 'cancelled' ? (
                        <AlertTriangle className="w-4 h-4 text-slate-400" title="Cancelled" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" title="Failed" />
                      )}

                      {item.downloadUrl && (
                        <a
                          href={item.downloadUrl}
                          download={item.fileName}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-400 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors"
                          title="Download again"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            id="done-history-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
