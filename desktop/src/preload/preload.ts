import { contextBridge, ipcRenderer } from 'electron';

export interface FilePickerResult {
  name: string;
  type: string;
  size: number;
  base64: string;
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }): Promise<FilePickerResult | null> => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },
  openDirectoryDialog: (title?: string): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:openDirectory', title);
  },
  verifyDirectoryExists: (dirPath: string): Promise<{ exists: boolean; isGit: boolean }> => {
    return ipcRenderer.invoke('fs:verifyDirectory', dirPath);
  },
  openExternal: (url: string): Promise<boolean> => {

    return ipcRenderer.invoke('shell:openExternal', url);
  },
  startSoloBackend: () => {
    return ipcRenderer.invoke('solo:start');
  },
  stopSoloBackend: () => {
    return ipcRenderer.invoke('solo:stop');
  },
  getSoloStatus: () => {
    return ipcRenderer.invoke('solo:status');
  },
  // Codex ACP Dev Pipeline methods
  codexInit: (config?: any) => {
    return ipcRenderer.invoke('codex:init', config);
  },

  codexGetStatus: () => {
    return ipcRenderer.invoke('codex:status');
  },
  codexListModels: () => {
    return ipcRenderer.invoke('codex:listModels');
  },
  codexSetConfigOption: (sessionId: string, configId: string, value: string) => {
    return ipcRenderer.invoke('codex:setConfigOption', sessionId, configId, value);
  },

  codexRunDiagnosis: (cardContext: any) => {
    return ipcRenderer.invoke('codex:runDiagnosis', cardContext);
  },
  codexRunExecution: (params: any) => {
    return ipcRenderer.invoke('codex:runExecution', params);
  },
  codexCancelSession: (cardId: string) => {
    return ipcRenderer.invoke('codex:cancel', cardId);
  },
  onCodexUpdate: (callback: (update: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('codex:sessionUpdate', handler);
    return () => {
      ipcRenderer.removeListener('codex:sessionUpdate', handler);
    };
  },
  gitCreateBranch: (repoPath: string, branchName: string) => {
    return ipcRenderer.invoke('codex:gitCreateBranch', repoPath, branchName);
  },
  gitGetDiff: (repoPath: string, baseBranch?: string) => {
    return ipcRenderer.invoke('codex:gitGetDiff', repoPath, baseBranch);
  },
  runQualityGates: (repoPath: string) => {
    return ipcRenderer.invoke('codex:runQualityGates', repoPath);
  },
  readLearningsFile: (repoPath?: string) => {
    return ipcRenderer.invoke('codex:readLearnings', repoPath);
  },
  writeLearningsFile: (content: string, repoPath?: string) => {
    return ipcRenderer.invoke('codex:writeLearnings', content, repoPath);
  },
  // Voice Dictation & Speech-To-Text methods (OpenWhispr base)
  voiceGetStatus: () => {
    return ipcRenderer.invoke('voice:getStatus');
  },
  voiceSetRecording: (isRecording: boolean) => {
    return ipcRenderer.invoke('voice:setRecording', isRecording);
  },
  voiceSetHotkey: (hotkey: string) => {
    return ipcRenderer.invoke('voice:setHotkey', hotkey);
  },
  voiceTranscribeAudio: (audioBase64: string, options?: any) => {
    return ipcRenderer.invoke('voice:transcribeAudio', audioBase64, options);
  },
  voiceCheckWhisperInstalled: () => {
    return ipcRenderer.invoke('voice:checkWhisperInstalled');
  },
  voiceCheckPermissions: () => {
    return ipcRenderer.invoke('voice:checkPermissions');
  },
  voiceRequestMicPermission: () => {
    return ipcRenderer.invoke('voice:requestMicPermission');
  },
  voiceInjectText: (text: string) => {
    return ipcRenderer.invoke('voice:injectText', text);
  },
  onVoiceStatusChange: (callback: (status: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('voice:statusChange', handler);
    return () => {
      ipcRenderer.removeListener('voice:statusChange', handler);
    };
  },
  onVoiceHotkeyTriggered: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('voice:hotkeyTriggered', handler);
    return () => {
      ipcRenderer.removeListener('voice:hotkeyTriggered', handler);
    };
  },
  // Kokoro-82M Text-To-Speech (TTS)
  ttsGetStatus: () => {
    return ipcRenderer.invoke('tts:getStatus');
  },
  ttsSetVoice: (voiceId: string) => {
    return ipcRenderer.invoke('tts:setVoice', voiceId);
  },
  ttsSynthesize: (text: string, options?: any) => {
    return ipcRenderer.invoke('tts:synthesize', text, options);
  },
  // Upstream Git & Model Checkpoint Sync
  upstreamCheckStatus: (repoKey: 'openwhispr' | 'kokoro') => {
    return ipcRenderer.invoke('upstream:checkStatus', repoKey);
  },
  upstreamCheckModelCheckpoints: () => {
    return ipcRenderer.invoke('upstream:checkModelCheckpoints');
  },
  setConfirmBeforeQuit: (enabled: boolean) => {
    return ipcRenderer.invoke('app:setConfirmBeforeQuit', enabled);
  },
  setAppIcon: (iconTheme: string) => {
    return ipcRenderer.invoke('app:setAppIcon', iconTheme);
  },
  quitApp: () => {
    return ipcRenderer.invoke('app:quitConfirmed');
  },
  onRequestClosePrompt: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('app:requestClosePrompt', handler);
    return () => {
      ipcRenderer.removeListener('app:requestClosePrompt', handler);
    };
  },
});

