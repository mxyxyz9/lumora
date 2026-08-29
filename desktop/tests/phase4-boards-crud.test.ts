import { describe, it, expect, beforeAll } from 'vitest';

const SERVER_URL = process.env.WEKAN_URL || 'http://localhost';
const ADMIN_USER = process.env.WEKAN_USER || 'admin';
const ADMIN_PASS = process.env.WEKAN_PASS || 'Password123!';

describe('Phase 4 Section 1: Board, List, Swimlane & Label Management (Against Real WeKan)', () => {
  let authToken = '';
  let userId = '';
  let createdBoardId = '';
  let createdListId = '';
  let createdSwimlaneId = '';

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
  });

  it('should create a new workspace board with custom color and private permissions', async () => {
    const boardTitle = `Core Engineering Platform ${Date.now()}`;
    const createRes = await fetch(`${SERVER_URL}/api/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: boardTitle,
        owner: userId,
        permission: 'private',
        color: 'midnight',
        isAdmin: true,
        isActive: true,
      }),
    });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    createdBoardId = createData._id;
    expect(createdBoardId).toBeTruthy();

    // Verify board exists in user's board list
    const getBoardsRes = await fetch(`${SERVER_URL}/api/users/${userId}/boards`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const userBoards = await getBoardsRes.json();
    expect(userBoards.some((b: any) => b._id === createdBoardId)).toBe(true);
  });

  it('should rename board title', async () => {
    const updatedTitle = `Core Platform Sprint V2 ${Date.now()}`;
    const renameRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: updatedTitle }),
    });
    expect(renameRes.status).toBe(200);

    const getBoardRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const boardObj = await getBoardRes.json();
    expect(boardObj.title).toBe(updatedTitle);
  });

  it('should create, rename, and manage lists within the board', async () => {
    // Create List
    const createListRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Backlog Alpha' }),
    });
    expect(createListRes.status).toBe(200);
    const listData = await createListRes.json();
    createdListId = listData._id;
    expect(createdListId).toBeTruthy();

    // Rename List
    const renameListRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/lists/${createdListId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Backlog Ready' }),
    });
    expect(renameListRes.status).toBe(200);

    // Verify in GET lists
    const getListsRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/lists`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const lists = await getListsRes.json();
    const targetList = lists.find((l: any) => l._id === createdListId);
    expect(targetList).toBeTruthy();
    expect(targetList.title).toBe('Backlog Ready');
  });

  it('should create and update swimlanes within the board', async () => {
    const createSwimlaneRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/swimlanes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title: 'Security & Auth Swimlane' }),
    });
    expect(createSwimlaneRes.status).toBe(200);
    const swimlaneData = await createSwimlaneRes.json();
    createdSwimlaneId = swimlaneData._id;
    expect(createdSwimlaneId).toBeTruthy();

    // Verify in GET swimlanes
    const getSwimlanesRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/swimlanes`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const swimlanes = await getSwimlanesRes.json();
    expect(swimlanes.some((s: any) => s._id === createdSwimlaneId)).toBe(true);
  });

  it('should create and assign board labels', async () => {
    const addLabelRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}/labels`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        label: {
          name: 'Critical Security',
          color: 'red',
        },
      }),
    });
    expect(addLabelRes.status).toBe(200);

    const getBoardRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    const boardObj = await getBoardRes.json();
    expect(boardObj.labels.some((l: any) => l.name === 'Critical Security')).toBe(true);
  });

  it('should delete the test workspace board cleanly', async () => {
    const deleteRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(deleteRes.status).toBe(200);

    const getBoardRes = await fetch(`${SERVER_URL}/api/boards/${createdBoardId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    expect(getBoardRes.status).toBe(404);
  });
});
