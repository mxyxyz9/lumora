import { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { soloModeManager } from './soloMode';
import { codexAcpService } from './codexAcpService';
import { lumoraVoiceService } from './lumoraVoiceService';
import { kokoroTtsService } from './kokoroTtsService';
import { upstreamSyncService } from './upstreamSyncService';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const appDisplayName = isDev ? 'Lumora (Dev)' : 'Lumora';

app.name = appDisplayName;
if (process.platform === 'darwin') {
  app.setName(appDisplayName);
}

let mainWindow: BrowserWindow | null = null;
let confirmBeforeQuit = true;
let isQuittingConfirmed = false;

function getAppIcon(theme?: string): string | undefined {
  const iconFilename = theme ? `icon-${theme}.png` : 'icon.png';
  const possiblePaths = [
    path.join(__dirname, `../../build/${iconFilename}`),
    path.join(__dirname, `../build/${iconFilename}`),
    path.join(__dirname, `../../../build/${iconFilename}`),
    path.join(process.cwd(), `build/${iconFilename}`),
    path.join(process.cwd(), `desktop/build/${iconFilename}`),
    path.join(process.cwd(), `public/${iconFilename}`),
    path.join(process.cwd(), `desktop/public/${iconFilename}`),
    // Fallbacks to default icon.png
    path.join(__dirname, '../../build/icon.png'),
    path.join(__dirname, '../build/icon.png'),
    path.join(process.cwd(), 'build/icon.png'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    ...(isMac
      ? [
          {
            label: appDisplayName,
            submenu: [
              { role: 'about', label: `About ${appDisplayName}` },
              { type: 'separator' },
              {
                label: 'Preferences / Settings',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  mainWindow?.webContents.send('menu:openSettings');
                },
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: `Hide ${appDisplayName}` },
              { role: 'hideOthers', label: 'Hide Others' },
              { role: 'unhide', label: 'Show All' },
              { type: 'separator' },
              { role: 'quit', label: `Quit ${appDisplayName}` },
            ],
          },
        ]
      : []),

    {
      label: 'File',
      submenu: [
        {
          label: 'Global Search',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            mainWindow?.webContents.send('menu:openSearch');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'WeKan & Lumora Website',
          click: async () => {
            await shell.openExternal('https://wekan.fi');
          },
        },
        {
          label: 'GitHub Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/wekan/wekan');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = getAppIcon();
  const iconImg = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    title: 'Lumora',
    icon: iconImg,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 12 },
    backgroundColor: '#07090e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  codexAcpService.setMainWindow(mainWindow);
  lumoraVoiceService.setMainWindow(mainWindow);

  const distHtmlPath = path.join(__dirname, '../../dist/index.html');

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    const devUrl = 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(() => {
      console.log('⚡ Vite dev server not detected on :5173, loading local dist bundle...');
      if (fs.existsSync(distHtmlPath)) {
        mainWindow?.loadFile(distHtmlPath);
      }
    });
  } else {
    mainWindow.loadFile(distHtmlPath);
  }


  mainWindow.on('close', (e) => {
    if (confirmBeforeQuit && !isQuittingConfirmed) {
      e.preventDefault();
      mainWindow?.webContents.send('app:requestClosePrompt');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    codexAcpService.setMainWindow(null);
    lumoraVoiceService.setMainWindow(null);
  });
}

// IPC Handlers for Quit Confirmation Settings
ipcMain.handle('app:setConfirmBeforeQuit', (event, enabled: boolean) => {
  confirmBeforeQuit = Boolean(enabled);
  return confirmBeforeQuit;
});

ipcMain.handle('app:setAppIcon', (event, iconTheme: string) => {
  const iconPath = getAppIcon(iconTheme);
  if (!iconPath) {
    console.warn(`Icon path not found for theme "${iconTheme}"`);
    return false;
  }
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(img);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIcon(img);
    }
    return true;
  } catch (e) {
    console.warn('Could not set app icon dynamically:', e);
    return false;
  }
});

ipcMain.handle('app:quitConfirmed', () => {
  isQuittingConfirmed = true;
  app.quit();
});


// IPC Handler for Native File Picker
ipcMain.handle('dialog:openFile', async (event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  const fileBuffer = await fs.promises.readFile(filePath);
  const base64Data = fileBuffer.toString('base64');
  
  // Basic mime type guess
  const ext = path.extname(fileName).toLowerCase();
  let fileType = 'application/octet-stream';
  if (ext === '.png') fileType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') fileType = 'image/jpeg';
  else if (ext === '.gif') fileType = 'image/gif';
  else if (ext === '.svg') fileType = 'image/svg+xml';
  else if (ext === '.pdf') fileType = 'application/pdf';
  else if (ext === '.txt') fileType = 'text/plain';
  else if (ext === '.json') fileType = 'application/json';
  else if (ext === '.zip') fileType = 'application/zip';

  return {
    name: fileName,
    type: fileType,
    size: fileBuffer.length,
    base64: base64Data,
  };
});

// IPC Handler for Directory Selection Dialog
ipcMain.handle('dialog:openDirectory', async (event, title?: string) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Select Local Codebase Repository',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC Handler for Directory Verification (handles deleted/renamed paths)
ipcMain.handle('fs:verifyDirectory', async (event, dirPath: string) => {
  try {
    if (!dirPath || !dirPath.trim()) return { exists: false, isGit: false };
    const clean = dirPath.trim();
    if (!fs.existsSync(clean)) return { exists: false, isGit: false };
    const stat = await fs.promises.stat(clean);
    if (!stat.isDirectory()) return { exists: false, isGit: false };
    const gitDir = path.join(clean, '.git');
    const isGit = fs.existsSync(gitDir);
    return { exists: true, isGit };
  } catch (_) {
    return { exists: false, isGit: false };
  }
});

// IPC Handler for opening external URLs in OS default browser
ipcMain.handle('shell:openExternal', async (event, url: string) => {

  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// IPC Handlers for Solo Mode Subprocess
ipcMain.handle('solo:start', async () => {
  return await soloModeManager.startSoloMode();
});

ipcMain.handle('solo:stop', async () => {
  return await soloModeManager.stopSoloMode();
});

ipcMain.handle('solo:status', async () => {
  return soloModeManager.getStatus();
});

// IPC Handlers for Codex ACP Dev Pipeline
ipcMain.handle('codex:init', async (event, config) => {
  return await codexAcpService.initialize(config);
});


ipcMain.handle('codex:status', async () => {
  return codexAcpService.getStatus();
});

ipcMain.handle('codex:listModels', async () => {
  return await codexAcpService.listModels();
});

ipcMain.handle('codex:setConfigOption', async (event, sessionId, configId, value) => {
  return await codexAcpService.setConfigOption(sessionId, configId, value);
});


ipcMain.handle('codex:runDiagnosis', async (event, cardContext) => {
  return await codexAcpService.runDiagnosis(cardContext);
});

ipcMain.handle('codex:runExecution', async (event, params) => {
  return await codexAcpService.runExecution(params);
});

ipcMain.handle('codex:cancel', async (event, cardId) => {
  return codexAcpService.cancelSession(cardId);
});

ipcMain.handle('codex:gitCreateBranch', async (event, repoPath, branchName) => {
  return await codexAcpService.createBranch(repoPath, branchName);
});

ipcMain.handle('codex:gitGetDiff', async (event, repoPath, baseBranch) => {
  return await codexAcpService.getDiff(repoPath, baseBranch);
});

ipcMain.handle('codex:runQualityGates', async (event, repoPath) => {
  return await codexAcpService.runQualityGates(repoPath);
});

ipcMain.handle('codex:readLearnings', async (event, repoPath) => {
  return await codexAcpService.readLearnings(repoPath || process.cwd());
});

ipcMain.handle('codex:writeLearnings', async (event, content, repoPath) => {
  return await codexAcpService.writeLearnings(content, repoPath || process.cwd());
});

// IPC Handlers for Lumora Voice Dictation (OpenWhispr base)
ipcMain.handle('voice:getStatus', async () => {
  return lumoraVoiceService.getStatus();
});

ipcMain.handle('voice:setRecording', async (event, isRecording: boolean) => {
  lumoraVoiceService.setRecording(Boolean(isRecording));
  return true;
});

ipcMain.handle('voice:setHotkey', async (event, hotkey: string) => {
  return lumoraVoiceService.setHotkey(hotkey);
});

ipcMain.handle('voice:transcribeAudio', async (event, audioBase64: string, options?: any) => {
  return await lumoraVoiceService.transcribeAudio(audioBase64, options);
});

ipcMain.handle('voice:checkWhisperInstalled', async () => {
  return lumoraVoiceService.detectLocalWhisper();
});

ipcMain.handle('voice:checkPermissions', async () => {
  return await lumoraVoiceService.checkPermissions();
});

ipcMain.handle('voice:requestMicPermission', async () => {
  return await lumoraVoiceService.requestMicPermission();
});

ipcMain.handle('voice:injectText', async (event, text: string) => {
  return await lumoraVoiceService.injectTextIntoFocusedApp(text);
});

// --- Kokoro-82M Text-To-Speech (TTS) IPC Handlers ---
ipcMain.handle('tts:getStatus', async () => {
  return kokoroTtsService.getStatus();
});

ipcMain.handle('tts:setVoice', async (event, voiceId: string) => {
  return kokoroTtsService.setVoice(voiceId);
});

ipcMain.handle('tts:synthesize', async (event, text: string, options?: any) => {
  return await kokoroTtsService.synthesize(text, options);
});

// --- Upstream Git Tracking & Model Checkpoint Feed IPC Handlers ---
ipcMain.handle('upstream:checkStatus', async (event, repoKey: 'openwhispr' | 'kokoro') => {
  return await upstreamSyncService.checkUpstreamStatus(repoKey);
});

ipcMain.handle('upstream:checkModelCheckpoints', async () => {
  return await upstreamSyncService.checkModelCheckpoints();
});

app.whenReady().then(() => {
  const iconPath = getAppIcon();
  if (process.platform === 'darwin' && app.dock && iconPath) {
    try {
      const img = nativeImage.createFromPath(iconPath);
      app.dock.setIcon(img);
    } catch (e) {
      console.warn('Could not set macOS dock icon:', e);
    }
  }

  setupAppMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (e) => {
  if (confirmBeforeQuit && !isQuittingConfirmed) {
    e.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('app:requestClosePrompt');
    }
  }
});

app.on('window-all-closed', () => {
  soloModeManager.stopSoloMode();
  codexAcpService.shutdown();
  lumoraVoiceService.unregisterGlobalHotkeys();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


