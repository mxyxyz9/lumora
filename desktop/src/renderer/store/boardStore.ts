import { create } from 'zustand';
import {
  Board,
  List,
  Card,
  Swimlane,
  AuthSession,
  DDPConnectionState,
  CardComment,
  Checklist,
  ChecklistItem,
  Attachment,
  CustomField,
  Activity,
  AppSettings,
  BoardLabel,
} from '../lib/types';
import { wekanApi } from '../lib/wekanApi';
import { ddpClient } from '../lib/ddpClient';
import { seedSprintEngineeringData } from '../lib/demoDataSeeder';
import { pipelineOrchestrator } from '../lib/pipelineOrchestrator';

const AUTH_STORAGE_KEY = 'wekan_desktop_auth';
const SETTINGS_STORAGE_KEY = 'wekan_desktop_settings';

// Offline / Guest Mode local storage keys
const GUEST_BOARDS_KEY = 'kanso_guest_boards';
const GUEST_SWIMLANES_KEY = 'kanso_guest_swimlanes';
const GUEST_LISTS_KEY = 'kanso_guest_lists';
const GUEST_CARDS_KEY = 'kanso_guest_cards';
const GUEST_COMMENTS_KEY = 'kanso_guest_comments';
const GUEST_CHECKLISTS_KEY = 'kanso_guest_checklists';
const GUEST_ITEMS_KEY = 'kanso_guest_items';
const GUEST_ATTACHMENTS_KEY = 'kanso_guest_attachments';
const GUEST_CUSTOM_FIELDS_KEY = 'kanso_guest_custom_fields';
const PROJECT_LAST_VIEWS_KEY = 'kanso_project_last_views';

function loadProjectLastViews(): Record<string, 'subfolders_hub' | 'board' | 'calendar'> {
  try {
    const raw = localStorage.getItem(PROJECT_LAST_VIEWS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveProjectLastViews(data: Record<string, string>) {
  try {
    localStorage.setItem(PROJECT_LAST_VIEWS_KEY, JSON.stringify(data));
  } catch (_) {}
}

function loadGuestData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function saveGuestData(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
}

function initializeGuestWorkspaceIfEmpty() {
  const existingBoards = loadGuestData<Board[]>(GUEST_BOARDS_KEY, []);
  if (existingBoards.length > 0) {
    // Migration for existing boards
    let modified = false;
    const migrated = existingBoards.map((b, i) => {
      let updated = { ...b };
      if (updated.title === 'Offline Local Workspace') {
        updated.title = 'My Tasks';
        updated.icon = updated.icon || '🎯';
        modified = true;
      }
      if (!updated.icon) {
        const fallbackIcons = ['🎯', '💻', '🚀', '⚡', '📦', '🎨', '📝', '💡'];
        updated.icon = fallbackIcons[i % fallbackIcons.length];
        modified = true;
      }
      return updated;
    });
    if (modified) {
      saveGuestData(GUEST_BOARDS_KEY, migrated);
    }
    return;
  }

  const defaultBoard: Board = {
    _id: 'guest-board-1',
    title: 'My Tasks',
    icon: '🎯',
    color: 'midnight',
    permission: 'private',
    labels: [
      { _id: 'lbl-1', name: 'High Priority', color: '#f87171' },
      { _id: 'lbl-2', name: 'Frontend', color: '#4f8ef7' },
      { _id: 'lbl-3', name: 'Backend', color: '#34d399' },
    ],
  };

  const defaultSwimlanes: Swimlane[] = [
    { _id: 'guest-sw-1', title: 'Daily Tasks', boardId: 'guest-board-1', sort: 1 },
    { _id: 'guest-sw-2', title: 'Projects & Ideas', boardId: 'guest-board-1', sort: 2 },
  ];

  const defaultLists: List[] = [
    { _id: 'guest-list-1', title: 'To Do', boardId: 'guest-board-1', sort: 1 },
    { _id: 'guest-list-2', title: 'In Progress', boardId: 'guest-board-1', sort: 2 },
    { _id: 'guest-list-3', title: 'Done', boardId: 'guest-board-1', sort: 3 },
  ];

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const nextWeek = new Date(today.getTime() + 86400000 * 5);

  const defaultCards: Card[] = [
    {
      _id: 'guest-card-1',
      title: 'Welcome to Lumora! Click here to explore notes, checklists & attachments',
      description: 'Welcome to Lumora — the modern, high-contrast Kanban workspace with integrated AI Copilot and Codex autonomous pipeline.',
      listId: 'guest-list-1',
      swimlaneId: 'guest-sw-1',
      boardId: 'guest-board-1',
      sort: 1,
      dueAt: tomorrow.toISOString(),
      labelIds: ['lbl-2'],
    },
    {
      _id: 'guest-card-2',
      title: 'Try organizing cards by Subfolders, Board, or Calendar views',
      description: 'Switch between Subfolders, Kanban Board, and Calendar views using the top navigation bar or sidebar.',
      listId: 'guest-list-2',
      swimlaneId: 'guest-sw-1',
      boardId: 'guest-board-1',
      sort: 2,
      dueAt: nextWeek.toISOString(),
      labelIds: ['lbl-1'],
    },
    {
      _id: 'guest-card-3',
      title: 'Ask Lumora Copilot to brainstorm ideas or summarize tasks',
      description: 'Use the Lumora Copilot drawer in the top right to generate task specifications, break down workstreams, or run AI diagnoses.',
      listId: 'guest-list-3',
      swimlaneId: 'guest-sw-2',
      boardId: 'guest-board-1',
      sort: 3,
      labelIds: ['lbl-3'],
    },
  ];

  saveGuestData(GUEST_BOARDS_KEY, [defaultBoard]);
  saveGuestData(GUEST_SWIMLANES_KEY, defaultSwimlanes);
  saveGuestData(GUEST_LISTS_KEY, defaultLists);
  saveGuestData(GUEST_CARDS_KEY, defaultCards);
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontScale: 'normal',
  listWidth: 300,
  appMode: 'team',
  githubSyncEnabled: false,
  githubSyncIntervalSec: 30,
  watchLevel: 'watching',
  confirmBeforeQuit: true,
};

function applyThemeToDom(theme: string) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.className = '';
  document.documentElement.classList.add(`theme-${theme}`);
}

function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const stored = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      applyThemeToDom(stored.theme || DEFAULT_SETTINGS.theme);
      return stored;
    }
  } catch (_) {}
  applyThemeToDom(DEFAULT_SETTINGS.theme);
  return DEFAULT_SETTINGS;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface BoardState {
  session: AuthSession | null;
  isLoadingAuth: boolean;
  authError: string | null;

  // Real-time DDP state
  ddpState: DDPConnectionState;

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  setWatchLevel: (level: 'muted' | 'tracking' | 'watching') => Promise<void>;

  // Multi-Board & Subfolder/Swimlane Management
  boards: Board[];
  activeBoardId: string | null;
  activeBoard: Board | null;
  activeSwimlaneId: string | 'all';
  activeView: 'board' | 'subfolders_hub' | 'calendar' | 'settings' | 'global_hub';
  projectLastViews: Record<string, 'subfolders_hub' | 'board' | 'calendar'>;
  viewMode: 'tabs' | 'stacked';
  lists: List[];
  swimlanes: Swimlane[];
  cards: Card[];
  comments: CardComment[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
  attachments: Attachment[];
  customFields: CustomField[];
  activities: Activity[];

  // Active UI states & modals
  activeCardId: string | null;
  confirmDialog: ConfirmDialogState | null;
  isNewBoardModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isCustomFieldsModalOpen: boolean;
  isMemberModalOpen: boolean;
  isActivityDrawerOpen: boolean;
  isGitHubModalOpen: boolean;

  // Action methods
  showConfirm: (opts: Omit<ConfirmDialogState, 'isOpen'>) => void;
  closeConfirm: () => void;
  setSession: (session: AuthSession | null) => void;
  login: (serverUrl: string, usernameOrEmail: string, pass: string) => Promise<void>;
  register: (serverUrl: string, username: string, email: string, pass: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<boolean>;

  // Subfolder / View actions
  setActiveSwimlaneId: (id: string | 'all') => void;
  setActiveView: (view: 'board' | 'subfolders_hub' | 'calendar' | 'settings' | 'global_hub') => void;
  navigateBackToProject: () => void;
  setViewMode: (mode: 'tabs' | 'stacked') => void;

  // Board CRUD
  fetchBoards: () => Promise<void>;
  switchBoard: (boardId: string, targetView?: 'board' | 'subfolders_hub' | 'calendar' | 'settings' | 'global_hub') => Promise<void>;
  createBoard: (title: string, color?: string, permission?: 'private' | 'public', customLists?: string[], customSwimlanes?: string[], icon?: string) => Promise<string>;
  updateBoardTitle: (boardId: string, title: string) => Promise<void>;
  updateBoard: (boardId: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  addBoardLabel: (name: string, color: string) => Promise<void>;
  addBoardMember: (memberId: string, role?: string) => Promise<void>;
  removeBoardMember: (memberId: string) => Promise<void>;
  seedDemoData: () => Promise<void>;

  // List & Swimlane (Subfolder) CRUD
  createList: (title: string, targetSwimlaneId?: string) => Promise<void>;
  updateList: (listId: string, update: { title?: string; sort?: number; archived?: boolean }) => Promise<void>;
  reorderLists: (sourceListId: string, targetIndex: number) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  createSwimlane: (title: string) => Promise<string>;
  updateSwimlane: (swimlaneId: string, update: { title?: string; sort?: number; archived?: boolean }) => Promise<void>;
  deleteSwimlane: (swimlaneId: string) => Promise<void>;

  // Card Operations
  createCard: (listId: string, title: string, description?: string, customSwimlaneId?: string) => Promise<string>;
  updateCard: (cardId: string, updateData: Partial<Card>) => Promise<void>;
  moveCard: (cardId: string, targetListId: string, targetSwimlaneId?: string, sort?: number) => Promise<void>;
  reorderCards: (sourceCardId: string, targetListId: string, targetIndex?: number) => Promise<void>;
  setCardSwimlane: (cardId: string, targetSwimlaneId: string) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  setActiveCardId: (cardId: string | null) => void;
  setCardLabels: (cardId: string, labelIds: string[]) => Promise<void>;
  setCardAssignees: (cardId: string, assignees: string[]) => Promise<void>;
  setCardMembers: (cardId: string, members: string[]) => Promise<void>;
  setCardCustomField: (cardId: string, customFieldId: string, value: any) => Promise<void>;

  // Comments, Checklists, Attachments
  addComment: (cardId: string, comment: string) => Promise<void>;
  deleteComment: (cardId: string, commentId: string) => Promise<void>;
  createChecklist: (cardId: string, title: string) => Promise<void>;
  deleteChecklist: (cardId: string, checklistId: string) => Promise<void>;
  createChecklistItem: (cardId: string, checklistId: string, title: string) => Promise<void>;
  updateChecklistItem: (cardId: string, checklistId: string, itemId: string, isFinished: boolean) => Promise<void>;
  deleteChecklistItem: (cardId: string, checklistId: string, itemId: string) => Promise<void>;
  uploadAttachment: (cardId: string, fileData: string, fileName: string, fileType: string) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;

  // Custom Fields CRUD
  createCustomField: (cf: { name: string; type: CustomField['type']; settings?: any; showOnCard?: boolean }) => Promise<void>;
  updateCustomField: (cfId: string, update: Partial<CustomField>) => Promise<void>;
  deleteCustomField: (cfId: string) => Promise<void>;

  // Modal toggles
  setNewBoardModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  setCustomFieldsModalOpen: (open: boolean) => void;
  setMemberModalOpen: (open: boolean) => void;
  setActivityDrawerOpen: (open: boolean) => void;
  setGitHubModalOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  initDDP: () => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  session: null,
  isLoadingAuth: true,
  authError: null,
  ddpState: 'disconnected',

  settings: loadStoredSettings(),
  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    if (newSettings.theme) {
      applyThemeToDom(newSettings.theme);
    }
    if (typeof newSettings.confirmBeforeQuit === 'boolean' && window.electronAPI?.setConfirmBeforeQuit) {
      window.electronAPI.setConfirmBeforeQuit(newSettings.confirmBeforeQuit);
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  },
  setWatchLevel: async (level) => {
    const { session, activeBoardId } = get();
    get().updateSettings({ watchLevel: level });
    if (session && !session.isGuest && activeBoardId) {
      try {
        await ddpClient.call('watch', ['board', activeBoardId, level]);
      } catch (_) {}
    }
  },

  boards: [],
  activeBoardId: null,
  activeBoard: null,
  activeSwimlaneId: 'all',
  activeView: 'board',
  projectLastViews: loadProjectLastViews(),
  viewMode: 'tabs',
  lists: [],
  swimlanes: [],
  cards: [],
  comments: [],
  checklists: [],
  checklistItems: [],
  attachments: [],
  customFields: [],
  activities: [],

  activeCardId: null,
  confirmDialog: null,
  isNewBoardModalOpen: false,
  isSettingsModalOpen: false,
  isCustomFieldsModalOpen: false,
  isMemberModalOpen: false,
  isActivityDrawerOpen: false,
  isGitHubModalOpen: false,
  isSearchOpen: false,
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  showConfirm: (opts) => set({ confirmDialog: { ...opts, isOpen: true } }),
  closeConfirm: () => set({ confirmDialog: null }),

  setActiveSwimlaneId: (id) => set({ activeSwimlaneId: id }),
  setActiveView: (view) => {
    const { activeBoardId, projectLastViews } = get();
    if (activeBoardId && (view === 'subfolders_hub' || view === 'board' || view === 'calendar')) {
      const updated = { ...projectLastViews, [activeBoardId]: view };
      set({ activeView: view, projectLastViews: updated });
      saveProjectLastViews(updated);
    } else {
      set({ activeView: view });
    }
  },
  navigateBackToProject: () => set({ activeView: 'subfolders_hub', activeSwimlaneId: 'all' }),
  setViewMode: (mode) => set({ viewMode: mode }),

  setSession: (session) => {
    set({ session, authError: null });
    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  continueAsGuest: async () => {
    set({ isLoadingAuth: true, authError: null });
    initializeGuestWorkspaceIfEmpty();
    const guestSession: AuthSession = {
      userId: 'guest-user',
      token: 'guest-local-token',
      tokenExpires: '2099-01-01',
      serverUrl: 'http://localhost:local',
      username: 'Guest (Offline)',
      isGuest: true,
    };
    get().setSession(guestSession);
    await get().fetchBoards();
    set({ isLoadingAuth: false });
  },

  login: async (serverUrl, usernameOrEmail, password) => {
    set({ isLoadingAuth: true, authError: null });
    try {
      const session = await wekanApi.login(serverUrl, usernameOrEmail, password);
      get().setSession(session);
      await get().fetchBoards();
      await get().initDDP();
    } catch (err: any) {
      set({ authError: err.message || 'Login failed', isLoadingAuth: false });
      throw err;
    } finally {
      set({ isLoadingAuth: false });
    }
  },

  register: async (serverUrl, username, email, password) => {
    set({ isLoadingAuth: true, authError: null });
    try {
      const session = await wekanApi.register(serverUrl, username, email, password);
      get().setSession(session);
      await get().fetchBoards();
      await get().initDDP();
    } catch (err: any) {
      set({ authError: err.message || 'Registration failed', isLoadingAuth: false });
      throw err;
    } finally {
      set({ isLoadingAuth: false });
    }
  },

  logout: () => {
    ddpClient.close();
    get().setSession(null);
    set({
      boards: [],
      activeBoardId: null,
      activeBoard: null,
      lists: [],
      swimlanes: [],
      cards: [],
      comments: [],
      checklists: [],
      checklistItems: [],
      attachments: [],
      customFields: [],
      activities: [],
      ddpState: 'disconnected',
    });
  },

  restoreSession: async () => {
    set({ isLoadingAuth: true });
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        set({ isLoadingAuth: false });
        return false;
      }
      const session: AuthSession = JSON.parse(raw);
      set({ session });
      await get().fetchBoards();
      if (!session.isGuest) {
        await get().initDDP();
      }
      return true;
    } catch (e) {
      console.warn('Failed to restore session:', e);
      get().logout();
      return false;
    } finally {
      set({ isLoadingAuth: false });
    }
  },

  fetchBoards: async () => {
    const { session } = get();
    if (!session) return;

    if (session.isGuest) {
      const boards = loadGuestData<Board[]>(GUEST_BOARDS_KEY, []);
      set({ boards });
      if (boards.length > 0) {
        const boardToSwitch = get().activeBoardId && boards.some(b => b._id === get().activeBoardId)
          ? get().activeBoardId!
          : boards[0]._id;
        await get().switchBoard(boardToSwitch);
      }
      return;
    }

    try {
      const boards = await wekanApi.getBoards(session.serverUrl, session.token, session.userId);
      set({ boards });
      if (!get().activeBoardId && boards.length > 0) {
        await get().switchBoard(boards[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  },

  switchBoard: async (boardId: string, targetView?: 'board' | 'subfolders_hub' | 'calendar' | 'settings' | 'global_hub') => {
    const { session, boards, projectLastViews } = get();
    if (!session) return;

    const guestBoards = loadGuestData<Board[]>(GUEST_BOARDS_KEY, []);
    const board = boards.find(b => b._id === boardId) || guestBoards.find(b => b._id === boardId) || (session.isGuest ? null : await wekanApi.getBoard(session.serverUrl, session.token, boardId).catch(() => null));

    const storedLastViews = loadProjectLastViews();
    const effectiveLastViews = { ...storedLastViews, ...projectLastViews };
    const lastView = targetView || effectiveLastViews[boardId] || 'board';

    set({
      activeBoardId: boardId,
      activeBoard: board,
      activeView: lastView,
      activeCardId: null,
      cards: [],
      lists: [],
      swimlanes: [],
      comments: [],
      checklists: [],
      checklistItems: [],
      attachments: [],
      customFields: [],
      activities: [],
    });

    if (session.isGuest) {
      const allLists = loadGuestData<List[]>(GUEST_LISTS_KEY, []);
      const allSwimlanes = loadGuestData<Swimlane[]>(GUEST_SWIMLANES_KEY, []);
      const allCards = loadGuestData<Card[]>(GUEST_CARDS_KEY, []);
      const allComments = loadGuestData<CardComment[]>(GUEST_COMMENTS_KEY, []);
      const allChecklists = loadGuestData<Checklist[]>(GUEST_CHECKLISTS_KEY, []);
      const allItems = loadGuestData<ChecklistItem[]>(GUEST_ITEMS_KEY, []);
      const allAttachments = loadGuestData<Attachment[]>(GUEST_ATTACHMENTS_KEY, []);
      const allCustomFields = loadGuestData<CustomField[]>(GUEST_CUSTOM_FIELDS_KEY, []);

      set({
        lists: allLists.filter(l => l.boardId === boardId),
        swimlanes: allSwimlanes.filter(s => s.boardId === boardId),
        cards: allCards.filter(c => c.boardId === boardId),
        comments: allComments.filter(c => c.boardId === boardId),
        checklists: allChecklists.filter(cl => cl.boardId === boardId),
        checklistItems: allItems,
        attachments: allAttachments.filter(a => a.boardId === boardId),
        customFields: allCustomFields.filter(cf => (cf.boardIds || []).includes(boardId)),
      });
      return;
    }

    try {
      const [lists, swimlanes, cards, attachments, customFields] = await Promise.all([
        wekanApi.getLists(session.serverUrl, session.token, boardId),
        wekanApi.getSwimlanes(session.serverUrl, session.token, boardId),
        wekanApi.getCards(session.serverUrl, session.token, boardId),
        wekanApi.getAttachments(session.serverUrl, session.token, boardId),
        wekanApi.getCustomFields(session.serverUrl, session.token, boardId),
      ]);
      set({ lists, swimlanes, cards, attachments, customFields });

      if (get().ddpState === 'authenticated' || get().ddpState === 'subscribed') {
        await ddpClient.subscribe('board', [boardId, false]);
        await ddpClient.subscribe('activities', ['board', [boardId], 50, true]);
      }
    } catch (err) {
      console.error('Error loading board data:', err);
    }
  },

  seedDemoData: async () => {
    const { session, activeBoardId } = get();
    if (!session || !activeBoardId) return;
    if (session.isGuest) {
      initializeGuestWorkspaceIfEmpty();
      await get().switchBoard(activeBoardId);
      return;
    }
    await seedSprintEngineeringData(session, activeBoardId);
    await get().switchBoard(activeBoardId);
  },

  createBoard: async (title, color = 'midnight', permission = 'private', customLists, customSwimlanes, icon = '🎯') => {
    const { session } = get();
    if (!session) throw new Error('Not logged in');

    if (session.isGuest) {
      const newBoardId = `guest-board-${Date.now()}`;
      const newBoard: Board = {
        _id: newBoardId,
        title,
        icon,
        color,
        permission,
        labels: [],
      };
      const boards = [...loadGuestData<Board[]>(GUEST_BOARDS_KEY, []), newBoard];
      saveGuestData(GUEST_BOARDS_KEY, boards);

      const swimlaneTitles = customSwimlanes && customSwimlanes.length > 0 ? customSwimlanes : ['Main Workstream'];
      const newSwimlanes: Swimlane[] = swimlaneTitles.map((swTitle, idx) => ({
        _id: `guest-sw-${Date.now()}-${idx + 1}`,
        title: swTitle,
        boardId: newBoardId,
        sort: idx + 1,
      }));
      const allSwimlanes = [...loadGuestData<Swimlane[]>(GUEST_SWIMLANES_KEY, []), ...newSwimlanes];
      saveGuestData(GUEST_SWIMLANES_KEY, allSwimlanes);

      const listTitles = customLists && customLists.length > 0 ? customLists : ['To Do', 'In Progress', 'Done'];
      const newLists: List[] = listTitles.map((lTitle, idx) => ({
        _id: `guest-list-${Date.now()}-${idx + 1}`,
        title: lTitle,
        boardId: newBoardId,
        sort: idx + 1,
      }));
      const allLists = [...loadGuestData<List[]>(GUEST_LISTS_KEY, []), ...newLists];
      saveGuestData(GUEST_LISTS_KEY, allLists);

      await get().fetchBoards();
      await get().switchBoard(newBoardId);
      return newBoardId;
    }

    const res = await wekanApi.createBoard(session.serverUrl, session.token, title, session.userId, permission, color);
    if (customSwimlanes && customSwimlanes.length > 0) {
      for (const sw of customSwimlanes) {
        await wekanApi.createSwimlane(session.serverUrl, session.token, res._id, sw);
      }
    }
    if (customLists && customLists.length > 0) {
      for (const l of customLists) {
        await wekanApi.createList(session.serverUrl, session.token, res._id, l);
      }
    }
    await get().fetchBoards();
    await get().switchBoard(res._id);
    return res._id;
  },

  updateBoardTitle: async (boardId, title) => {
    await get().updateBoard(boardId, { title });
  },

  updateBoard: async (boardId, updates) => {
    const { session } = get();
    if (!session) return;
    set(state => ({
      boards: state.boards.map(b => b._id === boardId ? { ...b, ...updates } : b),
      activeBoard: state.activeBoard?._id === boardId ? { ...state.activeBoard, ...updates } : state.activeBoard,
    }));

    // Cache project metadata locally
    try {
      localStorage.setItem(`kanso_board_${boardId}_meta`, JSON.stringify(updates));
    } catch (_) {}

    if (session.isGuest) {
      const boards = loadGuestData<Board[]>(GUEST_BOARDS_KEY, []).map(b => b._id === boardId ? { ...b, ...updates } : b);
      saveGuestData(GUEST_BOARDS_KEY, boards);
      return;
    }
    if (updates.title) {
      await wekanApi.updateBoardTitle(session.serverUrl, session.token, boardId, updates.title);
    }
  },

  deleteBoard: async (boardId) => {
    const { session, boards } = get();
    if (!session) return;
    const remaining = boards.filter(b => b._id !== boardId);
    set({ boards: remaining });
    if (get().activeBoardId === boardId) {
      if (remaining.length > 0) {
        await get().switchBoard(remaining[0]._id);
      } else {
        set({ activeBoardId: null, activeBoard: null, cards: [], lists: [], swimlanes: [] });
      }
    }
    if (session.isGuest) {
      saveGuestData(GUEST_BOARDS_KEY, remaining);
      return;
    }
    await wekanApi.deleteBoard(session.serverUrl, session.token, boardId);
  },

  addBoardLabel: async (name, color) => {
    const { session, activeBoardId, activeBoard } = get();
    if (!session || !activeBoardId) return;
    if (session.isGuest) {
      const newLabel: BoardLabel = { _id: `lbl-${Date.now()}`, name, color };
      const updatedLabels = [...(activeBoard?.labels || []), newLabel];
      set(state => ({
        activeBoard: state.activeBoard ? { ...state.activeBoard, labels: updatedLabels } : null,
        boards: state.boards.map(b => b._id === activeBoardId ? { ...b, labels: updatedLabels } : b),
      }));
      const boards = loadGuestData<Board[]>(GUEST_BOARDS_KEY, []).map(b => b._id === activeBoardId ? { ...b, labels: updatedLabels } : b);
      saveGuestData(GUEST_BOARDS_KEY, boards);
      return;
    }
    await wekanApi.addBoardLabel(session.serverUrl, session.token, activeBoardId, { name, color });
    const freshBoard = await wekanApi.getBoard(session.serverUrl, session.token, activeBoardId);
    set({ activeBoard: freshBoard });
  },

  addBoardMember: async (memberId, role = 'normal') => {
    const { session, activeBoardId } = get();
    if (!session || !activeBoardId || session.isGuest) return;
    await wekanApi.addBoardMember(session.serverUrl, session.token, activeBoardId, memberId, { role: role as any });
    const freshBoard = await wekanApi.getBoard(session.serverUrl, session.token, activeBoardId);
    set({ activeBoard: freshBoard });
  },

  removeBoardMember: async (memberId) => {
    const { session, activeBoardId } = get();
    if (!session || !activeBoardId || session.isGuest) return;
    await wekanApi.removeBoardMember(session.serverUrl, session.token, activeBoardId, memberId);
    const freshBoard = await wekanApi.getBoard(session.serverUrl, session.token, activeBoardId);
    set({ activeBoard: freshBoard });
  },

  createList: async (title, targetSwimlaneId) => {
    const { session, activeBoardId, activeSwimlaneId, swimlanes, lists } = get();
    if (!session || !activeBoardId) return;

    const assignedSwimlaneId = targetSwimlaneId || (activeSwimlaneId !== 'all' ? activeSwimlaneId : undefined);

    if (session.isGuest) {
      const newList: List = {
        _id: `guest-list-${Date.now()}`,
        title,
        boardId: activeBoardId,
        swimlaneId: assignedSwimlaneId,
        sort: lists.length,
      };
      const updated = [...lists, newList];
      set({ lists: updated });
      const allLists = [...loadGuestData<List[]>(GUEST_LISTS_KEY, []).filter(l => l.boardId !== activeBoardId), ...updated];
      saveGuestData(GUEST_LISTS_KEY, allLists);
      return;
    }

    const swimlaneId = assignedSwimlaneId || swimlanes[0]?._id;
    const res = await wekanApi.createList(session.serverUrl, session.token, activeBoardId, title, swimlaneId);
    const newList: List = {
      _id: res._id,
      title,
      boardId: activeBoardId,
      swimlaneId: assignedSwimlaneId,
      sort: lists.length,
    };
    set(state => ({
      lists: state.lists.some(l => l._id === res._id) ? state.lists : [...state.lists, newList],
    }));
  },

  updateList: async (listId, update) => {
    const { session, activeBoardId, lists } = get();
    if (!session || !activeBoardId) return;
    const updated = lists.map(l => l._id === listId ? { ...l, ...update } : l);
    set({ lists: updated });
    if (session.isGuest) {
      const allLists = loadGuestData<List[]>(GUEST_LISTS_KEY, []).map(l => l._id === listId ? { ...l, ...update } : l);
      saveGuestData(GUEST_LISTS_KEY, allLists);
      return;
    }
    await wekanApi.updateList(session.serverUrl, session.token, activeBoardId, listId, update);
  },

  reorderLists: async (sourceListId, targetIndex) => {
    const { session, activeBoardId, lists } = get();
    if (!session || !activeBoardId) return;
    const sorted = [...lists].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const sourceIdx = sorted.findIndex(l => l._id === sourceListId);
    if (sourceIdx === -1 || sourceIdx === targetIndex) return;

    const [moved] = sorted.splice(sourceIdx, 1);
    sorted.splice(targetIndex, 0, moved);

    const reindexed = sorted.map((list, idx) => ({ ...list, sort: idx }));
    set({ lists: reindexed });

    if (session.isGuest) {
      const otherLists = loadGuestData<List[]>(GUEST_LISTS_KEY, []).filter(l => l.boardId !== activeBoardId);
      saveGuestData(GUEST_LISTS_KEY, [...otherLists, ...reindexed]);
      return;
    }

    await Promise.all(
      reindexed.map((list, idx) =>
        wekanApi.updateList(session.serverUrl, session.token, activeBoardId, list._id, { sort: idx }).catch(err => {
          console.warn('Failed to persist list sort:', list._id, err);
        })
      )
    );
  },

  deleteList: async (listId) => {
    const { session, activeBoardId } = get();
    if (!session || !activeBoardId) return;
    set(state => ({
      lists: state.lists.filter(l => l._id !== listId),
      cards: state.cards.filter(c => c.listId !== listId),
    }));
    if (session.isGuest) {
      const allLists = loadGuestData<List[]>(GUEST_LISTS_KEY, []).filter(l => l._id !== listId);
      saveGuestData(GUEST_LISTS_KEY, allLists);
      return;
    }
    await wekanApi.deleteList(session.serverUrl, session.token, activeBoardId, listId);
  },

  createSwimlane: async (title) => {
    const { session, activeBoardId, swimlanes } = get();
    if (!session || !activeBoardId) return '';

    if (session.isGuest) {
      const newId = `guest-sw-${Date.now()}`;
      const newSwimlane: Swimlane = {
        _id: newId,
        title,
        boardId: activeBoardId,
        sort: swimlanes.length,
      };
      const updated = [...swimlanes, newSwimlane];
      set({ swimlanes: updated, activeSwimlaneId: newId });
      const allSwimlanes = [...loadGuestData<Swimlane[]>(GUEST_SWIMLANES_KEY, []).filter(s => s.boardId !== activeBoardId), ...updated];
      saveGuestData(GUEST_SWIMLANES_KEY, allSwimlanes);
      return newId;
    }

    const res = await wekanApi.createSwimlane(session.serverUrl, session.token, activeBoardId, title);
    const newSwimlane: Swimlane = {
      _id: res._id,
      title,
      boardId: activeBoardId,
      sort: swimlanes.length,
    };
    set(state => ({
      swimlanes: state.swimlanes.some(s => s._id === res._id) ? state.swimlanes : [...state.swimlanes, newSwimlane],
      activeSwimlaneId: res._id,
    }));
    return res._id;
  },

  updateSwimlane: async (swimlaneId, update) => {
    const { session, activeBoardId, swimlanes } = get();
    if (!session || !activeBoardId) return;
    const updated = swimlanes.map(s => s._id === swimlaneId ? { ...s, ...update } : s);
    set({ swimlanes: updated });
    if (session.isGuest) {
      const allSwimlanes = loadGuestData<Swimlane[]>(GUEST_SWIMLANES_KEY, []).map(s => s._id === swimlaneId ? { ...s, ...update } : s);
      saveGuestData(GUEST_SWIMLANES_KEY, allSwimlanes);
      return;
    }
    await wekanApi.updateSwimlane(session.serverUrl, session.token, activeBoardId, swimlaneId, update);
  },

  deleteSwimlane: async (swimlaneId) => {
    const { session, activeBoardId, swimlanes, activeSwimlaneId } = get();
    if (!session || !activeBoardId) return;
    const remaining = swimlanes.filter(s => s._id !== swimlaneId);
    set({
      swimlanes: remaining,
      activeSwimlaneId: activeSwimlaneId === swimlaneId ? 'all' : activeSwimlaneId,
    });
    if (session.isGuest) {
      const allSwimlanes = loadGuestData<Swimlane[]>(GUEST_SWIMLANES_KEY, []).filter(s => s._id !== swimlaneId);
      saveGuestData(GUEST_SWIMLANES_KEY, allSwimlanes);
      return;
    }
    await wekanApi.deleteSwimlane(session.serverUrl, session.token, activeBoardId, swimlaneId);
  },

  createCard: async (listId, title, description, customSwimlaneId) => {
    const { session, activeBoardId, swimlanes, cards, activeSwimlaneId } = get();
    if (!session || !activeBoardId) return '';
    const targetSwimlaneId = customSwimlaneId || (activeSwimlaneId !== 'all' ? activeSwimlaneId : (swimlanes[0]?._id || ''));
    const tempId = 'card_' + Date.now();
    const newCard: Card = {
      _id: tempId,
      title,
      description: description || '',
      boardId: activeBoardId,
      listId,
      swimlaneId: targetSwimlaneId,
      sort: cards.filter(c => c.listId === listId && (c.swimlaneId === targetSwimlaneId || !targetSwimlaneId)).length,
      userId: session.userId,
    };

    if (session.isGuest) {
      const updated = [...cards, newCard];
      set({ cards: updated });
      const allCards = [...loadGuestData<Card[]>(GUEST_CARDS_KEY, []).filter(c => c.boardId !== activeBoardId), ...updated];
      saveGuestData(GUEST_CARDS_KEY, allCards);
      return tempId;
    }

    set(state => ({ cards: [...state.cards, newCard] }));
    try {
      const res = await wekanApi.createCard(session.serverUrl, session.token, activeBoardId, listId, targetSwimlaneId, title, description, session.userId);
      const createdId = res._id || tempId;
      set(state => ({
        cards: state.cards.map(c => c._id === tempId ? { ...c, _id: createdId } : c),
      }));
      return createdId;
    } catch (e) {
      set(state => ({ cards: state.cards.filter(c => c._id !== tempId) }));
      throw e;
    }
  },

  reorderCards: async (sourceCardId, targetListId, targetIndex) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;

    const card = cards.find(c => c._id === sourceCardId);
    if (!card) return;

    const otherCardsInTargetList = cards
      .filter(c => c.listId === targetListId && c._id !== sourceCardId)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

    const insertIdx = targetIndex !== undefined
      ? Math.max(0, Math.min(targetIndex, otherCardsInTargetList.length))
      : otherCardsInTargetList.length;

    const updatedTargetList = [...otherCardsInTargetList];
    const movedCard = { ...card, listId: targetListId };
    updatedTargetList.splice(insertIdx, 0, movedCard);

    const reindexedTargetCards = updatedTargetList.map((c, idx) => ({ ...c, sort: idx }));
    const remainingCards = cards.filter(c => c.listId !== targetListId && c._id !== sourceCardId);
    const newAllCards = [...remainingCards, ...reindexedTargetCards];

    set({ cards: newAllCards });

    if (session.isGuest) {
      const otherBoardCards = loadGuestData<Card[]>(GUEST_CARDS_KEY, []).filter(c => c.boardId !== activeBoardId);
      saveGuestData(GUEST_CARDS_KEY, [...otherBoardCards, ...newAllCards]);
      return;
    }

    try {
      await wekanApi.moveCard(session.serverUrl, session.token, activeBoardId, card.listId, sourceCardId, targetListId, card.swimlaneId, insertIdx);
    } catch (err) {
      console.warn('Failed to move card:', err);
    }
  },

  setCardSwimlane: async (cardId, targetSwimlaneId) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card || card.swimlaneId === targetSwimlaneId) return;

    const updated = cards.map(c => c._id === cardId ? { ...c, swimlaneId: targetSwimlaneId } : c);
    set({ cards: updated });

    if (session.isGuest) {
      const allCards = loadGuestData<Card[]>(GUEST_CARDS_KEY, []).map(c => c._id === cardId ? { ...c, swimlaneId: targetSwimlaneId } : c);
      saveGuestData(GUEST_CARDS_KEY, allCards);
      return;
    }

    await wekanApi.moveCard(session.serverUrl, session.token, activeBoardId, card.listId, cardId, card.listId, targetSwimlaneId);
  },

  updateCard: async (cardId, updateData) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;

    const updated = cards.map(c => c._id === cardId ? { ...c, ...updateData } : c);
    set({ cards: updated });

    if (session.isGuest) {
      const allCards = loadGuestData<Card[]>(GUEST_CARDS_KEY, []).map(c => c._id === cardId ? { ...c, ...updateData } : c);
      saveGuestData(GUEST_CARDS_KEY, allCards);
      return;
    }

    await wekanApi.updateCard(session.serverUrl, session.token, activeBoardId, card.listId, cardId, updateData);
  },

  moveCard: async (cardId, targetListId, targetSwimlaneId, sort) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;
    const origListId = card.listId;
    const origSwimlaneId = card.swimlaneId;
    const origSort = card.sort;

    const updated = cards.map(c => {
      if (c._id === cardId) {
        return {
          ...c,
          listId: targetListId,
          ...(targetSwimlaneId ? { swimlaneId: targetSwimlaneId } : {}),
          ...(sort !== undefined ? { sort } : {}),
        };
      }
      return c;
    });

    set({ cards: updated });

    if (session.isGuest) {
      const allCards = loadGuestData<Card[]>(GUEST_CARDS_KEY, []).map(c => {
        if (c._id === cardId) {
          return {
            ...c,
            listId: targetListId,
            ...(targetSwimlaneId ? { swimlaneId: targetSwimlaneId } : {}),
            ...(sort !== undefined ? { sort } : {}),
          };
        }
        return c;
      });
      saveGuestData(GUEST_CARDS_KEY, allCards);
      return;
    }

    try {
      await wekanApi.moveCard(session.serverUrl, session.token, activeBoardId, origListId, cardId, targetListId, targetSwimlaneId, sort);
      // Trigger autonomous pipeline stage check on manual move
      const updatedCard = get().cards.find(c => c._id === cardId);
      if (updatedCard) {
        pipelineOrchestrator.handleCardTransition(updatedCard, origListId, get().lists, {
          boardId: activeBoardId,
          boardTitle: get().activeBoard?.title,
          swimlaneTitle: get().swimlanes.find(s => s._id === (targetSwimlaneId || origSwimlaneId))?.title,
          serverUrl: session.serverUrl,
          token: session.token,
          githubRepo: get().settings.githubRepo,
          githubPat: get().settings.githubPat,
        }).catch(err => console.warn('[BoardStore] Pipeline transition error:', err));
      }
    } catch (e) {
      set(state => ({
        cards: state.cards.map(c => c._id === cardId ? { ...c, listId: origListId, swimlaneId: origSwimlaneId, sort: origSort } : c),
      }));
    }
  },

  deleteCard: async (cardId) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;

    set(state => ({
      cards: state.cards.filter(c => c._id !== cardId),
      activeCardId: state.activeCardId === cardId ? null : state.activeCardId,
    }));

    if (session.isGuest) {
      const allCards = loadGuestData<Card[]>(GUEST_CARDS_KEY, []).filter(c => c._id !== cardId);
      saveGuestData(GUEST_CARDS_KEY, allCards);
      return;
    }

    await wekanApi.deleteCard(session.serverUrl, session.token, activeBoardId, card.listId, cardId);
  },

  setActiveCardId: (cardId) => set({ activeCardId: cardId }),

  setCardLabels: async (cardId, labelIds) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;
    get().updateCard(cardId, { labelIds });
  },

  setCardAssignees: async (cardId, assignees) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;
    get().updateCard(cardId, { assignees });
  },

  setCardMembers: async (cardId, members) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;
    get().updateCard(cardId, { members });
  },

  setCardCustomField: async (cardId, customFieldId, value) => {
    const { session, activeBoardId, cards } = get();
    if (!session || !activeBoardId) return;
    const card = cards.find(c => c._id === cardId);
    if (!card) return;
    const existing = card.customFields || [];
    const updated = existing.some(f => f._id === customFieldId)
      ? existing.map(f => f._id === customFieldId ? { _id: customFieldId, value } : f)
      : [...existing, { _id: customFieldId, value }];

    get().updateCard(cardId, { customFields: updated });
  },

  addComment: async (cardId, comment) => {
    const { session, activeBoardId, comments } = get();
    if (!session || !activeBoardId) return;

    if (session.isGuest) {
      const newComment: CardComment = {
        _id: `guest-cmt-${Date.now()}`,
        cardId,
        boardId: activeBoardId,
        userId: session.userId,
        text: comment,
        createdAt: new Date().toISOString(),
      };
      const updated = [...comments, newComment];
      set({ comments: updated });
      const allComments = [...loadGuestData<CardComment[]>(GUEST_COMMENTS_KEY, []).filter(c => c.boardId !== activeBoardId), ...updated];
      saveGuestData(GUEST_COMMENTS_KEY, allComments);
      return;
    }

    const res = await wekanApi.addComment(session.serverUrl, session.token, activeBoardId, cardId, comment);
    const newComment: CardComment = {
      _id: res._id,
      cardId,
      boardId: activeBoardId,
      userId: session.userId,
      text: comment,
      createdAt: new Date().toISOString(),
    };
    set(state => ({ comments: [...state.comments, newComment] }));
  },

  deleteComment: async (cardId, commentId) => {
    const { session, activeBoardId, comments } = get();
    if (!session || !activeBoardId) return;
    const updated = comments.filter(c => c._id !== commentId);
    set({ comments: updated });
    if (session.isGuest) {
      const allComments = loadGuestData<CardComment[]>(GUEST_COMMENTS_KEY, []).filter(c => c._id !== commentId);
      saveGuestData(GUEST_COMMENTS_KEY, allComments);
      return;
    }
    await wekanApi.deleteComment(session.serverUrl, session.token, activeBoardId, cardId, commentId);
  },

  createChecklist: async (cardId, title) => {
    const { session, activeBoardId, checklists } = get();
    if (!session || !activeBoardId) return;

    if (session.isGuest) {
      const newChecklist: Checklist = {
        _id: `guest-cl-${Date.now()}`,
        cardId,
        boardId: activeBoardId,
        title,
        sort: checklists.length,
      };
      const updated = [...checklists, newChecklist];
      set({ checklists: updated });
      const allChecklists = [...loadGuestData<Checklist[]>(GUEST_CHECKLISTS_KEY, []).filter(cl => cl.boardId !== activeBoardId), ...updated];
      saveGuestData(GUEST_CHECKLISTS_KEY, allChecklists);
      return;
    }

    const res = await wekanApi.createChecklist(session.serverUrl, session.token, activeBoardId, cardId, title);
    const newChecklist: Checklist = {
      _id: res._id,
      cardId,
      boardId: activeBoardId,
      title,
      sort: checklists.length,
    };
    set(state => ({ checklists: [...state.checklists, newChecklist] }));
  },

  deleteChecklist: async (cardId, checklistId) => {
    const { session, activeBoardId, checklists, checklistItems } = get();
    if (!session || !activeBoardId) return;
    const updatedCl = checklists.filter(c => c._id !== checklistId);
    const updatedItems = checklistItems.filter(i => i.checklistId !== checklistId);
    set({ checklists: updatedCl, checklistItems: updatedItems });
    if (session.isGuest) {
      const allChecklists = loadGuestData<Checklist[]>(GUEST_CHECKLISTS_KEY, []).filter(c => c._id !== checklistId);
      const allItems = loadGuestData<ChecklistItem[]>(GUEST_ITEMS_KEY, []).filter(i => i.checklistId !== checklistId);
      saveGuestData(GUEST_CHECKLISTS_KEY, allChecklists);
      saveGuestData(GUEST_ITEMS_KEY, allItems);
      return;
    }
    await wekanApi.deleteChecklist(session.serverUrl, session.token, activeBoardId, cardId, checklistId);
  },

  createChecklistItem: async (cardId, checklistId, title) => {
    const { session, activeBoardId, checklistItems } = get();
    if (!session || !activeBoardId) return;

    if (session.isGuest) {
      const newItem: ChecklistItem = {
        _id: `guest-item-${Date.now()}`,
        checklistId,
        cardId,
        title,
        isFinished: false,
        sort: checklistItems.length,
      };
      const updated = [...checklistItems, newItem];
      set({ checklistItems: updated });
      const allItems = [...loadGuestData<ChecklistItem[]>(GUEST_ITEMS_KEY, []).filter(i => i.checklistId !== checklistId), ...updated];
      saveGuestData(GUEST_ITEMS_KEY, allItems);
      return;
    }

    const res = await wekanApi.createChecklistItem(session.serverUrl, session.token, activeBoardId, cardId, checklistId, title);
    const newItem: ChecklistItem = {
      _id: res._id,
      checklistId,
      cardId,
      title,
      isFinished: false,
      sort: checklistItems.length,
    };
    set(state => ({ checklistItems: [...state.checklistItems, newItem] }));
  },

  updateChecklistItem: async (cardId, checklistId, itemId, isFinished) => {
    const { session, activeBoardId, checklistItems } = get();
    if (!session || !activeBoardId) return;
    const updated = checklistItems.map(i => i._id === itemId ? { ...i, isFinished } : i);
    set({ checklistItems: updated });
    if (session.isGuest) {
      const allItems = loadGuestData<ChecklistItem[]>(GUEST_ITEMS_KEY, []).map(i => i._id === itemId ? { ...i, isFinished } : i);
      saveGuestData(GUEST_ITEMS_KEY, allItems);
      return;
    }
    await wekanApi.updateChecklistItem(session.serverUrl, session.token, activeBoardId, cardId, checklistId, itemId, { isFinished });
  },

  deleteChecklistItem: async (cardId, checklistId, itemId) => {
    const { session, activeBoardId, checklistItems } = get();
    if (!session || !activeBoardId) return;
    const updated = checklistItems.filter(i => i._id !== itemId);
    set({ checklistItems: updated });
    if (session.isGuest) {
      const allItems = loadGuestData<ChecklistItem[]>(GUEST_ITEMS_KEY, []).filter(i => i._id !== itemId);
      saveGuestData(GUEST_ITEMS_KEY, allItems);
      return;
    }
    await wekanApi.deleteChecklistItem(session.serverUrl, session.token, activeBoardId, cardId, checklistId, itemId);
  },

  uploadAttachment: async (cardId, fileData, fileName, fileType) => {
    const { session, activeBoardId, attachments } = get();
    if (!session || !activeBoardId) return;
    const newAtt: Attachment = {
      _id: `att-${Date.now()}`,
      name: fileName,
      cardId,
      boardId: activeBoardId,
      type: fileType,
      size: fileData.length,
      url: fileData,
      uploadedAt: new Date().toISOString(),
    };
    const updated = [...attachments, newAtt];
    set({ attachments: updated });
    if (session.isGuest) {
      const allAttachments = [...loadGuestData<Attachment[]>(GUEST_ATTACHMENTS_KEY, []).filter(a => a.boardId !== activeBoardId), ...updated];
      saveGuestData(GUEST_ATTACHMENTS_KEY, allAttachments);
    }
  },

  deleteAttachment: async (attachmentId) => {
    const { session, activeBoardId, attachments } = get();
    if (!session || !activeBoardId) return;
    const updated = attachments.filter(a => a._id !== attachmentId);
    set({ attachments: updated });
    if (session.isGuest) {
      const allAttachments = loadGuestData<Attachment[]>(GUEST_ATTACHMENTS_KEY, []).filter(a => a._id !== attachmentId);
      saveGuestData(GUEST_ATTACHMENTS_KEY, allAttachments);
    }
  },

  createCustomField: async (cf) => {
    const { session, activeBoardId, customFields } = get();
    if (!session || !activeBoardId) return;
    if (session.isGuest) {
      const newField: CustomField = {
        _id: `guest-cf-${Date.now()}`,
        ...cf,
        boardIds: [activeBoardId],
      };
      const updated = [...customFields, newField];
      set({ customFields: updated });
      const allFields = [...loadGuestData<CustomField[]>(GUEST_CUSTOM_FIELDS_KEY, []).filter(f => !f.boardIds?.includes(activeBoardId)), ...updated];
      saveGuestData(GUEST_CUSTOM_FIELDS_KEY, allFields);
      return;
    }
    const res = await wekanApi.createCustomField(session.serverUrl, session.token, activeBoardId, cf);
    const newField: CustomField = {
      _id: res._id,
      ...cf,
      boardIds: [activeBoardId],
    };
    set(state => ({ customFields: [...state.customFields, newField] }));
  },

  updateCustomField: async (cfId, update) => {
    const { session, activeBoardId, customFields } = get();
    if (!session || !activeBoardId) return;
    const updated = customFields.map(f => f._id === cfId ? { ...f, ...update } : f);
    set({ customFields: updated });
    if (session.isGuest) {
      const allFields = loadGuestData<CustomField[]>(GUEST_CUSTOM_FIELDS_KEY, []).map(f => f._id === cfId ? { ...f, ...update } : f);
      saveGuestData(GUEST_CUSTOM_FIELDS_KEY, allFields);
      return;
    }
    await wekanApi.updateCustomField(session.serverUrl, session.token, activeBoardId, cfId, update);
  },

  deleteCustomField: async (cfId) => {
    const { session, activeBoardId, customFields } = get();
    if (!session || !activeBoardId) return;
    const updated = customFields.filter(f => f._id !== cfId);
    set({ customFields: updated });
    if (session.isGuest) {
      const allFields = loadGuestData<CustomField[]>(GUEST_CUSTOM_FIELDS_KEY, []).filter(f => f._id !== cfId);
      saveGuestData(GUEST_CUSTOM_FIELDS_KEY, allFields);
      return;
    }
    await wekanApi.deleteCustomField(session.serverUrl, session.token, activeBoardId, cfId);
  },

  setNewBoardModalOpen: (open) => set({ isNewBoardModalOpen: open }),
  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setCustomFieldsModalOpen: (open) => set({ isCustomFieldsModalOpen: open }),
  setMemberModalOpen: (open) => set({ isMemberModalOpen: open }),
  setActivityDrawerOpen: (open) => set({ isActivityDrawerOpen: open }),
  setGitHubModalOpen: (open) => set({ isGitHubModalOpen: open }),

  initDDP: async () => {
    const { session } = get();
    if (!session || session.isGuest) return;

    const wsUrl = session.serverUrl.replace(/^http/, 'ws') + '/websocket';

    ddpClient.on('status', (state: DDPConnectionState) => {
      set({ ddpState: state });
    });

    ddpClient.on('added', (collection, id, fields) => {
      if (collection === 'boards') {
        set(state => ({
          boards: state.boards.some(b => b._id === id) ? state.boards : [...state.boards, { _id: id, ...fields } as Board],
        }));
      } else if (collection === 'lists') {
        set(state => ({
          lists: state.lists.some(l => l._id === id) ? state.lists : [...state.lists, { _id: id, ...fields } as List],
        }));
      } else if (collection === 'swimlanes') {
        set(state => ({
          swimlanes: state.swimlanes.some(s => s._id === id) ? state.swimlanes : [...state.swimlanes, { _id: id, ...fields } as Swimlane],
        }));
      } else if (collection === 'cards') {
        set(state => ({
          cards: state.cards.some(c => c._id === id) ? state.cards : [...state.cards, { _id: id, ...fields } as Card],
        }));
      } else if (collection === 'card_comments') {
        set(state => ({
          comments: state.comments.some(c => c._id === id) ? state.comments : [...state.comments, { _id: id, ...fields } as CardComment],
        }));
      } else if (collection === 'checklists') {
        set(state => ({
          checklists: state.checklists.some(c => c._id === id) ? state.checklists : [...state.checklists, { _id: id, ...fields } as Checklist],
        }));
      } else if (collection === 'checklistItems') {
        set(state => ({
          checklistItems: state.checklistItems.some(i => i._id === id) ? state.checklistItems : [...state.checklistItems, { _id: id, ...fields } as ChecklistItem],
        }));
      } else if (collection === 'attachments') {
        set(state => ({
          attachments: state.attachments.some(a => a._id === id) ? state.attachments : [...state.attachments, { _id: id, ...fields } as Attachment],
        }));
      } else if (collection === 'custom_fields') {
        set(state => ({
          customFields: state.customFields.some(f => f._id === id) ? state.customFields : [...state.customFields, { _id: id, ...fields } as CustomField],
        }));
      } else if (collection === 'activities') {
        set(state => ({
          activities: state.activities.some(a => a._id === id) ? state.activities : [{ _id: id, ...fields } as Activity, ...state.activities],
        }));
      }
    });

    ddpClient.on('changed', (collection, id, fields) => {
      if (collection === 'boards') {
        set(state => ({
          boards: state.boards.map(b => b._id === id ? { ...b, ...fields } : b),
          activeBoard: state.activeBoard?._id === id ? { ...state.activeBoard, ...fields } : state.activeBoard,
        }));
      } else if (collection === 'lists') {
        set(state => ({
          lists: state.lists.map(l => l._id === id ? { ...l, ...fields } : l),
        }));
      } else if (collection === 'swimlanes') {
        set(state => ({
          swimlanes: state.swimlanes.map(s => s._id === id ? { ...s, ...fields } : s),
        }));
      } else if (collection === 'cards') {
        const prevCard = get().cards.find(c => c._id === id);
        const prevListId = prevCard?.listId;

        set(state => ({
          cards: state.cards.map(c => c._id === id ? { ...c, ...fields } : c),
        }));

        // If listId changed via real-time DDP sync, trigger pipeline transition
        if (fields.listId && fields.listId !== prevListId) {
          const updatedCard = get().cards.find(c => c._id === id);
          if (updatedCard) {
            pipelineOrchestrator.handleCardTransition(updatedCard, prevListId, get().lists, {
              boardId: get().activeBoardId || updatedCard.boardId,
              boardTitle: get().activeBoard?.title,
              swimlaneTitle: get().swimlanes.find(s => s._id === updatedCard.swimlaneId)?.title,
              serverUrl: get().session?.serverUrl,
              token: get().session?.token,
              githubRepo: get().settings.githubRepo,
              githubPat: get().settings.githubPat,
            }).catch(err => console.warn('[BoardStore] DDP pipeline transition error:', err));
          }
        }
      } else if (collection === 'card_comments') {
        set(state => ({
          comments: state.comments.map(c => c._id === id ? { ...c, ...fields } : c),
        }));
      } else if (collection === 'checklists') {
        set(state => ({
          checklists: state.checklists.map(c => c._id === id ? { ...c, ...fields } : c),
        }));
      } else if (collection === 'checklistItems') {
        set(state => ({
          checklistItems: state.checklistItems.map(i => i._id === id ? { ...i, ...fields } : i),
        }));
      } else if (collection === 'attachments') {
        set(state => ({
          attachments: state.attachments.map(a => a._id === id ? { ...a, ...fields } : a),
        }));
      } else if (collection === 'custom_fields') {
        set(state => ({
          customFields: state.customFields.map(f => f._id === id ? { ...f, ...fields } : f),
        }));
      }
    });

    ddpClient.on('removed', (collection, id) => {
      if (collection === 'boards') {
        set(state => ({ boards: state.boards.filter(b => b._id !== id) }));
      } else if (collection === 'lists') {
        set(state => ({ lists: state.lists.filter(l => l._id !== id) }));
      } else if (collection === 'swimlanes') {
        set(state => ({ swimlanes: state.swimlanes.filter(s => s._id !== id) }));
      } else if (collection === 'cards') {
        set(state => ({ cards: state.cards.filter(c => c._id !== id) }));
      } else if (collection === 'card_comments') {
        set(state => ({ comments: state.comments.filter(c => c._id !== id) }));
      } else if (collection === 'checklists') {
        set(state => ({ checklists: state.checklists.filter(c => c._id !== id) }));
      } else if (collection === 'checklistItems') {
        set(state => ({ checklistItems: state.checklistItems.filter(i => i._id !== id) }));
      } else if (collection === 'attachments') {
        set(state => ({ attachments: state.attachments.filter(a => a._id !== id) }));
      } else if (collection === 'custom_fields') {
        set(state => ({ customFields: state.customFields.filter(f => f._id !== id) }));
      }
    });

    try {
      await ddpClient.connect(wsUrl);
      await ddpClient.loginWithToken(session.token);
      if (get().activeBoardId) {
        await ddpClient.subscribe('board', [get().activeBoardId, false]);
        await ddpClient.subscribe('activities', ['board', [get().activeBoardId], 50, true]);
      }
    } catch (e) {
      console.error('DDP connection error:', e);
    }
  },
}));
