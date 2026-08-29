import { describe, it, expect, beforeEach } from 'vitest';

// Polyfill localStorage for headless vitest node runner
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

import { useBoardStore } from '../src/renderer/store/boardStore';

describe('Guest Mode Complete Local Persistence Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    useBoardStore.setState({
      session: { isGuest: true, token: 'guest', userId: 'guest-user', serverUrl: 'http://localhost' },
      activeBoardId: 'board-test-1',
      boards: [{ _id: 'board-test-1', title: 'Test Board', color: 'midnight', permission: 'private', labels: [] }],
      lists: [{ _id: 'list-1', title: 'To Do', boardId: 'board-test-1', sort: 0 }],
      swimlanes: [{ _id: 'sw-1', title: 'Default', boardId: 'board-test-1', sort: 0 }],
      cards: [],
      comments: [],
      checklists: [],
      checklistItems: [],
      attachments: [],
      customFields: [],
    });
  });

  it('persists card creations and updates across boards', async () => {
    const store = useBoardStore.getState();
    const cardId = await store.createCard('list-1', 'Initial Task Title', 'Initial Description');
    expect(cardId).toBeTruthy();

    await store.updateCard(cardId, { title: 'Updated Title', description: 'Updated Description' });

    // Verify stored in localStorage
    const savedCards = JSON.parse(localStorage.getItem('kanso_guest_cards') || '[]');
    expect(savedCards.length).toBe(1);
    expect(savedCards[0].title).toBe('Updated Title');
    expect(savedCards[0].description).toBe('Updated Description');
  });

  it('persists attachments and custom fields when switching boards', async () => {
    const store = useBoardStore.getState();
    const cardId = await store.createCard('list-1', 'Task with Attachment');

    await store.uploadAttachment(cardId, 'data:image/png;base64,iVBORw0KGgo...', 'screenshot.png', 'image/png');
    await store.createCustomField({ name: 'Story Points', type: 'number' });

    const savedAtts = JSON.parse(localStorage.getItem('kanso_guest_attachments') || '[]');
    const savedCfs = JSON.parse(localStorage.getItem('kanso_guest_custom_fields') || '[]');
    expect(savedAtts.length).toBe(1);
    expect(savedAtts[0].name).toBe('screenshot.png');
    expect(savedCfs.length).toBe(1);
    expect(savedCfs[0].name).toBe('Story Points');

    // Switch board and verify loaded back
    await store.switchBoard('board-test-1');
    expect(useBoardStore.getState().attachments.length).toBe(1);
    expect(useBoardStore.getState().customFields.length).toBe(1);
  });

  it('persists checklists, items, and comments without overwriting across boards', async () => {
    const store = useBoardStore.getState();
    const cardId = await store.createCard('list-1', 'Task with Checklist');

    await store.createChecklist(cardId, 'Acceptance Criteria');
    const cl = useBoardStore.getState().checklists[0];
    expect(cl).toBeDefined();

    await store.createChecklistItem(cardId, cl._id, 'Unit tests passing');
    await store.addComment(cardId, 'Great job on this feature!');

    const savedCls = JSON.parse(localStorage.getItem('kanso_guest_checklists') || '[]');
    const savedItems = JSON.parse(localStorage.getItem('kanso_guest_items') || '[]');
    const savedCmts = JSON.parse(localStorage.getItem('kanso_guest_comments') || '[]');

    expect(savedCls.length).toBe(1);
    expect(savedItems.length).toBe(1);
    expect(savedItems[0].title).toBe('Unit tests passing');
    expect(savedCmts.length).toBe(1);
    expect(savedCmts[0].text).toBe('Great job on this feature!');
  });
});
