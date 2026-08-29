import { describe, it, expect } from 'vitest';
import { soloModeManager } from '../src/main/soloMode';

describe('Phase 4 Section 4: Solo Bundled-Subprocess Mode Manager', () => {
  it('should initialize and report initial idle status', () => {
    const status = soloModeManager.getStatus();
    expect(status.running).toBe(false);
  });

  it('should start solo mode and allocate dynamic ports', async () => {
    const res = await soloModeManager.startSoloMode();
    expect(res.success).toBe(true);
    expect(res.port).toBeGreaterThanOrEqual(8089);

    const status = soloModeManager.getStatus();
    expect(status.running).toBe(true);
  });

  it('should stop solo mode cleanly and release subprocess resources', async () => {
    const stopRes = await soloModeManager.stopSoloMode();
    expect(stopRes.success).toBe(true);

    const status = soloModeManager.getStatus();
    expect(status.running).toBe(false);
  });
});
