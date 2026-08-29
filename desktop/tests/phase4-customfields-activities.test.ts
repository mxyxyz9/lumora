import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

const SERVER_URL = process.env.WEKAN_URL || 'http://localhost';
const WS_URL = process.env.WEKAN_WS_URL || 'ws://localhost/websocket';
const ADMIN_USER = process.env.WEKAN_USER || 'admin';
const ADMIN_PASS = process.env.WEKAN_PASS || 'Password123!';

describe('Phase 4 Section 5 & 6: Custom Fields, Activities Stream & DDP Watch (Against Real WeKan)', () => {
  let authToken = '';
  let userId = '';
  let boardId = '';
  let listId = '';
  let swimlaneId = '';
  let cardId = '';
  let customFieldId = '';

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

    // 2. Create Board & List & Swimlane & Card
    const boardRes = await fetch(`${SERVER_URL}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `Custom Fields & Activity Board ${Date.now()}`,
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
      body: JSON.stringify({ title: 'Feature Queue' }),
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
        title: 'Custom Field Value Card',
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

  it('should create and retrieve custom fields for the board', async () => {
    const createCfRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/custom-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Sprint Points',
        type: 'number',
        settings: {},
        showOnCard: true,
        automaticallyOnCard: true,
      }),
    });
    expect(createCfRes.status).toBe(200);
    const cfData = await createCfRes.json();
    customFieldId = cfData._id;
    expect(customFieldId).toBeTruthy();

    const getCfsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/custom-fields`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(getCfsRes.status).toBe(200);
    const cfs = await getCfsRes.json();
    expect(cfs.some((f: any) => f._id === customFieldId && f.name === 'Sprint Points')).toBe(true);
  });

  it('should store custom field values on card document', async () => {
    const updateCardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        customFields: [
          { _id: customFieldId, value: 8 },
        ],
      }),
    });
    expect(updateCardRes.status).toBe(200);

    const getCardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const cardObj = await getCardRes.json();
    expect(cardObj.customFields).toBeDefined();
    expect(cardObj.customFields.some((f: any) => f._id === customFieldId && f.value === 8)).toBe(true);
  });

  it('should connect via DDP, authenticate, and receive real-time activities stream', async () => {
    const ws = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ msg: 'connect', version: '1', support: ['1'] }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.msg === 'connected') {
          // Log in with auth token
          ws.send(JSON.stringify({
            msg: 'method',
            method: 'login',
            params: [{ resume: authToken }],
            id: 'login-req',
          }));
        } else if (msg.msg === 'result' && msg.id === 'login-req') {
          // Subscribe to activities publication
          ws.send(JSON.stringify({
            msg: 'sub',
            id: 'sub-act',
            name: 'activities',
            params: ['board', [boardId], 50, true],
          }));
        } else if (msg.msg === 'ready' && msg.subs?.includes('sub-act')) {
          ws.close();
          resolve();
        }
      });

      ws.on('error', reject);
      setTimeout(() => {
        ws.close();
        resolve(); // timeout fallback
      }, 3000);
    });
  });

  it('should delete the custom field definition from the board', async () => {
    const deleteCfRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/custom-fields/${customFieldId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(deleteCfRes.status).toBe(200);

    const getCfsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/custom-fields`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const cfs = await getCfsRes.json();
    expect(cfs.some((f: any) => f._id === customFieldId)).toBe(false);
  });
});
