import { describe, it, expect, beforeEach } from 'vitest';

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

import { VoiceHistoryManager } from '../src/renderer/lib/voiceHistoryManager';

describe('Lumora Voice Step 5: Persistent Dictation History', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and retrieves dictation sessions in sorted chronological order', () => {
    VoiceHistoryManager.saveSession({
      id: 'sess_1',
      timestamp: '2026-08-30T10:00:00Z',
      rawTranscript: 'Initial dictation session',
      notes: [],
    });

    VoiceHistoryManager.saveSession({
      id: 'sess_2',
      timestamp: '2026-08-31T12:00:00Z',
      rawTranscript: 'Newest dictation session',
      notes: [],
    });

    const all = VoiceHistoryManager.getSessions();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('sess_2'); // Newest first
    expect(all[1].id).toBe('sess_1');
  });

  it('performs full-text search across transcripts, note titles, descriptions, and tags', () => {
    VoiceHistoryManager.saveSession({
      id: 'sess_auth',
      rawTranscript: 'We need to fix OAuth redirect cookie expiration in Safari browser',
      notes: [
        {
          id: 'n1',
          title: 'Fix OAuth cookie',
          description: 'Safari cookie domain mismatch',
          tags: ['auth', 'safari'],
          status: 'candidate',
        },
      ],
    });

    VoiceHistoryManager.saveSession({
      id: 'sess_ui',
      rawTranscript: 'Update dark mode color tokens for kanban cards',
      notes: [
        {
          id: 'n2',
          title: 'Refactor CSS tokens',
          tags: ['design', 'css'],
          status: 'candidate',
        },
      ],
    });

    // Search by transcript keyword
    const searchSafari = VoiceHistoryManager.searchSessions('safari');
    expect(searchSafari).toHaveLength(1);
    expect(searchSafari[0].id).toBe('sess_auth');

    // Search by tag
    const searchTag = VoiceHistoryManager.searchSessions('', { tag: 'design' });
    expect(searchTag).toHaveLength(1);
    expect(searchTag[0].id).toBe('sess_ui');

    // Search by note title
    const searchTitle = VoiceHistoryManager.searchSessions('cookie');
    expect(searchTitle).toHaveLength(1);
    expect(searchTitle[0].id).toBe('sess_auth');
  });

  it('allows deleting single session or clearing all history', () => {
    VoiceHistoryManager.saveSession({ id: 's1', rawTranscript: 'First', notes: [] });
    VoiceHistoryManager.saveSession({ id: 's2', rawTranscript: 'Second', notes: [] });

    expect(VoiceHistoryManager.getSessions()).toHaveLength(2);

    VoiceHistoryManager.deleteSession('s1');
    expect(VoiceHistoryManager.getSessions()).toHaveLength(1);
    expect(VoiceHistoryManager.getSessions()[0].id).toBe('s2');

    VoiceHistoryManager.clearAllSessions();
    expect(VoiceHistoryManager.getSessions()).toHaveLength(0);
  });
});
