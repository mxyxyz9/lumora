import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

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

describe('Guest / Offline Mode End-to-End', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes guest workspace and sets session', async () => {
    const store = useBoardStore.getState();
    await store.continueAsGuest();

    const state = useBoardStore.getState();
    expect(state.session).toBeTruthy();
    expect(state.session?.isGuest).toBe(true);
    expect(state.session?.username).toBe('Guest (Offline)');
    expect(state.boards.length).toBeGreaterThan(0);
    expect(state.activeBoard).toBeTruthy();
    expect(state.activeBoard?.title).toBe('My Tasks');
    expect(state.activeBoard?.icon).toBe('🎯');
    expect(state.swimlanes.length).toBeGreaterThan(0);
    expect(state.lists.length).toBeGreaterThan(0);
    expect(state.cards.length).toBeGreaterThan(0);
  });

  it('supports creating a new project with custom emoji and templates', async () => {
    const store = useBoardStore.getState();
    await store.continueAsGuest();

    const newBoardId = await store.createBoard(
      'Autonomous DevOps',
      'slate',
      'private',
      ['Backlog', 'Testing', 'Shipped'],
      ['Infra', 'App'],
      '🚀'
    );

    expect(newBoardId).toBeTruthy();
    const state = useBoardStore.getState();
    const createdBoard = state.boards.find(b => b._id === newBoardId);
    expect(createdBoard).toBeTruthy();
    expect(createdBoard?.icon).toBe('🚀');
    expect(createdBoard?.title).toBe('Autonomous DevOps');
  });

  it('auto-migrates legacy "Offline Local Workspace" to "My Tasks" with emoji', async () => {
    // Seed legacy structure in localStorage
    localStorage.setItem('kanso_guest_boards', JSON.stringify([
      { _id: 'guest-board-old', title: 'Offline Local Workspace', color: 'midnight' },
      { _id: 'guest-board-2', title: 'tabs-ide', color: 'purple' },
    ]));

    const store = useBoardStore.getState();
    await store.continueAsGuest();

    const state = useBoardStore.getState();
    const migrated1 = state.boards.find(b => b._id === 'guest-board-old');
    const migrated2 = state.boards.find(b => b._id === 'guest-board-2');

    expect(migrated1?.title).toBe('My Tasks');
    expect(migrated1?.icon).toBe('🎯');
    expect(migrated2?.icon).toBeTruthy(); // Fallback icon assigned
  });

  it('supports creating a new subfolder in guest mode', async () => {
    const store = useBoardStore.getState();
    await store.continueAsGuest();

    const initialSwimlanes = useBoardStore.getState().swimlanes.length;
    const newId = await store.createSwimlane('Security & Compliance');

    expect(newId).toBeTruthy();
    const updated = useBoardStore.getState().swimlanes;
    expect(updated.length).toBe(initialSwimlanes + 1);
    expect(updated.some(s => s.title === 'Security & Compliance')).toBe(true);
  });

  it('supports creating and moving cards in guest mode', async () => {
    const store = useBoardStore.getState();
    await store.continueAsGuest();

    const listId = useBoardStore.getState().lists[0]._id;
    const swimlaneId = useBoardStore.getState().swimlanes[0]._id;

    await store.createCard(listId, 'Offline Test Task', 'Task description', swimlaneId);

    const cards = useBoardStore.getState().cards;
    const createdCard = cards.find(c => c.title === 'Offline Test Task');
    expect(createdCard).toBeTruthy();
    expect(createdCard?.listId).toBe(listId);

    // Move to another list
    const targetListId = useBoardStore.getState().lists[1]._id;
    await store.moveCard(createdCard!._id, targetListId);

    const afterMove = useBoardStore.getState().cards.find(c => c._id === createdCard!._id);
    expect(afterMove?.listId).toBe(targetListId);
  });
});
