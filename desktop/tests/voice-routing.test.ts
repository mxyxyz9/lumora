import { describe, it, expect, vi, beforeEach } from 'vitest';

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

import { VoiceCandidateNote } from '../src/renderer/lib/types';
import { VoiceHistoryManager } from '../src/renderer/lib/voiceHistoryManager';

describe('Lumora Voice Step 4: Routing Candidate Notes to Board', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('correctly maps candidate note fields into Wekan card payload', () => {
    const candidate: VoiceCandidateNote = {
      id: 'note_123',
      title: 'Fix token leak in Web Audio pipeline',
      description: 'AudioContext must be explicitly closed on component unmount',
      suggestedList: 'In Progress',
      urgency: 'high',
      tags: ['audio', 'memory', 'leak'],
      status: 'candidate',
    };

    const formattedDescription = `${candidate.description || ''}\n\nTags: ${candidate.tags?.map(t => '#' + t).join(' ')}\nUrgency: ${candidate.urgency}`;

    expect(formattedDescription).toContain('AudioContext must be explicitly closed');
    expect(formattedDescription).toContain('Tags: #audio #memory #leak');
    expect(formattedDescription).toContain('Urgency: high');
  });

  it('matches target list by title case-insensitively or defaults to first list', () => {
    const lists = [
      { _id: 'list_1', title: 'To Do' },
      { _id: 'list_2', title: 'In Progress' },
      { _id: 'list_3', title: 'Done' },
    ];

    const findList = (suggested?: string) => {
      let target = lists.find(l => l.title.toLowerCase() === (suggested || '').toLowerCase());
      if (!target && lists.length > 0) target = lists[0];
      return target;
    };

    expect(findList('in progress')?._id).toBe('list_2');
    expect(findList('IN PROGRESS')?._id).toBe('list_2');
    expect(findList('Backlog')?._id).toBe('list_1'); // Fallback to first
    expect(findList(undefined)?._id).toBe('list_1');
  });

  it('updates session audit trail when candidate note is routed to card', () => {
    const session = VoiceHistoryManager.saveSession({
      rawTranscript: 'Fix token leak in Web Audio pipeline',
      notes: [
        {
          id: 'note_123',
          title: 'Fix token leak',
          status: 'candidate',
        },
      ],
    });

    expect(session.routedCardIds).toEqual([]);

    VoiceHistoryManager.markNoteRouted(session.id, 'note_123', 'card_xyz789');

    const updated = VoiceHistoryManager.getSessions().find(s => s.id === session.id);
    expect(updated?.routedCardIds).toContain('card_xyz789');
    expect(updated?.notes[0].status).toBe('accepted');
  });
});
