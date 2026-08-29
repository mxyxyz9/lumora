import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMockWekanServer } from '../test-server/mockWekanServer';
import { wekanApi } from '../src/renderer/lib/wekanApi';
import { ddpClient } from '../src/renderer/lib/ddpClient';
import { WebSocket } from 'ws';

if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

describe('Mock WeKan DDP Sync Verification', () => {
  let server: any = null;
  let serverUrl = '';

  beforeAll(async () => {
    server = await createMockWekanServer(0);
    serverUrl = server.url;
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  it('authenticates and receives DDP frames correctly', async () => {
    const session = await wekanApi.login(serverUrl, 'admin', 'password123');
    expect(session.userId).toBe('user-1');
    expect(session.token).toBeTruthy();

    await ddpClient.connect(server.url);
    expect(ddpClient.getState()).toBe('connected');

    const authRes = await ddpClient.loginWithToken(session.token);
    expect(authRes.id).toBe('user-1');
    expect(ddpClient.getState()).toBe('authenticated');
  });
});
