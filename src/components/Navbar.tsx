import React from 'react';
import { Send, Download, Settings, History, Zap, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  activeTab: 'send' | 'receive';
  setActiveTab: (tab: 'send' | 'receive') => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenHistory,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3 transition-colors duration-150">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight">TransferX</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          <button
            id="nav-send-tab"
            type="button"
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'send'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
          <button
            id="nav-receive-tab"
            type="button"
            onClick={() => setActiveTab('receive')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'receive'
                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Receive</span>
          </button>
        </div>

        {/* Utility Controls */}
        <div className="flex items-center gap-1">
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="history-btn"
            type="button"
            onClick={onOpenHistory}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Transfer History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            id="settings-btn"
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

