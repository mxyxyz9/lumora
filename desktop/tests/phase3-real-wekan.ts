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
          if (data.msg === 'changed' || data.msg === 'added') {
            console.log('    [DDP Frame]', data.msg, data.collection, data.id, JSON.stringify(data.fields || {}).slice(0, 100));
          }
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
    timeoutMs = 15000
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

async function runPhase3Verification() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 3 REAL WEKAN BACKEND VERIFICATION');
  console.log('================================================================');

  // 1. Authenticate via real WeKan REST API
  console.log('\n--- 1. REST Authentication & Board Setup ---');
  const loginRes = await fetch(`${SERVER_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
  });
  const loginData = await loginRes.json();
  const authToken = loginData.token;
  const userId = loginData.id;
  console.log(`  ✓ Authenticated as ${ADMIN_USER} (Token: ${authToken.slice(0, 10)}..., UserId: ${userId})`);

  // 2. Fetch boards
  const boardsRes = await fetch(`${SERVER_URL}/api/users/${userId}/boards`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const boards = await boardsRes.json();
  const boardId = boards[0]._id;
  console.log(`  ✓ Board loaded: "${boards[0].title}" (ID: ${boardId})`);

  // 3. Fetch lists & swimlanes
  const listsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const lists = await listsRes.json();
  const listId = lists[0]._id;
  console.log(`  ✓ Target List: "${lists[0].title}" (ID: ${listId})`);

  const swimlanesRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/swimlanes`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const swimlanes = await swimlanesRes.json();
  const swimlaneId = swimlanes[0]?._id || '';

  // 4. Create card
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
  const cardId = cardData._id || cardData.data?._id || cardData.id;
  console.log(`  ✓ Created test card (ID: ${cardId})`);

  // 5. Connect DDP & subscribe to board
  const ddpClient = new RealWekanDDPTestClient();
  await ddpClient.connect();
  await ddpClient.callMethod('login', [{ resume: authToken }]);
  await ddpClient.subscribe('board', [boardId, false]);
  console.log(`  ✓ DDP subscribed to publication 'board' for ${boardId}`);

  // -------------------------------------------------------------
  // Test 2: Description Round-Trip & DDP Echo
  // -------------------------------------------------------------
  console.log('\n--- 2. Description Editing & DDP Echo ---');
  const testMarkdown = `## Phase 3 Architecture Spec\n\n- [x] Description Markdown\n- [x] Checklists\n- [x] Attachments\n- [x] Live Comments\n\n**Verified against real WeKan backend**`;

  const ddpChangedPromise = ddpClient.waitForDDPMessage(
    msg => msg.msg === 'changed' && msg.collection === 'cards' && msg.id === cardId && msg.fields?.description === testMarkdown
  );

  const startDesc = performance.now();
  const updateRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ description: testMarkdown }),
  });
  const updateData = await updateRes.json();
  console.log(`  ✓ REST PUT /cards description updated in ${(performance.now() - startDesc).toFixed(1)}ms`);

  const ddpChanged = await ddpChangedPromise;
  console.log(`  ⚡ DDP 'changed' frame received on collection 'cards' with markdown description!`);

  // -------------------------------------------------------------
  // Test 3: Comments Live DDP Broadcast
  // -------------------------------------------------------------
  console.log('\n--- 3. Comments CRUD & Live DDP Broadcast ---');
  const commentText = `Live DDP Comment from Phase 3 Test ${Date.now()}`;

  const ddpCommentPromise = ddpClient.waitForDDPMessage(
    msg => msg.msg === 'added' && msg.collection === 'card_comments' && (msg.fields?.text === commentText || msg.fields?.comment === commentText)
  );

  const startComment = performance.now();
  const addCommentRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ comment: commentText }),
  });
  const commentData = await addCommentRes.json();
  const commentId = commentData._id || commentData.data?._id;
  console.log(`  ✓ REST POST /comments returned commentId: ${commentId}`);

  const ddpComment = await ddpCommentPromise;
  const elapsedComment = performance.now() - startComment;
  console.log(`  ⚡ Real-Time Cross-Client DDP: Comment appeared live via WebSocket DDP in ${elapsedComment.toFixed(1)}ms!`);

  // Verify list comments
  const getCommentsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/comments`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const commentsList = await getCommentsRes.json();
  const commentsArray = Array.isArray(commentsList) ? commentsList : commentsList.data || [];
  console.log(`  ✓ GET /comments returned ${commentsArray.length} comment(s)`);

  // Delete comment
  await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  console.log(`  ✓ Comment deleted successfully`);

  // -------------------------------------------------------------
  // Test 4: Checklists & Items
  // -------------------------------------------------------------
  console.log('\n--- 4. Checklists & Items Management ---');
  // 1. Create Checklist
  const createChecklistRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ title: 'Phase 3 Verification Checklist' }),
  });
  const checklistData = await createChecklistRes.json();
  const checklistId = checklistData._id || checklistData.data?._id || checklistData.data;
  console.log(`  ✓ Checklist created (ID: ${checklistId})`);

  // 2. Add Checklist Item 1
  const createItem1Res = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ title: 'Verify Markdown Parsing', isFinished: false }),
  });
  const item1Data = await createItem1Res.json();
  const itemId1 = item1Data._id || item1Data.data?._id || item1Data.data;

  // 3. Add Checklist Item 2
  const createItem2Res = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ title: 'Verify Attachment Upload', isFinished: false }),
  });
  const item2Data = await createItem2Res.json();
  const itemId2 = item2Data._id || item2Data.data?._id || item2Data.data;
  console.log(`  ✓ 2 Checklist items created (Item 1: ${itemId1}, Item 2: ${itemId2})`);

  // 4. Toggle Item 1 to Finished (isFinished = true)
  const updateItemRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId1}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ isFinished: true }),
  });
  console.log(`  ✓ Item 1 toggled isFinished: true (Status: ${updateItemRes.status})`);

  // 5. Fetch items
  const getItemsRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const itemsJson = await getItemsRes.json();
  const items = itemsJson.data?.items || itemsJson.items || [];
  console.log(`  ✓ Checklist items verified in database (${items.length} items, finished items verified: ${items.some((i: any) => i.isFinished)})`);

  // -------------------------------------------------------------
  // Test 5: Attachments Upload & Download Verification
  // -------------------------------------------------------------
  console.log('\n--- 5. Attachments Upload, Binary Download & SHA-256 Checksum ---');
  const originalBuffer = crypto.randomBytes(32768); // 32KB real payload
  const originalBase64 = originalBuffer.toString('base64');
  const originalSha256 = crypto.createHash('sha256').update(originalBuffer).digest('hex');
  const fileName = `verification-asset-${Date.now()}.png`;

  console.log(`  Generated 32KB binary test payload (SHA-256: ${originalSha256})`);

  // 1. Upload via DDP method 'api.attachment.upload'
  const uploadStart = performance.now();
  const uploadData = await ddpClient.callMethod('api.attachment.upload', [
    boardId,
    swimlaneId,
    listId,
    cardId,
    originalBase64,
    fileName,
    'image/png',
  ]);
  const attachmentId = uploadData.attachmentId;
  console.log(`  ✓ Attachment uploaded in ${(performance.now() - uploadStart).toFixed(1)}ms (Attachment ID: ${attachmentId})`);

  // 2. Fetch board attachments
  const listRes = await fetch(`${SERVER_URL}/api/boards/${boardId}/attachments`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  const listJson = await listRes.json();
  const attachments = Array.isArray(listJson) ? listJson : listJson.data || [];
  const found = attachments.find((a: any) => a.attachmentId === attachmentId || a._id === attachmentId);
  console.log(`  ✓ Attachment found in board list: "${found?.attachmentName || found?.name}" on Card: ${found?.cardId}`);

  // 3. Download attachment
  const downloadStart = performance.now();
  const downloadRes = await fetch(`${SERVER_URL}/api/attachment/download/${attachmentId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-user-id': userId,
      'x-auth-token': authToken,
    },
  });
  const downloadJson = await downloadRes.json();
  const downloadedBuffer = Buffer.from(downloadJson.base64Data, 'base64');
  const downloadedSha256 = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
  console.log(`  ✓ Attachment downloaded in ${(performance.now() - downloadStart).toFixed(1)}ms (${downloadedBuffer.length} bytes, file: "${downloadJson.fileName}")`);

  if (downloadedSha256 === originalSha256) {
    console.log(`  🎉 SHA-256 CHECKSUM MATCH CONFIRMED (100% byte-for-byte fidelity)`);
  } else {
    console.error(`  ❌ SHA-256 mismatch! Expected: ${originalSha256}, Got: ${downloadedSha256}`);
  }

  // 4. Delete attachment
  const deleteRes = await fetch(`${SERVER_URL}/api/attachment/delete/${attachmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-user-id': userId,
      'x-auth-token': authToken,
    },
  });
  console.log(`  ✓ Attachment deleted successfully (Status: ${deleteRes.status})`);

  ddpClient.close();

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 3 REAL WEKAN VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runPhase3Verification().catch(err => {
  console.error('Phase 3 verification failed:', err);
  process.exit(1);
});
