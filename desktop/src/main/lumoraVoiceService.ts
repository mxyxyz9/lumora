import { BrowserWindow, globalShortcut, app, ipcMain, clipboard, systemPreferences } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import openwhisprModelData from '../forks/openwhispr/models/modelRegistryData.json';

export interface VoiceStatus {
  isRecording: boolean;
  isTranscribing: boolean;
  activeHotkey: string;
  localWhisperAvailable: boolean;
  whisperCliPath?: string;
  modelsFound: string[];
  supportedWhisperModels: Array<{ id: string; name: string; size: string; fileName: string; downloadUrl?: string }>;
  micAccessStatus?: string;
  accessibilityGranted?: boolean;
  lastTranscript?: string;
  lastError?: string;
}

export class LumoraVoiceService {
  private mainWindow: BrowserWindow | null = null;
  private isRecording = false;
  private isTranscribing = false;
  private activeHotkey = process.platform === 'darwin' ? 'Option+Space' : 'Alt+Space';
  private alternateHotkey = 'CommandOrControl+Shift+V';
  private whisperCliPath: string | null = null;
  private modelsDir: string;
  private modelsFound: string[] = [];
  private openwhisprRegistry = openwhisprModelData;

  constructor() {
    this.modelsDir = path.join(os.homedir(), '.lumora', 'models');
    this.ensureModelsDir();
    this.detectLocalWhisper();
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
    if (window) {
      this.registerGlobalHotkeys();
    }
  }

  private ensureModelsDir() {
    try {
      if (!fs.existsSync(this.modelsDir)) {
        fs.mkdirSync(this.modelsDir, { recursive: true });
      }
      this.scanModels();
    } catch (e) {
      console.warn('[LumoraVoice] Could not create models dir:', e);
    }
  }

  private scanModels() {
    try {
      if (fs.existsSync(this.modelsDir)) {
        const files = fs.readdirSync(this.modelsDir);
        this.modelsFound = files.filter(f => f.endsWith('.bin') || f.endsWith('.gguf') || f.endsWith('.onnx'));
      }
    } catch (_) {
      this.modelsFound = [];
    }
  }

  public detectLocalWhisper(): { installed: boolean; path?: string; models: string[] } {
    const commonPaths = [
      '/opt/homebrew/bin/whisper-cli',
      '/usr/local/bin/whisper-cli',
      '/opt/homebrew/bin/whisper',
      '/usr/local/bin/whisper',
      '/usr/bin/whisper-cli',
      '/usr/bin/whisper',
      path.join(os.homedir(), '.local/bin/whisper-cli'),
      path.join(os.homedir(), '.local/bin/whisper'),
      path.join(os.homedir(), '.lumora/bin/whisper-cli'),
      path.join(os.homedir(), '.lumora/bin/whisper'),
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        this.whisperCliPath = p;
        break;
      }
    }

    this.scanModels();

    return {
      installed: !!this.whisperCliPath,
      path: this.whisperCliPath || undefined,
      models: this.modelsFound,
    };
  }

  public registerGlobalHotkeys() {
    try {
      globalShortcut.unregisterAll();

      // Primary hotkey (Option+Space or Alt+Space)
      const registeredPrimary = globalShortcut.register(this.activeHotkey, () => {
        this.handleHotkeyTrigger();
      });

      // Alternate hotkey (Cmd+Shift+V / Ctrl+Shift+V)
      const registeredAlt = globalShortcut.register(this.alternateHotkey, () => {
        this.handleHotkeyTrigger();
      });

      if (!registeredPrimary && !registeredAlt) {
        console.warn(`[LumoraVoice] Could not register global hotkeys (${this.activeHotkey}, ${this.alternateHotkey})`);
      }
    } catch (e) {
      console.warn('[LumoraVoice] Error registering global hotkeys:', e);
    }
  }

  public unregisterGlobalHotkeys() {
    try {
      globalShortcut.unregisterAll();
    } catch (_) {}
  }

  public setHotkey(hotkey: string): boolean {
    try {
      this.activeHotkey = hotkey;
      this.registerGlobalHotkeys();
      return true;
    } catch (e) {
      console.error('[LumoraVoice] Failed to update hotkey:', e);
      return false;
    }
  }

  private handleHotkeyTrigger() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    // Toggle recording state in renderer
    this.mainWindow.webContents.send('voice:hotkeyTriggered', {
      action: 'toggle',
      timestamp: Date.now(),
    });
  }

  public getStatus(): VoiceStatus {
    this.detectLocalWhisper();
    const supportedWhisperModels = Object.entries(this.openwhisprRegistry.whisperModels || {}).map(
      ([id, m]: [string, any]) => ({
        id,
        name: m.name || id,
        size: m.size || `${m.sizeMb || 0}MB`,
        fileName: m.fileName || `${id}.bin`,
        downloadUrl: m.downloadUrl,
      })
    );

    let micAccessStatus = 'granted';
    let accessibilityGranted = true;
    if (process.platform === 'darwin') {
      try {
        if (systemPreferences.getMediaAccessStatus) {
          micAccessStatus = systemPreferences.getMediaAccessStatus('microphone');
        }
        if (systemPreferences.isTrustedAccessibilityClient) {
          accessibilityGranted = systemPreferences.isTrustedAccessibilityClient(false);
        }
      } catch (_) {}
    }

    return {
      isRecording: this.isRecording,
      isTranscribing: this.isTranscribing,
      activeHotkey: this.activeHotkey,
      localWhisperAvailable: !!this.whisperCliPath,
      whisperCliPath: this.whisperCliPath || undefined,
      modelsFound: this.modelsFound,
      supportedWhisperModels,
      micAccessStatus,
      accessibilityGranted,
    };
  }

  public async checkPermissions(): Promise<{ mic: string; accessibility: boolean }> {
    let mic = 'granted';
    let accessibility = true;
    if (process.platform === 'darwin') {
      try {
        if (systemPreferences.getMediaAccessStatus) {
          mic = systemPreferences.getMediaAccessStatus('microphone');
        }
        if (systemPreferences.isTrustedAccessibilityClient) {
          accessibility = systemPreferences.isTrustedAccessibilityClient(false);
        }
      } catch (_) {}
    }
    return { mic, accessibility };
  }

  public async requestMicPermission(): Promise<boolean> {
    if (process.platform === 'darwin' && systemPreferences.askForMediaAccess) {
      try {
        return await systemPreferences.askForMediaAccess('microphone');
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  /**
   * Injects text into the currently focused external app/input field using OpenWhispr's clipboard paste strategy
   */
  public async injectTextIntoFocusedApp(text: string): Promise<{ success: boolean; error?: string }> {
    if (!text) return { success: false, error: 'No text to inject' };

    try {
      const originalClipboard = clipboard.readText();
      clipboard.writeText(text);

      const platform = process.platform;
      if (platform === 'darwin') {
        // Use AppleScript to simulate Cmd+V paste into active application
        await new Promise<void>((resolve, reject) => {
          const script = 'tell application "System Events" to keystroke "v" using command down';
          const proc = spawn('osascript', ['-e', script]);
          proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`osascript exited code ${code}`))));
          proc.on('error', reject);
        });
      } else if (platform === 'win32') {
        // PowerShell SendKeys Ctrl+V
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('powershell', ['-Command', '[System.Windows.Forms.SendKeys]::SendWait("^v")']);
          proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`PowerShell exited code ${code}`))));
          proc.on('error', reject);
        });
      } else {
        // Linux xdotool / wtype
        await new Promise<void>((resolve, reject) => {
          const proc = spawn('xdotool', ['key', 'ctrl+v']);
          proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`xdotool exited code ${code}`))));
          proc.on('error', reject);
        });
      }

      // Restore clipboard after short delay if desired
      setTimeout(() => {
        try {
          if (originalClipboard) clipboard.writeText(originalClipboard);
        } catch (_) {}
      }, 500);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to inject text into focused window' };
    }
  }

  public setRecording(recording: boolean) {
    this.isRecording = recording;
    this.broadcastStatus();
  }

  private broadcastStatus(extra?: Record<string, any>) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('voice:statusChange', {
        ...this.getStatus(),
        ...extra,
      });
    }
  }

  /**
   * Transcribes raw audio (base64 encoded WAV/WebM) using either local whisper-cli or cloud provider API
   */
  public async transcribeAudio(
    audioBase64: string,
    options?: {
      mimeType?: string;
      engine?: 'local' | 'gemini' | 'openai' | 'groq' | 'auto';
      apiKey?: string;
      model?: string;
      prompt?: string;
    }
  ): Promise<{ success: boolean; text?: string; duration?: number; error?: string }> {
    this.isTranscribing = true;
    this.broadcastStatus();

    const startTime = Date.now();

    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const tempWavPath = path.join(os.tmpdir(), `lumora_voice_${Date.now()}.wav`);
      await fs.promises.writeFile(tempWavPath, audioBuffer);

      let transcript = '';

      const engine = options?.engine || 'auto';

      // 1. Try local whisper-cli if engine is local or auto
      if ((engine === 'local' || engine === 'auto') && this.whisperCliPath && this.modelsFound.length > 0) {
        try {
          const modelFile = path.join(this.modelsDir, this.modelsFound[0]);
          transcript = await this.runWhisperCli(this.whisperCliPath, modelFile, tempWavPath, options?.prompt);
        } catch (localErr: any) {
          console.warn('[LumoraVoice] Local whisper-cli failed, falling back if available:', localErr.message);
          if (engine === 'local') {
            throw localErr;
          }
        }
      }

      // 2. If no local transcript and cloud API key is provided (OpenAI or Groq)
      if (!transcript && (options?.apiKey || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY)) {
        const apiKey = options?.apiKey || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
        const isGroq = engine === 'groq' || apiKey.startsWith('gsk_') || !!process.env.GROQ_API_KEY;
        const endpoint = isGroq
          ? 'https://api.groq.com/openai/v1/audio/transcriptions'
          : 'https://api.openai.com/v1/audio/transcriptions';
        const modelName = options?.model || (isGroq ? 'whisper-large-v3-turbo' : 'whisper-1');

        transcript = await this.callCloudWhisper(tempWavPath, apiKey, endpoint, modelName, options?.prompt);
      }

      // 3. Clean up temp WAV file
      try {
        if (fs.existsSync(tempWavPath)) {
          await fs.promises.unlink(tempWavPath);
        }
      } catch (_) {}

      const duration = (Date.now() - startTime) / 1000;
      this.isTranscribing = false;

      if (!transcript && !audioBase64) {
        throw new Error('No audio data received for transcription.');
      }

      // If neither local whisper nor cloud is configured, return informative error
      if (!transcript) {
        throw new Error(
          'No transcription engine available. Please install whisper-cli (`brew install whisper-cpp`) or configure an API key (Groq, OpenAI, or Gemini) in Settings.'
        );
      }

      this.broadcastStatus({ lastTranscript: transcript });
      return { success: true, text: transcript.trim(), duration };
    } catch (err: any) {
      this.isTranscribing = false;
      const errorMsg = err?.message || 'Speech transcription failed.';
      this.broadcastStatus({ lastError: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  private runWhisperCli(cliPath: string, modelPath: string, wavPath: string, prompt?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['-m', modelPath, '-f', wavPath, '--no-timestamps', '-nt'];
      if (prompt) {
        args.push('--prompt', prompt);
      }

      const proc = spawn(cliPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', chunk => {
        stdout += chunk.toString('utf8');
      });

      proc.stderr.on('data', chunk => {
        stderr += chunk.toString('utf8');
      });

      proc.on('close', code => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`whisper-cli exited with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', err => {
        reject(err);
      });
    });
  }

  private async callCloudWhisper(
    filePath: string,
    apiKey: string,
    endpoint: string,
    model: string,
    prompt?: string
  ): Promise<string> {
    const fileBuffer = await fs.promises.readFile(filePath);
    const blob = new Blob([fileBuffer], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, 'audio.wav');
    formData.append('model', model);
    formData.append('response_format', 'json');
    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { text?: string };
    return data.text || '';
  }
}

export const lumoraVoiceService = new LumoraVoiceService();
