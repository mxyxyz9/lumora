import { describe, it, expect } from 'vitest';
import { upstreamSyncService } from '../src/main/upstreamSyncService';

describe('Lumora Voice Step 7: Upstream Sync & Model Checkpoint Feed', () => {
  it('checks model checkpoint updates feed for Whisper and Kokoro without touching app code', async () => {
    const checkpoints = await upstreamSyncService.checkModelCheckpoints();
    expect(checkpoints).toHaveLength(3);

    const whisperModel = checkpoints.find(c => c.modelId === 'whisper-large-v3-turbo');
    expect(whisperModel).toBeDefined();
    expect(whisperModel?.category).toBe('STT');
    expect(whisperModel?.downloadUrl).toContain('ggml-large-v3-turbo.bin');

    const kokoroModel = checkpoints.find(c => c.modelId === 'kokoro-v1.0-onnx');
    expect(kokoroModel).toBeDefined();
    expect(kokoroModel?.category).toBe('TTS');
    expect(kokoroModel?.downloadUrl).toContain('kokoro-v1.0.onnx');
  });

  it('safely inspects upstream status on OpenWhispr fork without auto-merging', async () => {
    const status = await upstreamSyncService.checkUpstreamStatus('openwhispr');
    expect(status).toHaveProperty('name');
    expect(status).toHaveProperty('upstreamUrl');
    expect(status.upstreamUrl).toBe('https://github.com/OpenWhispr/openwhispr.git');
    expect(status).toHaveProperty('commitsBehind');
    expect(Array.isArray(status.incomingCommits)).toBe(true);
  });
});
