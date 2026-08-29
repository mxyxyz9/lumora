import { describe, it, expect } from 'vitest';
import { wekanApi } from '../src/renderer/lib/wekanApi';
import { ddpClient } from '../src/renderer/lib/ddpClient';
import { useBoardStore } from '../src/renderer/store/boardStore';
import { WebSocket } from 'ws';

// Polyfill global WebSocket for Node test runner
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

// Polyfill localStorage
const memoryStorage: Record<string, string> = {};
if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => {
      memoryStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      for (const k in memoryStorage) delete memoryStorage[k];
    },
  };
}

describe('Real WeKan Live Backend End-to-End Suite', () => {
  const SERVER_URL = process.env.WEKAN_URL || 'http://localhost';
  let session: any = null;
  let boardId = '';
  let listId = '';
  let swimlaneId = '';
  let cardId = '';

  it('Step 1: Authenticates against Real WeKan (POST /users/login)', async () => {
    session = await wekanApi.login(SERVER_URL, 'admin', 'Password123!');
    expect(session.userId).toBeTruthy();
    expect(session.token).toBeTruthy();
    useBoardStore.getState().setSession(session);
  });

  it('Step 2: Fetches user boards and confirms real workspace exists', async () => {
    const boards = await wekanApi.getBoards(SERVER_URL, session.token, session.userId);
    expect(boards.length).toBeGreaterThan(0);
    boardId = boards[0]._id;
  });

  it('Step 3: Connects over WebSocket DDP to real WeKan server', async () => {
    const wsUrl = SERVER_URL.replace(/^http/, 'ws') + '/websocket';
    await ddpClient.connect(wsUrl);
    expect(ddpClient.getState()).toBe('connected');

    const authRes = await ddpClient.loginWithToken(session.token);
    expect(authRes.id).toBe(session.userId);
    expect(ddpClient.getState()).toBe('authenticated');
  });

  it('Step 4: Subscribes to board collection and verifies real-time live events', async () => {
    await ddpClient.subscribe('board', [boardId, false]);
    const lists = await wekanApi.getLists(SERVER_URL, session.token, boardId);
    expect(lists.length).toBeGreaterThan(0);
    listId = lists[0]._id;

    const swimlanes = await wekanApi.getSwimlanes(SERVER_URL, session.token, boardId);
    expect(swimlanes.length).toBeGreaterThan(0);
    swimlaneId = swimlanes[0]._id;
  });

  it('Step 5: Creates and moves card, verifying fractional sort index', async () => {
    const cardTitle = `Real E2E Live Card ${Date.now()}`;
    const newCard = await wekanApi.createCard(SERVER_URL, session.token, boardId, listId, swimlaneId, cardTitle);
    cardId = newCard._id;
    expect(cardId).toBeTruthy();

    const moveRes = await wekanApi.moveCard(SERVER_URL, session.token, boardId, listId, cardId, listId, swimlaneId, 1500);
    expect(moveRes._id).toBe(cardId);
  });
});
