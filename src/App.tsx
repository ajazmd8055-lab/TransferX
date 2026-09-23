/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SenderView } from './components/SenderView';
import { ReceiverView } from './components/ReceiverView';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [initialReceiveCode, setInitialReceiveCode] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const { isDark, toggleTheme } = useTheme();

  // Check URL query parameters for direct 6-digit code links (e.g. ?code=123456)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam = urlParams.get('code');
      if (codeParam && codeParam.trim().length === 6) {
        setInitialReceiveCode(codeParam.trim());
        setActiveTab('receive');
      }
    } catch (e) {
      console.warn('Failed to parse URL query params', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-150">
      {/* Clean Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 sm:py-14 flex flex-col justify-center">
        {activeTab === 'send' ? (
          <SenderView />
        ) : (
          <ReceiverView initialCode={initialReceiveCode} />
        )}
      </main>

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

