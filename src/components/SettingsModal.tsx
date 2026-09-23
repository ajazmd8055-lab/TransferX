import React, { useState, useEffect } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Laptop,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  isSoundEnabled,
  setSoundEnabled,
  playInitiatedSound,
  playCompletedSound,
  playErrorSound,
} from '../utils/sound';
import { useTheme } from '../hooks/useTheme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [clearedNotice, setClearedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSoundOn(isSoundEnabled());
      setClearedNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setSoundEnabled(nextVal);
    if (nextVal) {
      playInitiatedSound();
    }
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem('peerdrop_history');
    } catch {}
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">App preferences and customization</p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Theme Settings Selector */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Appearance</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select your preferred color theme
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              id="theme-light-btn"
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs ring-2 ring-indigo-500/20 font-semibold'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>

            <button
              id="theme-dark-btn"
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs ring-2 ring-indigo-500/20 font-semibold'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>

            <button
              id="theme-system-btn"
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs ring-2 ring-indigo-500/20 font-semibold'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Sound Notifications Preference */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundOn ? (
                <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Audio Feedback</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Play sound cues on transfer start, completion, and errors
                </p>
              </div>
            </div>
            <button
              id="toggle-sound-btn"
              type="button"
              onClick={handleToggleSound}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                soundOn ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  soundOn ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {soundOn && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400">Preview:</span>
              <button
                type="button"
                onClick={() => playInitiatedSound()}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => playCompletedSound()}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Complete
              </button>
              <button
                type="button"
                onClick={() => playErrorSound()}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Error
              </button>
            </div>
          )}
        </div>

        {/* Storage / History Management */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Transfer History</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Clear saved file transfer records from browser storage
            </p>
          </div>
          <button
            id="clear-history-settings-btn"
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
          >
            {clearedNotice ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Cleared</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </>
            )}
          </button>
        </div>

        {/* Footer / Done */}
        <div className="pt-2 flex justify-end">
          <button
            id="done-settings-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
