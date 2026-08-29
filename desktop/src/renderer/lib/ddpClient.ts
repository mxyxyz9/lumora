import { DDPConnectionState } from './types';

export interface DDPMessageHandlers {
  onAdded?: (collection: string, id: string, fields: Record<string, any>) => void;
  onChanged?: (collection: string, id: string, fields: Record<string, any>, cleared?: string[]) => void;
  onRemoved?: (collection: string, id: string) => void;
  onReady?: (subs: string[]) => void;
  onStatusChange?: (state: DDPConnectionState) => void;
  onError?: (error: Error) => void;
}

type EventListener = (...args: any[]) => void;

export class DdpClient {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private token: string | null = null;
  private activeBoardId: string | null = null;
  private currentSubId: string | null = null;
  private state: DDPConnectionState = 'disconnected';
  private handlers: DDPMessageHandlers = {};
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private nextMethodId: number = 1;
  private nextSubId: number = 1;
  private pendingMethods: Map<string, { resolve: (result: any) => void; reject: (err: any) => void }> = new Map();
  private pendingSubs: Map<string, { resolve: (subId: string) => void; reject: (err: any) => void }> = new Map();
  private reconnectTimer: any = null;
  private pingIntervalTimer: any = null;
  private reconnectAttempts: number = 0;
  private isExplicitlyClosed: boolean = false;

  constructor(handlers: DDPMessageHandlers = {}) {
    this.handlers = handlers;
  }

  public setHandlers(handlers: DDPMessageHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public on(event: 'added' | 'changed' | 'removed' | 'ready' | 'status', listener: EventListener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  public off(event: string, listener: EventListener) {
    this.eventListeners.get(event)?.delete(listener);
  }

  public onStateChange(listener: (state: DDPConnectionState) => void) {
    this.on('status', listener);
  }

  private emit(event: string, ...args: any[]) {
    this.eventListeners.get(event)?.forEach(fn => {
      try {
        fn(...args);
      } catch (e) {
        console.error(`Error in DDP listener for ${event}:`, e);
      }
    });
  }

  private setState(newState: DDPConnectionState) {
    this.state = newState;
    this.handlers.onStatusChange?.(newState);
    this.emit('status', newState);
  }

  public getState(): DDPConnectionState {
    return this.state;
  }

  private toWebSocketUrl(httpUrl: string): string {
    let clean = httpUrl.trim().replace(/\/+$/, '');
    if (clean.startsWith('https://')) {
      clean = 'wss://' + clean.slice(8);
    } else if (clean.startsWith('http://')) {
      clean = 'ws://' + clean.slice(7);
    } else if (!clean.startsWith('ws://') && !clean.startsWith('wss://')) {
      clean = 'ws://' + clean;
    }
    if (!clean.endsWith('/websocket')) {
      clean = `${clean}/websocket`;
    }
    return clean;
  }

  public connect(serverUrl: string, token?: string, boardId?: string): Promise<void> {
    this.serverUrl = serverUrl;
    if (token) this.token = token;
    if (boardId) this.activeBoardId = boardId;
    this.isExplicitlyClosed = false;

    return new Promise((resolve, reject) => {
      const onConnect = (s: DDPConnectionState) => {
        if (s === 'connected' || s === 'authenticated') {
          resolve();
        } else if (s === 'error') {
          reject(new Error('Failed to connect to DDP server'));
        }
      };
      this.on('status', onConnect);
      this.initSocket();
    });
  }

  private initSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const wsUrl = this.toWebSocketUrl(this.serverUrl);
    this.setState('connecting');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.sendConnectHandshake();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleRawMessage(event.data);
      };

      this.ws.onerror = (event: Event) => {
        const error = new Error('DDP WebSocket error');
        this.handlers.onError?.(error);
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          this.setState('disconnected');
          this.scheduleReconnect();
        }
      };
    } catch (err: any) {
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  private sendConnectHandshake() {
    this.send({
      msg: 'connect',
      version: '1',
      support: ['1', 'pre2', 'pre1'],
    });
  }

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleRawMessage(rawData: string) {
    let msg: any;
    try {
      msg = JSON.parse(rawData);
    } catch (e) {
      return;
    }

    switch (msg.msg) {
      case 'connected':
        this.setState('connected');
        if (this.token) {
          this.authenticate(this.token);
        } else if (this.activeBoardId) {
          this.subscribeToBoard(this.activeBoardId);
        }
        break;

      case 'ping':
        this.send({ msg: 'pong', ...(msg.id ? { id: msg.id } : {}) });
        break;

      case 'pong':
        break;

      case 'result':
        if (msg.id && this.pendingMethods.has(msg.id)) {
          const { resolve, reject } = this.pendingMethods.get(msg.id)!;
          this.pendingMethods.delete(msg.id);
          if (msg.error) {
            reject(msg.error);
          } else {
            resolve(msg.result);
          }
        }
        break;

      case 'added':
        if (msg.collection && msg.id) {
          this.handlers.onAdded?.(msg.collection, msg.id, msg.fields || {});
          this.emit('added', msg.collection, msg.id, msg.fields || {});
        }
        break;

      case 'changed':
        if (msg.collection && msg.id) {
          this.handlers.onChanged?.(msg.collection, msg.id, msg.fields || {}, msg.cleared || []);
          this.emit('changed', msg.collection, msg.id, msg.fields || {}, msg.cleared || []);
        }
        break;

      case 'removed':
        if (msg.collection && msg.id) {
          this.handlers.onRemoved?.(msg.collection, msg.id);
          this.emit('removed', msg.collection, msg.id);
        }
        break;

      case 'ready':
        if (Array.isArray(msg.subs)) {
          this.setState('subscribed');
          this.handlers.onReady?.(msg.subs);
          this.emit('ready', msg.subs);
          msg.subs.forEach((subId: string) => {
            if (this.pendingSubs.has(subId)) {
              this.pendingSubs.get(subId)!.resolve(subId);
              this.pendingSubs.delete(subId);
            }
          });
        }
        break;

      case 'nosub':
        if (msg.id && this.pendingSubs.has(msg.id)) {
          this.pendingSubs.get(msg.id)!.reject(msg.error || new Error('Subscription refused'));
          this.pendingSubs.delete(msg.id);
        }
        break;

      case 'failed':
        console.error('[DDP] Server rejected protocol version:', msg.version);
        this.setState('error');
        break;
    }
  }

  public async authenticate(token: string): Promise<any> {
    this.token = token;
    try {
      const res = await this.call('login', [{ resume: token }]);
      this.setState('authenticated');
      if (this.activeBoardId) {
        this.subscribeToBoard(this.activeBoardId);
      }
      return res;
    } catch (err: any) {
      if (this.activeBoardId) {
        this.subscribeToBoard(this.activeBoardId);
      }
      throw err;
    }
  }

  public loginWithToken(token: string): Promise<any> {
    return this.authenticate(token);
  }

  public subscribe(name: string, params: any[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const subId = `sub_${name}_${this.nextSubId++}_${Date.now()}`;
      this.pendingSubs.set(subId, { resolve, reject });
      this.send({
        msg: 'sub',
        id: subId,
        name,
        params,
      });

      // 10s timeout
      setTimeout(() => {
        if (this.pendingSubs.has(subId)) {
          this.pendingSubs.delete(subId);
          resolve(subId); // resolve optimistically if ready frame omitted
        }
      }, 10000);
    });
  }

  public subscribeToBoard(boardId: string) {
    this.activeBoardId = boardId;
    if (this.state === 'disconnected' || this.state === 'connecting') return;

    if (this.currentSubId) {
      this.send({ msg: 'unsub', id: this.currentSubId });
    }

    const subId = `sub_board_${boardId}_${Date.now()}`;
    this.currentSubId = subId;

    this.send({
      msg: 'sub',
      id: subId,
      name: 'board',
      params: [boardId, false],
    });
  }

  public call(method: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `m_${this.nextMethodId++}`;
      this.pendingMethods.set(id, { resolve, reject });
      this.send({
        msg: 'method',
        method,
        params,
        id,
      });

      // 15s timeout
      setTimeout(() => {
        if (this.pendingMethods.has(id)) {
          this.pendingMethods.delete(id);
          reject(new Error(`DDP method ${method} timed out after 15s`));
        }
      }, 15000);
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingIntervalTimer = setInterval(() => {
      this.send({ msg: 'ping' });
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 10000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed && this.serverUrl) {
        this.initSocket();
      }
    }, delay);
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.setState('disconnected');
  }

  public close() {
    this.disconnect();
  }
}

export const ddpClient = new DdpClient();
