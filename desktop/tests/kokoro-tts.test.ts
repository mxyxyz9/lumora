import { describe, it, expect } from 'vitest';
import { kokoroTtsService, KOKORO_VOICES } from '../src/main/kokoroTtsService';

describe('Lumora Voice Step 6: Kokoro-82M Text-To-Speech (TTS)', () => {
  it('exposes full Kokoro-82M voice list with female, male, and multilingual presets', () => {
    const status = kokoroTtsService.getStatus();
    expect(status.voices.length).toBeGreaterThanOrEqual(20);
    expect(status.activeVoice).toBe('af_heart');

    // Check specific preset voices
    const afHeart = KOKORO_VOICES.find(v => v.id === 'af_heart');
    expect(afHeart?.gender).toBe('female');
    expect(afHeart?.languageCode).toBe('en-us');

    const amAdam = KOKORO_VOICES.find(v => v.id === 'am_adam');
    expect(amAdam?.gender).toBe('male');

    const bfEmma = KOKORO_VOICES.find(v => v.id === 'bf_emma');
    expect(bfEmma?.languageCode).toBe('en-gb');
  });

  it('allows changing active Kokoro voice preset', () => {
    const changed = kokoroTtsService.setVoice('am_michael');
    expect(changed).toBe(true);
    expect(kokoroTtsService.getStatus().activeVoice).toBe('am_michael');

    const invalid = kokoroTtsService.setVoice('non_existent_voice');
    expect(invalid).toBe(false);
  });

  it('gracefully handles empty text synthesis requests', async () => {
    const res = await kokoroTtsService.synthesize('');
    expect(res.success).toBe(false);
    expect(res.error).toContain('cannot be empty');
  });

  it('falls back cleanly when ONNX model files are not yet downloaded', async () => {
    const res = await kokoroTtsService.synthesize('Welcome to Lumora.');
    expect(res.success).toBe(true);
    expect(res.fallback).toBe(true);
  });
});
