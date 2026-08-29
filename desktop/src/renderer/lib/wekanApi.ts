import {
  Board,
  List,
  Card,
  Swimlane,
  AuthSession,
  CardComment,
  Checklist,
  ChecklistItem,
  Attachment,
  CustomField,
  Activity,
  BoardLabel,
} from './types';

export class WekanApiError extends Error {
  constructor(public statusCode: number, message: string, public data?: any) {
    super(message);
    this.name = 'WekanApiError';
  }
}

export class WekanApiClient {
  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  // --- Auth ---
  async login(serverUrl: string, usernameOrEmail: string, password: string): Promise<AuthSession> {
    const base = this.normalizeUrl(serverUrl);
    const isEmail = usernameOrEmail.includes('@');
    const payload = isEmail
      ? { email: usernameOrEmail, password }
      : { username: usernameOrEmail, password };

    const res = await fetch(`${base}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new WekanApiError(
        res.status,
        data.reason || data.error || `Authentication failed (${res.status})`,
        data
      );
    }

    if (!data.token || !data.id) {
      throw new WekanApiError(500, 'Invalid login response: missing token or user id', data);
    }

    return {
      userId: data.id,
      token: data.token,
      tokenExpires: data.tokenExpires,
      serverUrl: base,
      username: usernameOrEmail,
    };
  }

  async register(serverUrl: string, username: string, email: string, password: string): Promise<AuthSession> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || err.reason || `Registration failed (${res.status})`, err);
    }

    const data = await res.json();
    if (!data.token || !data.id) {
      // Auto login if register didn't return tokens directly
      return this.login(serverUrl, username, password);
    }

    return {
      userId: data.id,
      token: data.token,
      tokenExpires: data.tokenExpires,
      serverUrl: base,
      username,
    };
  }

  // --- Boards CRUD ---
  async getBoards(serverUrl: string, token: string, userId?: string): Promise<Board[]> {
    const base = this.normalizeUrl(serverUrl);
    const headers = { 'Authorization': `Bearer ${token}` };
    const boardMap = new Map<string, Board>();

    if (userId) {
      try {
        const userBoardsRes = await fetch(`${base}/api/users/${userId}/boards`, { headers });
        if (userBoardsRes.ok) {
          const userBoards = await userBoardsRes.json();
          if (Array.isArray(userBoards)) {
            userBoards.forEach(b => boardMap.set(b._id, b));
          }
        }
      } catch (_) {}
    }

    try {
      const publicBoardsRes = await fetch(`${base}/api/boards`, { headers });
      if (publicBoardsRes.ok) {
        const publicBoards = await publicBoardsRes.json();
        if (Array.isArray(publicBoards)) {
          publicBoards.forEach(b => {
            if (!boardMap.has(b._id)) boardMap.set(b._id, b);
          });
        }
      }
    } catch (_) {}

    return Array.from(boardMap.values());
  }

  async getBoard(serverUrl: string, token: string, boardId: string): Promise<Board> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new WekanApiError(res.status, `Failed to load board ${boardId}`);
    return await res.json();
  }

  async createBoard(
    serverUrl: string,
    token: string,
    title: string,
    ownerUserId: string,
    permission: 'private' | 'public' = 'private',
    color = 'midnight'
  ): Promise<{ _id: string; defaultSwimlaneId?: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        owner: ownerUserId,
        permission,
        color,
        isAdmin: true,
        isActive: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create board (${res.status})`, err);
    }
    return await res.json();
  }

  async updateBoardTitle(serverUrl: string, token: string, boardId: string, title: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to update board title (${res.status})`, err);
    }
    return await res.json();
  }

  async deleteBoard(serverUrl: string, token: string, boardId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete board (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Board Members CRUD ---
  async addBoardMember(
    serverUrl: string,
    token: string,
    boardId: string,
    memberId: string,
    options: {
      action?: 'add' | 'remove';
      role?: 'admin' | 'normal' | 'comment-only' | 'worker' | 'read-only';
      isAdmin?: boolean;
      isActive?: boolean;
      isCommentOnly?: boolean;
      isWorker?: boolean;
    } = { action: 'add', role: 'normal' }
  ): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/members/${memberId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: options.action || 'add',
        role: options.role,
        isAdmin: options.isAdmin ?? (options.role === 'admin'),
        isActive: options.isActive ?? true,
        isCommentOnly: options.isCommentOnly ?? (options.role === 'comment-only'),
        isWorker: options.isWorker ?? (options.role === 'worker'),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to add member (${res.status})`, err);
    }
    return await res.json();
  }

  async removeBoardMember(serverUrl: string, token: string, boardId: string, memberId: string): Promise<{ _id: string }> {
    return this.addBoardMember(serverUrl, token, boardId, memberId, { action: 'remove' });
  }

  // --- Board Labels CRUD ---
  async addBoardLabel(serverUrl: string, token: string, boardId: string, label: { name?: string; color: string }): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/labels`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to add label (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Lists CRUD ---
  async getLists(serverUrl: string, token: string, boardId: string): Promise<List[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new WekanApiError(res.status, `Failed to load lists for board ${boardId}`);
    return await res.json();
  }

  async createList(serverUrl: string, token: string, boardId: string, title: string, swimlaneId?: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, swimlaneId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create list (${res.status})`, err);
    }
    return await res.json();
  }

  async updateList(serverUrl: string, token: string, boardId: string, listId: string, update: { title?: string; sort?: number; archived?: boolean }): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists/${listId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to update list (${res.status})`, err);
    }
    return await res.json();
  }

  async deleteList(serverUrl: string, token: string, boardId: string, listId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists/${listId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete list (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Swimlanes CRUD ---
  async getSwimlanes(serverUrl: string, token: string, boardId: string): Promise<Swimlane[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/swimlanes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new WekanApiError(res.status, `Failed to load swimlanes for board ${boardId}`);
    return await res.json();
  }

  async createSwimlane(serverUrl: string, token: string, boardId: string, title: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/swimlanes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create swimlane (${res.status})`, err);
    }
    return await res.json();
  }

  async updateSwimlane(serverUrl: string, token: string, boardId: string, swimlaneId: string, update: { title?: string; sort?: number; archived?: boolean }): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/swimlanes/${swimlaneId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to update swimlane (${res.status})`, err);
    }
    return await res.json();
  }

  async deleteSwimlane(serverUrl: string, token: string, boardId: string, swimlaneId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/swimlanes/${swimlaneId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete swimlane (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Cards CRUD ---
  async getCards(serverUrl: string, token: string, boardId: string): Promise<Card[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new WekanApiError(res.status, `Failed to load cards for board ${boardId}`);
    return await res.json();
  }

  async createCard(
    serverUrl: string,
    token: string,
    boardId: string,
    listId: string,
    swimlaneId: string,
    title: string,
    description?: string,
    authorId?: string
  ): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists/${listId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description: description || '',
        swimlaneId,
        authorId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create card (${res.status})`, err);
    }
    return await res.json();
  }

  async updateCard(
    serverUrl: string,
    token: string,
    boardId: string,
    listId: string,
    cardId: string,
    updateData: Partial<Card>
  ): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to update card (${res.status})`, err);
    }
    return await res.json();
  }

  async moveCard(
    serverUrl: string,
    token: string,
    boardId: string,
    listId: string,
    cardId: string,
    targetListId: string,
    targetSwimlaneId?: string,
    sort?: number
  ): Promise<{ _id: string }> {
    return this.updateCard(serverUrl, token, boardId, listId, cardId, {
      listId: targetListId,
      ...(targetSwimlaneId ? { swimlaneId: targetSwimlaneId } : {}),
      ...(sort !== undefined ? { sort } : {}),
    });
  }

  async deleteCard(serverUrl: string, token: string, boardId: string, listId: string, cardId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete card (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Comments CRUD ---
  async getComments(serverUrl: string, token: string, boardId: string, cardId: string): Promise<CardComment[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/comments`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new WekanApiError(res.status, `Failed to load comments for card ${cardId}`);
    return await res.json();
  }

  async addComment(serverUrl: string, token: string, boardId: string, cardId: string, comment: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ comment }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to add comment (${res.status})`, err);
    }
    return await res.json();
  }

  async deleteComment(serverUrl: string, token: string, boardId: string, cardId: string, commentId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete comment (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Checklists & Items CRUD ---
  async getChecklists(serverUrl: string, token: string, boardId: string, cardId: string): Promise<Checklist[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/checklists`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new WekanApiError(res.status, `Failed to load checklists for card ${cardId}`);
    return await res.json();
  }

  async createChecklist(serverUrl: string, token: string, boardId: string, cardId: string, title: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/checklists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create checklist (${res.status})`, err);
    }
    return await res.json();
  }

  async deleteChecklist(serverUrl: string, token: string, boardId: string, cardId: string, checklistId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete checklist (${res.status})`, err);
    }
    return await res.json();
  }

  async createChecklistItem(serverUrl: string, token: string, boardId: string, cardId: string, checklistId: string, title: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, isFinished: false }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create checklist item (${res.status})`, err);
    }
    return await res.json();
  }

  async updateChecklistItem(
    serverUrl: string,
    token: string,
    boardId: string,
    cardId: string,
    checklistId: string,
    itemId: string,
    updateData: { isFinished?: boolean; title?: string; sort?: number }
  ): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to update checklist item (${res.status})`, err);
    }
    return await res.json();
  }

  async deleteChecklistItem(serverUrl: string, token: string, boardId: string, cardId: string, checklistId: string, itemId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete checklist item (${res.status})`, err);
    }
    return await res.json();
  }

  // --- Attachments CRUD ---
  async getAttachments(serverUrl: string, token: string, boardId: string): Promise<Attachment[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/attachments`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data || json;
    return Array.isArray(data) ? data.map(d => ({
      _id: d.attachmentId || d._id,
      name: d.attachmentName || d.name,
      type: d.attachmentType || d.type,
      size: d.size,
      url: d.url,
      urlDownload: d.urlDownload,
      boardId: d.boardId || boardId,
      swimlaneId: d.swimlaneId,
      listId: d.listId,
      cardId: d.cardId,
      uploadedAt: d.uploadedAt,
    })) : [];
  }

  // --- Custom Fields CRUD ---
  async getCustomFields(serverUrl: string, token: string, boardId: string): Promise<CustomField[]> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/custom-fields`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json.data || json;
    return Array.isArray(list) ? list : [];
  }

  async createCustomField(
    serverUrl: string,
    token: string,
    boardId: string,
    customField: {
      name: string;
      type: CustomField['type'];
      settings?: any;
      showOnCard?: boolean;
      automaticallyOnCard?: boolean;
    }
  ): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/custom-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(customField),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to create custom field (${res.status})`, err);
    }
    const json = await res.json();
    return json.data || json;
  }

  async updateCustomField(
    serverUrl: string,
    token: string,
    boardId: string,
    customFieldId: string,
    update: Partial<CustomField>
  ): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/custom-fields/${customFieldId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to update custom field (${res.status})`, err);
    }
    const json = await res.json();
    return json.data || json;
  }

  async deleteCustomField(serverUrl: string, token: string, boardId: string, customFieldId: string): Promise<{ _id: string }> {
    const base = this.normalizeUrl(serverUrl);
    const res = await fetch(`${base}/api/boards/${boardId}/custom-fields/${customFieldId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new WekanApiError(res.status, err.message || `Failed to delete custom field (${res.status})`, err);
    }
    const json = await res.json();
    return json.data || json;
  }
}

export const wekanApi = new WekanApiClient();
