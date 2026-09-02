import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';

export interface KokoroVoice {
  id: string;
  name: string;
  gender: 'female' | 'male';
  language: string;
  languageCode: string;
  isDefault?: boolean;
}

export interface KokoroTtsStatus {
  isReady: boolean;
  modelsDir: string;
  modelFound: boolean;
  voicesBinFound: boolean;
  activeVoice: string;
  voices: KokoroVoice[];
  downloadUrlModel: string;
  downloadUrlVoices: string;
}

export const KOKORO_VOICES: KokoroVoice[] = [
  // American English Female
  { id: 'af_heart', name: 'Heart (US Female - Default)', gender: 'female', language: 'English (US)', languageCode: 'en-us', isDefault: true },
  { id: 'af_bella', name: 'Bella (US Female)', gender: 'female', language: 'English (US)', languageCode: 'en-us' },
  { id: 'af_nicole', name: 'Nicole (US Female)', gender: 'female', language: 'English (US)', languageCode: 'en-us' },
  { id: 'af_aoede', name: 'Aoede (US Female)', gender: 'female', language: 'English (US)', languageCode: 'en-us' },
  { id: 'af_kore', name: 'Kore (US Female)', gender: 'female', language: 'English (US)', languageCode: 'en-us' },
  { id: 'af_sarah', name: 'Sarah (US Female)', gender: 'female', language: 'English (US)', languageCode: 'en-us' },
  { id: 'af_sky', name: 'Sky (US Female)', gender: 'female', language: 'English (US)', languageCode: 'en-us' },

  // American English Male
  { id: 'am_adam', name: 'Adam (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_michael', name: 'Michael (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_fenrir', name: 'Fenrir (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_puck', name: 'Puck (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_echo', name: 'Echo (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_eric', name: 'Eric (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_liam', name: 'Liam (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },
  { id: 'am_onyx', name: 'Onyx (US Male)', gender: 'male', language: 'English (US)', languageCode: 'en-us' },

  // British English Female
  { id: 'bf_emma', name: 'Emma (UK Female)', gender: 'female', language: 'English (UK)', languageCode: 'en-gb' },
  { id: 'bf_isabella', name: 'Isabella (UK Female)', gender: 'female', language: 'English (UK)', languageCode: 'en-gb' },
  { id: 'bf_alice', name: 'Alice (UK Female)', gender: 'female', language: 'English (UK)', languageCode: 'en-gb' },
  { id: 'bf_lily', name: 'Lily (UK Female)', gender: 'female', language: 'English (UK)', languageCode: 'en-gb' },

  // British English Male
  { id: 'bm_george', name: 'George (UK Male)', gender: 'male', language: 'English (UK)', languageCode: 'en-gb' },
  { id: 'bm_fable', name: 'Fable (UK Male)', gender: 'male', language: 'English (UK)', languageCode: 'en-gb' },
  { id: 'bm_lewis', name: 'Lewis (UK Male)', gender: 'male', language: 'English (UK)', languageCode: 'en-gb' },
  { id: 'bm_daniel', name: 'Daniel (UK Male)', gender: 'male', language: 'English (UK)', languageCode: 'en-gb' },

  // Multilingual
  { id: 'ef_dora', name: 'Dora (Spanish Female)', gender: 'female', language: 'Spanish', languageCode: 'es' },
  { id: 'em_alex', name: 'Alex (Spanish Male)', gender: 'male', language: 'Spanish', languageCode: 'es' },
  { id: 'ff_siwis', name: 'Siwis (French Female)', gender: 'female', language: 'French', languageCode: 'fr' },
  { id: 'hf_alpha', name: 'Alpha (Hindi Female)', gender: 'female', language: 'Hindi', languageCode: 'hi' },
  { id: 'hm_omega', name: 'Omega (Hindi Male)', gender: 'male', language: 'Hindi', languageCode: 'hi' },
  { id: 'if_sara', name: 'Sara (Italian Female)', gender: 'female', language: 'Italian', languageCode: 'it' },
  { id: 'im_nicola', name: 'Nicola (Italian Male)', gender: 'male', language: 'Italian', languageCode: 'it' },
  { id: 'jf_alpha', name: 'Alpha (Japanese Female)', gender: 'female', language: 'Japanese', languageCode: 'ja' },
  { id: 'jm_kudo', name: 'Kudo (Japanese Male)', gender: 'male', language: 'Japanese', languageCode: 'ja' },
  { id: 'zf_xiaobei', name: 'Xiaobei (Chinese Female)', gender: 'female', language: 'Chinese', languageCode: 'zh' },
  { id: 'zm_yunjian', name: 'Yunjian (Chinese Male)', gender: 'male', language: 'Chinese', languageCode: 'zh' },
];

export class KokoroTtsService {
  private modelsDir: string;
  private modelFilePath: string;
  private voicesFilePath: string;
  private activeVoice = 'af_heart';

  constructor() {
    this.modelsDir = path.join(os.homedir(), '.lumora', 'models');
    this.modelFilePath = path.join(this.modelsDir, 'kokoro-v1.0.onnx');
    this.voicesFilePath = path.join(this.modelsDir, 'voices-v1.0.bin');
    this.ensureModelsDir();
  }

  private ensureModelsDir() {
    try {
      if (!fs.existsSync(this.modelsDir)) {
        fs.mkdirSync(this.modelsDir, { recursive: true });
      }
    } catch (_) {}
  }

  public getStatus(): KokoroTtsStatus {
    const modelFound = fs.existsSync(this.modelFilePath);
    const voicesBinFound = fs.existsSync(this.voicesFilePath);

    return {
      isReady: modelFound && voicesBinFound,
      modelsDir: this.modelsDir,
      modelFound,
      voicesBinFound,
      activeVoice: this.activeVoice,
      voices: KOKORO_VOICES,
      downloadUrlModel: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/kokoro-v1.0.onnx',
      downloadUrlVoices: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices-v1.0.bin',
    };
  }

  public setVoice(voiceId: string): boolean {
    const found = KOKORO_VOICES.find(v => v.id === voiceId);
    if (found) {
      this.activeVoice = voiceId;
      return true;
    }
    return false;
  }

  /**
   * Synthesizes speech from input text using Kokoro-82M ONNX model
   */
  public async synthesize(
    text: string,
    options?: {
      voice?: string;
      speed?: number;
    }
  ): Promise<{ success: boolean; audioBase64?: string; mimeType?: string; error?: string; fallback?: boolean }> {
    if (!text || !text.trim()) {
      return { success: false, error: 'Text to speak cannot be empty' };
    }

    const voice = options?.voice || this.activeVoice;
    const speed = options?.speed || 1.0;
    const cleanText = text.trim();

    // Check if local ONNX model files are installed
    const status = this.getStatus();
    if (!status.isReady) {
      return {
        success: true,
        fallback: true,
        error: 'Kokoro ONNX weights not yet downloaded. Using client speech synthesis.',
      };
    }

    // Try executing Python kokoro-onnx wrapper if python3 environment is available
    const tempWavPath = path.join(os.tmpdir(), `kokoro_${Date.now()}.wav`);
    try {
      const pythonScript = `
import sys
try:
    from kokoro_onnx import Kokoro
    import soundfile as sf
    kokoro = Kokoro("${this.modelFilePath}", "${this.voicesFilePath}")
    samples, sample_rate = kokoro.create("""${cleanText.replace(/"/g, '\\"')}""", voice="${voice}", speed=${speed})
    sf.write("${tempWavPath}", samples, sample_rate)
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`;
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('python3', ['-c', pythonScript]);
        let stderr = '';
        proc.stderr.on('data', d => (stderr += d.toString()));
        proc.on('close', code => {
          if (code === 0 && fs.existsSync(tempWavPath)) {
            resolve();
          } else {
            reject(new Error(stderr || `Kokoro python process exited with code ${code}`));
          }
        });
        proc.on('error', reject);
      });

      const wavBuffer = await fs.promises.readFile(tempWavPath);
      const audioBase64 = wavBuffer.toString('base64');
      await fs.promises.unlink(tempWavPath).catch(() => {});

      return {
        success: true,
        audioBase64,
        mimeType: 'audio/wav',
      };
    } catch (e: any) {
      console.warn('[KokoroTTS] Local ONNX execution fallback:', e?.message);
      return {
        success: true,
        fallback: true,
        error: e?.message || 'Using client speech synthesis fallback.',
      };
    }
  }
}

export const kokoroTtsService = new KokoroTtsService();
