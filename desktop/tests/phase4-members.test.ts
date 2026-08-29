import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const SERVER_URL = process.env.WEKAN_URL || 'http://localhost';
const ADMIN_USER = process.env.WEKAN_USER || 'admin';
const ADMIN_PASS = process.env.WEKAN_PASS || 'Password123!';

describe('Phase 4 Section 2: Team & Member Management (Against Real WeKan)', () => {
  let authToken = '';
  let userId = '';
  let boardId = '';
  let listId = '';
  let swimlaneId = '';
  let cardId = '';
  let secondaryUserId = '';

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

    // 2. Create a dedicated test board
    const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `Team Management Workspace ${Date.now()}`,
        owner: userId,
        permission: 'private',
        color: 'midnight',
        isAdmin: true,
        isActive: true,
      }),
    });
    const boardData = await boardRes.json();
    boardId = boardData._id;

    // 3. Create List & Card
    const listRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Tasks' }),
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
        title: 'Team Role Assignment Task',
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

  it('should list board members including the owner admin', async () => {
    const boardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const board = await boardRes.json();
    expect(board.members).toBeDefined();
    expect(board.members.some((m: any) => m.userId === userId && m.isAdmin === true)).toBe(true);
  });

  it('should assign members and assignees to a card and persist to database', async () => {
    const updateCardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        assignees: [userId],
        members: [userId],
      }),
    });
    expect(updateCardRes.status).toBe(200);

    const getCardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const cardObj = await getCardRes.json();
    expect(cardObj.assignees).toContain(userId);
    expect(cardObj.members).toContain(userId);
  });

  it('should update member permission flags on the board', async () => {
    const addRoleRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/members/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        action: 'add',
        isAdmin: true,
        isActive: true,
      }),
    });
    expect(addRoleRes.status).toBe(200);
  });
});
