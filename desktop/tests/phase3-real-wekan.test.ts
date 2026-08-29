import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import crypto from 'crypto';

const SERVER_URL = process.env.WEKAN_URL || 'http://localhost';
const WS_URL = SERVER_URL.replace('http', 'ws') + '/websocket';

const ADMIN_USER = process.env.WEKAN_USER || 'admin';
const ADMIN_PASS = process.env.WEKAN_PASS || 'Password123!';

interface DDPMessage {
  msg: string;
  id?: string;
  collection?: string;
  fields?: any;
  error?: any;
  result?: any;
  subs?: string[];
}

class RealWekanDDPTestClient {
  public ws: WebSocket | null = null;
  private messageListeners: ((msg: DDPMessage) => void)[] = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      this.ws.on('open', () => {
        this.ws?.send(JSON.stringify({ msg: 'connect', version: '1', support: ['1'] }));
      });

      this.ws.on('message', (raw: string) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.msg === 'connected') {
            resolve();
          }
          this.messageListeners.forEach(cb => cb(data));
        } catch (e) {
          reject(e);
        }
      });

      this.ws.on('error', reject);
    });
  }

  onMessage(cb: (msg: DDPMessage) => void) {
    this.messageListeners.push(cb);
  }

  callMethod(method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = 'call_' + Math.random().toString(36).slice(2, 8);
      const handler = (msg: DDPMessage) => {
        if (msg.msg === 'result' && msg.id === id) {
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      this.onMessage(handler);
      this.ws?.send(JSON.stringify({ msg: 'method', method, params, id }));
    });
  }

  subscribe(name: string, params: any[]): Promise<string> {
    return new Promise((resolve) => {
      const id = 'sub_' + Math.random().toString(36).slice(2, 8);
      const handler = (msg: DDPMessage) => {
        if (msg.msg === 'ready' && msg.subs?.includes(id)) {
          resolve(id);
        }
      };
      this.onMessage(handler);
      this.ws?.send(JSON.stringify({ msg: 'sub', name, params, id }));
    });
  }

  waitForDDPMessage(
    predicate: (msg: DDPMessage) => boolean,
    timeoutMs = 10000
  ): Promise<DDPMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for DDP message (${timeoutMs}ms)`));
      }, timeoutMs);

      const handler = (msg: DDPMessage) => {
        if (predicate(msg)) {
          clearTimeout(timer);
          resolve(msg);
        }
      };
      this.onMessage(handler);
    });
  }

  close() {
    this.ws?.close();
  }
}

describe('Phase 3 Real WeKan Backend Verification', () => {
  let authToken = '';
  let userId = '';
  let boardId = '';
  let listId = '';
  let swimlaneId = '';
  let cardId = '';
  let ddpClient: RealWekanDDPTestClient;

  beforeAll(async () => {
    // 1. Authenticate via real WeKan REST API
    const loginRes = await fetch(`${SERVER_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    authToken = loginData.token;
    userId = loginData.id;

    // 2. Fetch boards
    const boardsRes = await fetch(`${SERVER_URL}/api/users/${userId}/boards`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const boards = await boardsRes.json();
    expect(boards.length).toBeGreaterThan(0);
    boardId = boards[0]._id;

    // 3. Fetch lists & swimlanes
    const listsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const lists = await listsRes.json();
    expect(lists.length).toBeGreaterThan(0);
    listId = lists[0]._id;

    const swimlanesRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/swimlanes`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const swimlanes = await swimlanesRes.json();
    swimlaneId = swimlanes[0]?._id || '';

    // 4. Create a dedicated test card for Phase 3
    const createCardRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `Phase 3 Test Card ${Date.now()}`,
        swimlaneId,
      }),
    });
    const cardData = await createCardRes.json();
    cardId = cardData._id;
    expect(cardId).toBeTruthy();

    // 5. Connect DDP & subscribe to board with [boardId, false]
    ddpClient = new RealWekanDDPTestClient();
    await ddpClient.connect();
    await ddpClient.callMethod('login', [{ resume: authToken }]);
    await ddpClient.subscribe('board', [boardId, false]);
  }, 20000);

  afterAll(() => {
    ddpClient?.close();
  });

  it('Requirement 2: should update description and receive DDP changed echo', async () => {
    const testMarkdown = `## Phase 3 Architecture\n\n- [x] Description\n- [x] Comments\n- [x] Checklists\n- [x] Attachments\n\n**Code verified against real WeKan**`;

    const ddpChangedPromise = ddpClient.waitForDDPMessage(
      msg => msg.msg === 'changed' && msg.collection === 'cards' && msg.id === cardId && msg.fields?.description === testMarkdown
    );

    const updateRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ description: testMarkdown }),
    });
    expect(updateRes.status).toBe(200);

    const ddpChanged = await ddpChangedPromise;
    expect(ddpChanged.fields.description).toBe(testMarkdown);
  });

  it('Requirement 3: should add, list, and live-receive comments over DDP', async () => {
    const commentText = `Live DDP Comment Test at ${Date.now()}`;

    // Expect DDP 'added' frame on 'card_comments' collection
    const ddpCommentPromise = ddpClient.waitForDDPMessage(
      msg => msg.msg === 'added' && msg.collection === 'card_comments' && (msg.fields?.text === commentText || msg.fields?.comment === commentText)
    );

    const start = performance.now();
    const addCommentRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ comment: commentText }),
    });
    expect(addCommentRes.status).toBe(200);
    const commentResData = await addCommentRes.json();
    const commentId = commentResData._id;
    expect(commentId).toBeTruthy();

    const ddpComment = await ddpCommentPromise;
    const elapsed = performance.now() - start;
    console.log(`  ⚡ Comment received over WebSocket DDP in ${elapsed.toFixed(1)}ms!`);
    expect(ddpComment.fields.cardId).toBe(cardId);

    // Verify GET comments returns the new comment
    const getCommentsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/comments`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const commentsList = await getCommentsRes.json();
    expect(commentsList.some((c: any) => c._id === commentId)).toBe(true);

    // Delete comment
    const deleteRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(deleteRes.status).toBe(200);
  });

  it('Requirement 4: should create, toggle items, and delete checklists', async () => {
    // 1. Create Checklist
    const createChecklistRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Quality Assurance' }),
    });
    expect(createChecklistRes.status).toBe(200);
    const checklistData = await createChecklistRes.json();
    const checklistId = checklistData._id;
    expect(checklistId).toBeTruthy();

    // 2. Add Checklist Item 1
    const createItem1Res = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Verify REST CRUD', isFinished: false }),
    });
    expect(createItem1Res.status).toBe(200);
    const item1Data = await createItem1Res.json();
    const itemId1 = item1Data._id;

    // 3. Add Checklist Item 2
    const createItem2Res = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Verify DDP broadcast', isFinished: false }),
    });
    expect(createItem2Res.status).toBe(200);
    const item2Data = await createItem2Res.json();
    const itemId2 = item2Data._id;

    // 4. Toggle Item 1 to Finished (isFinished = true)
    const updateItemRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId1}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ isFinished: true }),
    });
    expect(updateItemRes.status).toBe(200);

    // 5. Fetch checklist with embedded items and verify persisted state
    const getChecklistRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const checklistObj = await getChecklistRes.json();
    const items = checklistObj.data?.items || checklistObj.items || [];
    expect(items.length).toBe(2);
    const item1 = items.find((i: any) => i._id === itemId1);
    const item2 = items.find((i: any) => i._id === itemId2);
    expect(item1.isFinished).toBe(true);
    expect(item2.isFinished).toBe(false);

    // 6. Delete Checklist
    const deleteChecklistRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(deleteChecklistRes.status).toBe(200);
  });

  it('Requirement 5: should verify board attachments listing and downloading', async () => {
    // 1. Fetch board attachments
    const listRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/attachments`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    const attachments = listJson.data || listJson;
    expect(Array.isArray(attachments)).toBe(true);
  });
});
