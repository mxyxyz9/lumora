import React, { useEffect } from 'react';
import { useBoardStore } from './store/boardStore';
import { BoardView } from './components/BoardView';

export const App: React.FC = () => {
  const { session, restoreSession, continueAsGuest, settings, showConfirm } = useBoardStore();

  useEffect(() => {
    // Initialize directly into Local Offline Workspace mode (No login screen required)
    restoreSession().then(restored => {
      if (!restored && !useBoardStore.getState().session) {
        continueAsGuest();
      }
    });
  }, [restoreSession, continueAsGuest]);

  useEffect(() => {
    // Synchronize confirmBeforeQuit setting to electron main process
    if (window.electronAPI?.setConfirmBeforeQuit) {
      window.electronAPI.setConfirmBeforeQuit(settings.confirmBeforeQuit !== false);
    }
  }, [settings.confirmBeforeQuit]);

  useEffect(() => {
    if (!window.electronAPI?.onRequestClosePrompt) return;

    const cleanup = window.electronAPI.onRequestClosePrompt(() => {
      showConfirm({
        title: 'Quit Lumora?',
        message: 'Are you sure you want to close and exit Lumora? Any active workspace edits and notes are securely cached in local storage.',
        confirmText: 'Quit Lumora',
        cancelText: 'Stay',
        isDestructive: false,
        onConfirm: () => {
          if (window.electronAPI?.quitApp) {
            window.electronAPI.quitApp();
          }
        },
      });
    });

    return cleanup;
  }, [showConfirm]);

  useEffect(() => {
    // Intercept accidental Cmd+Q / Ctrl+Q in renderer
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'q') {
        if (settings.confirmBeforeQuit !== false) {
          e.preventDefault();
          showConfirm({
            title: 'Quit Lumora?',
            message: 'Are you sure you want to close and exit Lumora? Any active workspace edits and notes are securely cached in local storage.',
            confirmText: 'Quit Lumora',
            cancelText: 'Stay',
            isDestructive: false,
            onConfirm: () => {
              if (window.electronAPI?.quitApp) {
                window.electronAPI.quitApp();
              }
            },
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.confirmBeforeQuit, showConfirm]);

  return <BoardView />;
};

export default App;

