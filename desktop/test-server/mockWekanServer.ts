import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface MockServerInstance {
  server: http.Server;
  wss: WebSocketServer;
  port: number;
  url: string;
  close: () => Promise<void>;
  simulateRemoteCardMove: (cardId: string, newListId: string, newSort: number) => void;
  simulateRemoteCardInsert: (card: any) => void;
}

export function createMockWekanServer(port = 0): Promise<MockServerInstance> {
  return new Promise((resolve, reject) => {
    // In-memory data store
    const boards = [
      {
        _id: 'board-1',
        title: 'Engineering Sprint Board',
        slug: 'engineering-sprint-board',
        permission: 'private',
        labels: [
          { _id: 'label-1', name: 'Bug', color: '#ef4444' },
          { _id: 'label-2', name: 'Feature', color: '#3b82f6' },
          { _id: 'label-3', name: 'Security', color: '#10b981' },
        ],
        members: [{ userId: 'user-1', isAdmin: true, isActive: true }],
      },
    ];

    const lists = [
      { _id: 'list-1', boardId: 'board-1', title: 'To Do', sort: 0, archived: false },
      { _id: 'list-2', boardId: 'board-1', title: 'In Progress', sort: 1, archived: false },
      { _id: 'list-3', boardId: 'board-1', title: 'Done', sort: 2, archived: false },
    ];

    const swimlanes = [
      { _id: 'swimlane-1', boardId: 'board-1', title: 'Default', sort: 0, archived: false },
    ];

    let cards = [
      {
        _id: 'card-1',
        boardId: 'board-1',
        swimlaneId: 'swimlane-1',
        listId: 'list-1',
        title: 'Refactor DDP WebSocket subscription client',
        description: 'Ensure clean reconnection and state synchronization',
        sort: 0,
        archived: false,
        labelIds: ['label-2'],
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        assignees: ['user-1'],
      },
      {
        _id: 'card-2',
        boardId: 'board-1',
        swimlaneId: 'swimlane-1',
        listId: 'list-1',
        title: 'Fix directConnection replica set handshake',
        description: 'Resolve issue #6582 on FerretDB SQLite',
        sort: 1,
        archived: false,
        labelIds: ['label-1', 'label-3'],
        dueAt: new Date(Date.now() - 3600000).toISOString(),
        assignees: ['user-1'],
      },
      {
        _id: 'card-3',
        boardId: 'board-1',
        swimlaneId: 'swimlane-1',
        listId: 'list-2',
        title: 'Integrate Pragmatic Drag and Drop in React 19',
        description: 'Support smooth list and intra-list reordering',
        sort: 0,
        archived: false,
        labelIds: ['label-2'],
        assignees: ['user-1'],
      },
    ];

    const validTokens = new Set(['mock_token_secret_123']);

    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = req.url || '';
      const method = req.method || 'GET';

      const readBody = (): Promise<any> => {
        return new Promise(resBody => {
          let body = '';
          req.on('data', chunk => (body += chunk));
          req.on('end', () => {
            try {
              resBody(body ? JSON.parse(body) : {});
            } catch (_) {
              resBody({});
            }
          });
        });
      };

      // 1. POST /users/login
      if (method === 'POST' && url === '/users/login') {
        const body = await readBody();
        if ((body.username === 'admin' || body.email === 'admin@wekan.local') && body.password === 'password123') {
          const token = 'mock_token_secret_123';
          validTokens.add(token);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'user-1',
              token,
              tokenExpires: new Date(Date.now() + 90 * 86400000).toISOString(),
            })
          );
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'login-failed', reason: 'Incorrect username or password.' }));
        }
        return;
      }

      // Auth check for /api/...
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token || !validTokens.has(token)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // 2. GET /api/boards
      if (method === 'GET' && url === '/api/boards') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(boards));
        return;
      }

      // 3. GET /api/boards/:boardId
      const boardMatch = url.match(/^\/api\/boards\/([a-zA-Z0-9_-]+)$/);
      if (method === 'GET' && boardMatch) {
        const b = boards.find(x => x._id === boardMatch[1]);
        if (b) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(b));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Board not found' }));
        }
        return;
      }

      // 4. GET /api/boards/:boardId/lists
      const listsMatch = url.match(/^\/api\/boards\/([a-zA-Z0-9_-]+)\/lists$/);
      if (method === 'GET' && listsMatch) {
        const listRes = lists.filter(x => x.boardId === listsMatch[1]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(listRes));
        return;
      }

      // 5. GET /api/boards/:boardId/swimlanes
      const swimMatch = url.match(/^\/api\/boards\/([a-zA-Z0-9_-]+)\/swimlanes$/);
      if (method === 'GET' && swimMatch) {
        const swimRes = swimlanes.filter(x => x.boardId === swimMatch[1]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(swimRes));
        return;
      }

      // 6. GET /api/boards/:boardId/lists/:listId/cards
      const cardsMatch = url.match(/^\/api\/boards\/([a-zA-Z0-9_-]+)\/lists\/([a-zA-Z0-9_-]+)\/cards$/);
      if (method === 'GET' && cardsMatch) {
        const cardRes = cards.filter(x => x.boardId === cardsMatch[1] && x.listId === cardsMatch[2]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cardRes));
        return;
      }

      // 7. PUT /api/boards/:boardId/lists/:listId/cards/:cardId
      const updateCardMatch = url.match(/^\/api\/boards\/([a-zA-Z0-9_-]+)\/lists\/([a-zA-Z0-9_-]+)\/cards\/([a-zA-Z0-9_-]+)$/);
      if (method === 'PUT' && updateCardMatch) {
        const body = await readBody();
        const cardId = updateCardMatch[3];
        const cardIndex = cards.findIndex(c => c._id === cardId);
        if (cardIndex !== -1) {
          const updated = {
            ...cards[cardIndex],
            ...(body.listId ? { listId: body.listId } : {}),
            ...(body.sort !== undefined ? { sort: body.sort } : {}),
            ...(body.swimlaneId ? { swimlaneId: body.swimlaneId } : {}),
            ...(body.title ? { title: body.title } : {}),
          };
          cards[cardIndex] = updated;

          // Broadcast DDP 'changed' frame to all subscribers!
          broadcastDDP({
            msg: 'changed',
            collection: 'cards',
            id: cardId,
            fields: {
              listId: updated.listId,
              sort: updated.sort,
              swimlaneId: updated.swimlaneId,
              title: updated.title,
            },
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ _id: cardId }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Card not found' }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    // WebSocket DDP Server
    const wss = new WebSocketServer({ server, path: '/websocket' });
    const clients: Set<WebSocket> = new Set();

    function broadcastDDP(msg: object) {
      const data = JSON.stringify(msg);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    }

    wss.on('connection', ws => {
      clients.add(ws);

      ws.on('message', raw => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch (_) {
          return;
        }

        switch (msg.msg) {
          case 'connect':
            ws.send(JSON.stringify({ msg: 'connected', session: 'mock_session_456' }));
            break;

          case 'ping':
            ws.send(JSON.stringify({ msg: 'pong', ...(msg.id ? { id: msg.id } : {}) }));
            break;

          case 'method':
            if (msg.method === 'login') {
              ws.send(JSON.stringify({ msg: 'result', id: msg.id, result: { id: 'user-1', token: 'mock_token_secret_123' } }));
            } else {
              ws.send(JSON.stringify({ msg: 'result', id: msg.id, result: {} }));
            }
            break;

          case 'sub':
            if (msg.name === 'board') {
              const boardId = msg.params && msg.params[0];
              // Send initial board
              const b = boards.find(x => x._id === boardId);
              if (b) {
                ws.send(JSON.stringify({ msg: 'added', collection: 'boards', id: b._id, fields: b }));
              }
              // Send lists
              for (const l of lists.filter(x => x.boardId === boardId)) {
                ws.send(JSON.stringify({ msg: 'added', collection: 'lists', id: l._id, fields: l }));
              }
              // Send swimlanes
              for (const s of swimlanes.filter(x => x.boardId === boardId)) {
                ws.send(JSON.stringify({ msg: 'added', collection: 'swimlanes', id: s._id, fields: s }));
              }
              // Send cards
              for (const c of cards.filter(x => x.boardId === boardId)) {
                ws.send(JSON.stringify({ msg: 'added', collection: 'cards', id: c._id, fields: c }));
              }
              // Send ready
              ws.send(JSON.stringify({ msg: 'ready', subs: [msg.id] }));
            }
            break;
        }
      });

      ws.on('close', () => {
        clients.delete(ws);
      });
    });

    server.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const url = `http://localhost:${actualPort}`;

      resolve({
        server,
        wss,
        port: actualPort,
        url,
        close: () => {
          return new Promise(resClose => {
            wss.clients.forEach(c => {
              try { c.terminate(); } catch (_) {}
            });
            wss.close(() => {
              if (typeof (server as any).closeAllConnections === 'function') {
                (server as any).closeAllConnections();
              }
              server.close(() => resClose());
            });
          });
        },
        simulateRemoteCardMove: (cardId: string, newListId: string, newSort: number) => {
          const cIndex = cards.findIndex(c => c._id === cardId);
          if (cIndex !== -1) {
            cards[cIndex].listId = newListId;
            cards[cIndex].sort = newSort;
            broadcastDDP({
              msg: 'changed',
              collection: 'cards',
              id: cardId,
              fields: { listId: newListId, sort: newSort },
            });
          }
        },
        simulateRemoteCardInsert: (newCard: any) => {
          cards.push(newCard);
          broadcastDDP({
            msg: 'added',
            collection: 'cards',
            id: newCard._id,
            fields: newCard,
          });
        },
      });
    });

    server.on('error', reject);
  });
}
