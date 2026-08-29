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

import { useBoardStore } from '../src/renderer/store/boardStore';

describe('ConfirmDialog & Quit Modal State Management', () => {
  beforeEach(() => {
    localStorage.clear();
    useBoardStore.getState().closeConfirm();
  });

  it('initially has confirmDialog as null', () => {
    const state = useBoardStore.getState();
    expect(state.confirmDialog).toBeNull();
  });

  it('opens confirm modal with quit options and custom variant', () => {
    const onConfirmMock = () => {};
    useBoardStore.getState().showConfirm({
      title: 'Quit Lumora?',
      message: 'Are you sure you want to close and exit Lumora?',
      confirmText: 'Quit Lumora',
      cancelText: 'Stay',
      variant: 'quit',
      icon: 'logout',
      note: 'All workspace edits and notes are securely saved in local cache.',
      isDestructive: false,
      onConfirm: onConfirmMock,
    });

    const state = useBoardStore.getState();
    expect(state.confirmDialog).toBeTruthy();
    expect(state.confirmDialog?.isOpen).toBe(true);
    expect(state.confirmDialog?.title).toBe('Quit Lumora?');
    expect(state.confirmDialog?.variant).toBe('quit');
    expect(state.confirmDialog?.icon).toBe('logout');
    expect(state.confirmDialog?.confirmText).toBe('Quit Lumora');
    expect(state.confirmDialog?.cancelText).toBe('Stay');
    expect(state.confirmDialog?.note).toBe('All workspace edits and notes are securely saved in local cache.');
  });

  it('closes confirm modal on closeConfirm', () => {
    useBoardStore.getState().showConfirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      isDestructive: true,
      onConfirm: () => {},
    });

    expect(useBoardStore.getState().confirmDialog?.isOpen).toBe(true);
    useBoardStore.getState().closeConfirm();
    expect(useBoardStore.getState().confirmDialog).toBeNull();
  });
});
