import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { githubSync } from '../src/renderer/lib/githubSync';
import { Card } from '../src/renderer/lib/types';

const SERVER_URL = process.env.WEKAN_URL || 'http://localhost';
const ADMIN_USER = process.env.WEKAN_USER || 'admin';
const ADMIN_PASS = process.env.WEKAN_PASS || 'Password123!';

describe('Phase 4 Section 3: GitHub 2-Way Sync Engine & Persistence (Against Real WeKan)', () => {
  let authToken = '';
  let userId = '';
  let boardId = '';
  let listId = '';
  let swimlaneId = '';
  let cardId = '';

  beforeAll(async () => {
    // 1. Authenticate with real WeKan
    const loginRes = await fetch(`${SERVER_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    authToken = loginData.token;
    userId = loginData.id;

    // 2. Create test board
    const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `GitHub Sync Test Workspace ${Date.now()}`,
        owner: userId,
        permission: 'private',
        color: 'midnight',
        isAdmin: true,
        isActive: true,
      }),
    });
    const boardData = await boardRes.json();
    boardId = boardData._id;

    const listRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'To Do' }),
    });
    const listData = await listRes.json();
    listId = listData._id;

    const swimlanesRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/swimlanes`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const swimlanes = await swimlanesRes.json();
    swimlaneId = swimlanes[0]._id;

    const cardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: '#101 Implement JWT session refresh rotation',
        description: 'Initial card created for GitHub sync testing',
        swimlaneId,
      }),
    });
    const cardData = await cardRes.json();
    cardId = cardData._id;
  });

  afterAll(async () => {
    if (boardId) {
      await fetch(`${SERVER_URL}/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
    }
  });

  it('should update card description with GitHub issue link and sync metadata in real WeKan', async () => {
    const updatedDesc = `Implement JWT session refresh rotation\n\n---\n*Synced from GitHub: [Issue #101](https://github.com/wekan/wekan/issues/101)*`;

    const updateRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: '#101 Implement JWT session refresh rotation',
        description: updatedDesc,
      }),
    });
    expect(updateRes.status).toBe(200);

    const getCardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const cardObj = await getCardRes.json();
    expect(cardObj.description).toContain('Synced from GitHub: [Issue #101]');
  });

  it('should format sync payloads and prevent redundant update loops', async () => {
    const card: Card = {
      _id: cardId,
      title: '#101 Implement JWT session refresh rotation',
      boardId,
      listId,
      swimlaneId,
      userId,
      github: {
        repo: 'wekan/wekan',
        issueNumber: 101,
        issueId: 98765432,
        issueUrl: 'https://github.com/wekan/wekan/issues/101',
        state: 'open',
        lastSyncedAt: new Date().toISOString(),
      },
    };

    // If card is in open list and state is already 'open', no API call should be dispatched
    const res = await githubSync.syncOutboundCard('wekan/wekan', 'fake-pat', card, false);
    expect(res).toEqual(card.github);
  });
});
