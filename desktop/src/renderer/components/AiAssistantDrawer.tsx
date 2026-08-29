import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBoardStore } from '../store/boardStore';
import { AiService, AiConfig, parseActionsFromText, BoardAction, AttachedImage } from '../lib/aiService';
import { parseAttachedFile, AttachedDocument } from '../lib/documentParser';
import { renderMarkdown } from '../lib/markdownRenderer';
import { LumoraLogo } from './LumoraLogo';
import {
  X, ArrowUp, Loader2, Settings2, Zap, TrendingUp, CheckCircle2,
  Copy, Check, Layers, ArrowRight, ExternalLink, Cpu, AlertTriangle,
  Terminal, ListChecks, History, Plus, Trash2, RotateCcw, ToggleLeft,
  ToggleRight, ChevronLeft, ChevronRight, Bot, Move, FilePlus, Edit3,
  Navigation, Wrench, MessageSquare, FolderKanban, Undo2, Paperclip,
  Image as ImageIcon, Calendar, Clock, AlertCircle, Maximize2, CheckSquare,
  FileSpreadsheet, FileText,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time?: string;
  images?: AttachedImage[];
  executedActions?: BoardAction[];
  actionError?: string;
  undoSnapshot?: UndoEntry[];
  suggestedQuestions?: string[];
}

interface UndoEntry {
  type: string;
  description: string;
  inverse: () => Promise<void>;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const LS = {
  get: (k: string, fallback: any = null) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  str: (k: string, fb = '') => localStorage.getItem(k) || fb,
};

const HISTORIES_KEY = 'kanso_copilot_histories';
const ACTIVE_CONV_KEY = 'kanso_copilot_active_conv';
const ACTIONS_MODE_KEY = 'kanso_copilot_actions_mode';
const DRAWER_WIDTH_KEY = 'kanso_copilot_width';
const HISTORY_OPEN_KEY = 'kanso_copilot_history_open';

function makeId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function makeConv(title = 'New Chat'): Conversation {
  return { id: makeId(), title, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
function timeStr() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function titleFromMessages(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  return first.content.slice(0, 40) + (first.content.length > 40 ? '…' : '');
}

const fileToAttachedImage = (file: File): Promise<AttachedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve({
        base64,
        mimeType: file.type || 'image/png',
        name: file.name || 'screenshot.png',
        previewUrl: result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "I have visual and workspace awareness of your projects. Ask questions, attach error screenshots, generate technical specs, or trigger autonomous coding workflows.",
  time: 'Just now',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const {
    boards, activeBoard, activeBoardId, lists, cards, swimlanes,
    setActiveView, switchBoard, createCard, updateCard, moveCard, deleteCard,
    uploadAttachment,
  } = useBoardStore();

  // ─── Conversation history ───────────────────────────────────────────────
  const [histories, setHistories] = useState<Conversation[]>(() => LS.get(HISTORIES_KEY, []));
  const [activeConvId, setActiveConvId] = useState<string>(() => LS.str(ACTIVE_CONV_KEY, ''));
  const [historyOpen, setHistoryOpen] = useState<boolean>(() => LS.get(HISTORY_OPEN_KEY, false));

  // Derive active conversation
  const activeConv = histories.find(h => h.id === activeConvId) || null;
  const messages: ChatMessage[] = activeConv ? activeConv.messages : [WELCOME_MSG];

  const persistHistories = useCallback((newHistories: Conversation[]) => {
    setHistories(newHistories);
    LS.set(HISTORIES_KEY, newHistories);
  }, []);

  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setHistories(prev => {
      const newMsgs = typeof updater === 'function'
        ? updater(prev.find(h => h.id === activeConvId)?.messages || [])
        : updater;
      const existing = prev.find(h => h.id === activeConvId);
      if (!existing) {
        const newConv: Conversation = {
          ...makeConv(titleFromMessages(newMsgs)),
          messages: newMsgs,
          updatedAt: new Date().toISOString(),
        };
        const updated = [newConv, ...prev];
        LS.set(HISTORIES_KEY, updated);
        setActiveConvId(newConv.id);
        LS.set(ACTIVE_CONV_KEY, newConv.id);
        return updated;
      }
      const updated = prev.map(h =>
        h.id === activeConvId
          ? { ...h, messages: newMsgs, title: titleFromMessages(newMsgs), updatedAt: new Date().toISOString() }
          : h
      );
      LS.set(HISTORIES_KEY, updated);
      return updated;
    });
  }, [activeConvId]);

  const startNewConversation = useCallback(() => {
    const newConv = makeConv();
    const updated = [newConv, ...histories];
    persistHistories(updated);
    setActiveConvId(newConv.id);
    LS.set(ACTIVE_CONV_KEY, newConv.id);
  }, [histories, persistHistories]);

  const deleteConversation = useCallback((convId: string) => {
    const updated = histories.filter(h => h.id !== convId);
    persistHistories(updated);
    if (activeConvId === convId) {
      const nextId = updated[0]?.id || '';
      setActiveConvId(nextId);
      LS.set(ACTIVE_CONV_KEY, nextId);
    }
  }, [histories, activeConvId, persistHistories]);

  const switchConversation = useCallback((convId: string) => {
    setActiveConvId(convId);
    LS.set(ACTIVE_CONV_KEY, convId);
  }, []);

  // ─── Actions mode & undo ────────────────────────────────────────────────
  const [actionsEnabled, setActionsEnabled] = useState<boolean>(() => LS.get(ACTIONS_MODE_KEY, false));
  const [undoStack, setUndoStack] = useState<{ convMsgId: string; entries: UndoEntry[] }[]>([]);

  const toggleActionsMode = useCallback((forceOn?: boolean) => {
    setActionsEnabled(prev => {
      const next = forceOn !== undefined ? forceOn : !prev;
      LS.set(ACTIONS_MODE_KEY, next);
      return next;
    });
  }, []);

  // ─── Image & Document attachments state ────────────────────────────────
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocument[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Config ─────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [aiProvider, setAiProvider] = useState<'codex' | 'gemini' | 'ollama'>(
    (localStorage.getItem('kanso_ai_provider') as any) || 'codex'
  );
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  // ─── Slash command palette ────────────────────────────────────────────────
  const [slashPaletteOpen, setSlashPaletteOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashHighlight, setSlashHighlight] = useState(0);

  interface SlashCommand {
    cmd: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    action: 'send' | 'toggle' | 'nav' | 'attach';
    prompt?: string;
  }

  const slashCommands: SlashCommand[] = [
    { cmd: '/issue', label: 'Report Bug / Issue', description: 'Log a bug with steps, logs, and screenshots', icon: <AlertTriangle size={12} />, color: 'var(--danger)', action: 'send', prompt: 'I want to report an issue. Please analyze my description and any attached screenshots, draft the bug report with reproduction steps, and ask follow-up questions needed to file it in Reported Issues.' },
    { cmd: '/build', label: 'Task Builder & Intake Form', description: 'Interactive intake form & follow-up questions', icon: <FilePlus size={12} />, color: 'var(--accent-blue)', action: 'send', prompt: 'I want to build a new task. Please ask me the 4 key questions in a structured form (1. Title/Goal, 2. Target Project & Column, 3. Steps/Scenario & Severity, 4. Deadline) or analyze any attached screenshots to fill it in.' },
    { cmd: '/attach', label: 'Attach Screenshot / Image', description: 'Analyze UI or error screenshots', icon: <Paperclip size={12} />, color: 'var(--accent-blue)', action: 'attach' },
    { cmd: '/actions', label: 'Toggle Actions Mode', description: actionsEnabled ? 'Turn OFF board editing' : 'Turn ON board editing', icon: <Wrench size={12} />, color: actionsEnabled ? 'var(--accent-amber)' : 'var(--accent-green)', action: 'toggle' },
    { cmd: '/sprint', label: 'Sprint Diagnostic', description: 'Analyze board health & bottlenecks', icon: <TrendingUp size={12} />, color: 'var(--accent-blue)', action: 'send', prompt: 'Run a full sprint diagnostic on this board. Identify overdue items, WIP bottlenecks, backlog depth, and suggest the top 3 concrete actions to take now.' },
    { cmd: '/prioritize', label: 'Prioritize Backlog', description: 'P1/P2/P3 ranking with reasoning', icon: <Zap size={12} />, color: 'var(--accent-amber)', action: 'send', prompt: 'Review all cards in Backlog. Rank them by urgency and technical complexity. Give me a P1/P2/P3 priority list with reasoning for each.' },
    { cmd: '/summary', label: 'Board Summary', description: 'Table view of all cards by column', icon: <ListChecks size={12} />, color: 'var(--accent-purple)', action: 'send', prompt: 'List all cards on this board organized by column as a Markdown table: card name, subfolder, and due date.' },
    { cmd: '/criteria', label: 'Acceptance Criteria', description: 'Generate spec for top 3 cards', icon: <CheckCircle2 size={12} />, color: 'var(--accent-green)', action: 'send', prompt: 'For the top 3 cards on this board, generate detailed technical acceptance criteria in Gherkin format.' },
    { cmd: '/move', label: 'Move Cards', description: 'Move top tasks to In Progress', icon: <Move size={12} />, color: 'var(--accent-green)', action: 'send', prompt: 'Review the Backlog. Move the 2 most important cards to In Progress and explain your reasoning.' },
    { cmd: '/create', label: 'Create Card', description: 'Add a new card to the board', icon: <FilePlus size={12} />, color: 'var(--accent-blue)', action: 'send', prompt: `Create a new card called "New Task - ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}" in the Backlog.` },
    { cmd: '/settings', label: 'Open Settings', description: 'Navigate to settings view', icon: <Settings2 size={12} />, color: 'var(--text-muted)', action: 'nav' },
    { cmd: '/new', label: 'New Chat', description: 'Start a fresh conversation', icon: <Plus size={12} />, color: 'var(--text-muted)', action: 'nav' },
  ];

  const filteredSlash = slashCommands.filter(c =>
    c.cmd.includes(slashFilter.toLowerCase()) || c.label.toLowerCase().includes(slashFilter.slice(1).toLowerCase())
  );

  const handleInputChange = (val: string) => {
    setInputText(val);
    if (val.startsWith('/')) {
      setSlashPaletteOpen(true);
      setSlashFilter(val);
      setSlashHighlight(0);
    } else {
      setSlashPaletteOpen(false);
      setSlashFilter('');
    }
  };

  const executeSlashCommand = (cmd: SlashCommand) => {
    setSlashPaletteOpen(false);
    setInputText('');
    if (cmd.action === 'attach') {
      fileInputRef.current?.click();
    } else if (cmd.action === 'toggle') {
      toggleActionsMode();
    } else if (cmd.action === 'nav') {
      if (cmd.cmd === '/settings') { onClose(); setActiveView('settings'); }
      else if (cmd.cmd === '/new') { startNewConversation(); }
    } else if (cmd.action === 'send' && cmd.prompt) {
      handleSendMessage(cmd.prompt);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashPaletteOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashHighlight(h => Math.min(h + 1, filteredSlash.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashHighlight(h => Math.max(h - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (filteredSlash[slashHighlight]) executeSlashCommand(filteredSlash[slashHighlight]); return; }
      if (e.key === 'Escape') { setSlashPaletteOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !slashPaletteOpen) { e.preventDefault(); handleSendMessage(); }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        try {
          const doc = await parseAttachedFile(file);
          setAttachedDocs(prev => [...prev, doc]);
          if (doc.attachedImage) {
            setAttachedImages(prev => [...prev, doc.attachedImage!]);
          }
        } catch (err: any) {
          console.warn('Failed to parse file:', err);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const doc = await parseAttachedFile(file);
          setAttachedDocs(prev => [...prev, doc]);
          if (doc.attachedImage) {
            setAttachedImages(prev => [...prev, doc.attachedImage!]);
          }
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      for (const file of files) {
        try {
          const doc = await parseAttachedFile(file);
          setAttachedDocs(prev => [...prev, doc]);
          if (doc.attachedImage) {
            setAttachedImages(prev => [...prev, doc.attachedImage!]);
          }
        } catch (err: any) {
          console.warn('Failed to parse dropped file:', err);
        }
      }
    }
  };

  const removeAttachedDoc = (idx: number) => {
    const doc = attachedDocs[idx];
    setAttachedDocs(prev => prev.filter((_, i) => i !== idx));
    if (doc?.attachedImage) {
      setAttachedImages(prev => prev.filter(img => img.name !== doc.name));
    }
  };

  // ─── Resizable width ────────────────────────────────────────────────────
  const MIN_WIDTH = 380;
  const MAX_WIDTH = 920;
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem(DRAWER_WIDTH_KEY);
    return saved ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(saved, 10))) : 560;
  });
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = drawerWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + startX.current - ev.clientX));
      setDrawerWidth(newW);
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDrawerWidth(prev => { localStorage.setItem(DRAWER_WIDTH_KEY, String(prev)); return prev; });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [drawerWidth]);

  // ─── Refs ────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(localStorage.getItem('kanso_gemini_key') || '');
      setAiProvider((localStorage.getItem('kanso_ai_provider') as any) || 'gemini');
      setOllamaEndpoint(localStorage.getItem('kanso_ollama_endpoint') || 'http://localhost:11434');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const getAiConfig = (): AiConfig => ({
    provider: aiProvider,
    geminiApiKey: apiKeyInput.trim() || localStorage.getItem('kanso_gemini_key') || '',
    geminiModel: localStorage.getItem('kanso_gemini_model') || 'gemini-3.6-flash',
    ollamaEndpoint: ollamaEndpoint.trim() || localStorage.getItem('kanso_ollama_endpoint') || 'http://localhost:11434',
    ollamaModel: localStorage.getItem('kanso_ollama_model') || 'llama3.2',
    reasoningLevel: (localStorage.getItem('kanso_gemini_reasoning') as any) || 'medium',
  });

  const handleSaveConfig = () => {
    localStorage.setItem('kanso_ai_provider', aiProvider);
    localStorage.setItem('kanso_gemini_key', apiKeyInput.trim());
    localStorage.setItem('kanso_ollama_endpoint', ollamaEndpoint.trim());
    setShowConfig(false);
  };

  // ─── Board Action Execution ───────────────────────────────────────────────
  const executeBoardActions = async (
    actions: BoardAction[],
    actionImages?: AttachedImage[]
  ): Promise<{ executed: BoardAction[]; errors: string[]; undoEntries: UndoEntry[] }> => {
    const executed: BoardAction[] = [];
    const errors: string[] = [];
    const undoEntries: UndoEntry[] = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'CREATE_CARD': {
            const { listId, title, swimlaneId, description, dueDays } = action.params;
            if (!listId || !title) { errors.push(`CREATE_CARD: missing listId or title`); break; }
            if (!lists.find(l => l._id === listId)) { errors.push(`CREATE_CARD: list "${listId}" not found`); break; }
            const newId = await createCard(listId, title, description || undefined, swimlaneId || undefined);
            if (newId && dueDays) {
              const days = parseInt(dueDays, 10);
              if (!isNaN(days) && days > 0) {
                const dueAt = new Date();
                dueAt.setDate(dueAt.getDate() + days);
                await updateCard(newId as string, { dueAt });
              }
            }
            // Save attached screenshots/images directly as real attachments on the card
            if (newId && actionImages && actionImages.length > 0) {
              for (const img of actionImages) {
                try {
                  await uploadAttachment(newId as string, img.previewUrl, img.name, img.mimeType);
                } catch (attErr) {
                  console.warn('Failed to upload image attachment to created card:', attErr);
                }
              }
            }
            executed.push({
              ...action,
              params: {
                ...action.params,
                attachedCount: actionImages && actionImages.length > 0 ? String(actionImages.length) : '0',
              },
            });
            undoEntries.push({
              type: 'DELETE_CARD',
              description: `Undo: delete created card "${title}"`,
              inverse: async () => { if (newId) await deleteCard(newId as string); },
            });
            break;
          }
          case 'MOVE_CARD': {
            const { cardId, toListId, toSwimlaneId } = action.params;
            if (!cardId || !toListId) { errors.push(`MOVE_CARD: missing cardId or toListId`); break; }
            const card = cards.find(c => c._id === cardId);
            if (!card) { errors.push(`MOVE_CARD: card "${cardId}" not found`); break; }
            if (!lists.find(l => l._id === toListId)) { errors.push(`MOVE_CARD: list "${toListId}" not found`); break; }
            const origListId = card.listId;
            const origSwId = card.swimlaneId;
            await moveCard(cardId, toListId, toSwimlaneId || undefined);
            executed.push(action);
            undoEntries.push({
              type: 'MOVE_CARD',
              description: `Undo: move "${card.title}" back to "${lists.find(l => l._id === origListId)?.title || origListId}"`,
              inverse: async () => { await moveCard(cardId, origListId, origSwId || undefined); },
            });
            break;
          }
          case 'UPDATE_CARD': {
            const { cardId, title, description } = action.params;
            if (!cardId) { errors.push(`UPDATE_CARD: missing cardId`); break; }
            const card = cards.find(c => c._id === cardId);
            if (!card) { errors.push(`UPDATE_CARD: card "${cardId}" not found`); break; }
            const origTitle = card.title;
            const origDesc = card.description;
            const upd: any = {};
            if (title) upd.title = title;
            if (description) upd.description = description;
            await updateCard(cardId, upd);
            executed.push(action);
            undoEntries.push({
              type: 'UPDATE_CARD',
              description: `Undo: revert "${origTitle}" changes`,
              inverse: async () => { await updateCard(cardId, { title: origTitle, description: origDesc }); },
            });
            break;
          }
          case 'DELETE_CARD': {
            const { cardId } = action.params;
            if (!cardId) { errors.push(`DELETE_CARD: missing cardId`); break; }
            const card = cards.find(c => c._id === cardId);
            if (!card) { errors.push(`DELETE_CARD: card "${cardId}" not found`); break; }
            const snap = { ...card };
            await deleteCard(cardId);
            executed.push(action);
            undoEntries.push({
              type: 'RESTORE_CARD',
              description: `Undo: restore deleted card "${snap.title}"`,
              inverse: async () => { await createCard(snap.listId, snap.title, snap.description, snap.swimlaneId); },
            });
            break;
          }
          case 'NAVIGATE_PROJECT': {
            const { boardId } = action.params;
            if (!boardId) { errors.push(`NAVIGATE_PROJECT: missing boardId`); break; }
            await switchBoard(boardId, 'board');
            executed.push(action);
            break;
          }
          case 'NAVIGATE_VIEW': {
            const { view } = action.params;
            if (!view) { errors.push(`NAVIGATE_VIEW: missing view`); break; }
            setActiveView(view as any);
            executed.push(action);
            break;
          }
          default:
            errors.push(`Unknown action: ${action.type}`);
        }
      } catch (err: any) {
        errors.push(`${action.type} failed: ${err.message}`);
      }
    }
    return { executed, errors, undoEntries };
  };

  // ─── Undo a message's actions ─────────────────────────────────────────────
  const handleUndo = async (msgId: string) => {
    const entry = undoStack.find(u => u.convMsgId === msgId);
    if (!entry) return;
    for (const e of [...entry.entries].reverse()) {
      try { await e.inverse(); } catch {}
    }
    setUndoStack(prev => prev.filter(u => u.convMsgId !== msgId));
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, executedActions: [], actionError: undefined, content: m.content + '\n\n> ↩ **Actions undone.** Changes reverted.' }
        : m
    ));
  };

  // ─── Quick action from assistant message ──────────────────────────────────
  const handleQuickCreateTask = async (title: string, listTitle?: string, desc?: string, days = 7) => {
    let targetList = listTitle ? lists.find(l => l.title.toLowerCase().includes(listTitle.toLowerCase())) : null;
    if (!targetList) {
      targetList = lists.find(l => /issue|bug|report|backlog|to do/i.test(l.title)) || lists[0];
    }
    if (!targetList) return;

    const newId = await createCard(targetList._id, title, desc || undefined, swimlanes[0]?._id);
    if (newId && days > 0) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + days);
      await updateCard(newId as string, { dueAt });
    }
    const receiptMsg: ChatMessage = {
      id: makeId(),
      role: 'assistant',
      time: timeStr(),
      content: `✅ Created task **"${title}"** in **${targetList.title}** (Deadline: ${days} days).`,
      executedActions: [{ type: 'CREATE_CARD', params: { listId: targetList._id, title } }],
    };
    setMessages(prev => [...prev, receiptMsg]);
  };

  // ─── Send Message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputText;
    const imagesToSend = [...attachedImages];
    const docsToSend = [...attachedDocs];
    if ((!promptToSend.trim() && imagesToSend.length === 0 && docsToSend.length === 0) || isLoading) return;

    const ts = timeStr();
    let userDisplayContent = promptToSend.trim();
    if (!userDisplayContent && docsToSend.length > 0) {
      userDisplayContent = `Attached ${docsToSend.length} document(s) / spreadsheet(s) for task synthesis:\n` +
        docsToSend.map(d => `- **${d.name}** (${d.summary})`).join('\n');
    }

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: userDisplayContent,
      images: imagesToSend.length > 0 ? imagesToSend : undefined,
      time: ts,
    };
    const prevMsgs = activeConv ? activeConv.messages : [];
    const newMsgs = [...prevMsgs, userMsg];
    setMessages(newMsgs);
    setInputText('');
    setAttachedImages([]);
    setAttachedDocs([]);
    setIsLoading(true);

    try {
      const config = getAiConfig();
      const boardContext = {
        allBoards: boards.map(b => ({ id: b._id, title: b.title })),
        activeBoardId: activeBoardId || '',
        boardTitle: activeBoard?.title || 'Current Board',
        subfolders: swimlanes.map(s => ({ id: s._id, title: s.title })),
        lists: lists.map(l => ({ id: l._id, title: l.title, cardCount: cards.filter(c => c.listId === l._id).length })),
        cards: cards.map(c => ({
          id: c._id, title: c.title,
          listTitle: lists.find(l => l._id === c.listId)?.title || 'Unknown', listId: c.listId,
          swimlaneTitle: swimlanes.find(s => s._id === c.swimlaneId)?.title || 'Unknown', swimlaneId: c.swimlaneId || '',
          dueAt: c.dueAt ? String(c.dueAt) : undefined, description: c.description,
        })),
        totalCards: cards.length,
      };

      const rawResponse = await AiService.chatWithBoard(newMsgs, boardContext, config, imagesToSend, docsToSend);
      const { cleanText, actions } = parseActionsFromText(rawResponse);

      let executedActions: BoardAction[] = [];
      let actionError: string | undefined;
      let undoEntries: UndoEntry[] = [];
      const assistantMsgId = makeId();

      // Collect images from current message or recent user message
      const effectiveImages = imagesToSend.length > 0
        ? imagesToSend
        : (newMsgs[newMsgs.length - 1]?.images || []);

      if (actions.length > 0 && actionsEnabled) {
        const result = await executeBoardActions(actions, effectiveImages);
        executedActions = result.executed;
        undoEntries = result.undoEntries;
        if (result.errors.length > 0) actionError = result.errors.join('; ');
      } else if (actions.length > 0 && !actionsEnabled) {
        actionError = `⚠ Actions mode is OFF — ${actions.length} board action(s) were blocked. Enable Actions Mode in the header or type /actions to allow automatic modifications.`;
      }

      // Extract clarifying questions if AI posed questions
      const questionMatches = cleanText.match(/\?(\s+|$)/g);
      const hasQuestions = questionMatches && questionMatches.length > 0;

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: cleanText,
        time: timeStr(),
        executedActions,
        actionError,
        undoSnapshot: undoEntries.length > 0 ? undoEntries : undefined,
      };

      if (undoEntries.length > 0) {
        setUndoStack(prev => [...prev, { convMsgId: assistantMsgId, entries: undoEntries }]);
      }

      setMessages([...newMsgs, assistantMsg]);
    } catch (err: any) {
      setMessages([...newMsgs, {
        id: makeId(), role: 'assistant', time: timeStr(),
        content: `⚠️ **Copilot Error**: ${err.message || 'Could not connect to AI. Check your API key in Settings.'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const activeModelLabel = (localStorage.getItem('kanso_gemini_model') || 'gemini-3.6-flash')
    .replace('gemini-', 'Gemini ').replace(/-flash-lite/, ' Flash Lite').replace(/-flash/, ' Flash');

  const historyPanelWidth = historyOpen ? 200 : 0;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      {/* Hidden file input for screenshot/image/spreadsheet upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*, .xlsx, .xls, .csv, .tsv, .json, .txt, .md, .log"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* ── Outer shell (resize + panels) ──────────────────────────────── */}
      <div
        style={{
          width: `${drawerWidth}px`,
          maxWidth: '94vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={e => e.stopPropagation()}
        onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDraggingOver(false); }}
        onDrop={handleDrop}
      >
        {/* Resize grip */}
        <div
          onMouseDown={handleResizeMouseDown}
          title="Drag to resize"
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', cursor: 'ew-resize', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="resize-grip" style={{ width: '3px', height: '48px', borderRadius: '99px', background: 'var(--border-medium)', opacity: 0, transition: 'opacity 180ms' }} />
        </div>

        {/* ── History Sidebar ──────────────────────────────────────────── */}
        <div
          style={{
            width: historyOpen ? `${historyPanelWidth}px` : '0',
            minWidth: historyOpen ? `${historyPanelWidth}px` : '0',
            overflow: 'hidden',
            background: 'var(--bg-sidebar)',
            borderRight: historyOpen ? '1px solid var(--border-subtle)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 220ms cubic-bezier(0.22,1,0.36,1), min-width 220ms cubic-bezier(0.22,1,0.36,1)',
            flexShrink: 0,
          }}
        >
          {historyOpen && (
            <>
              <div style={{ padding: '14px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>History</span>
                <button
                  type="button"
                  onClick={startNewConversation}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', padding: '2px', borderRadius: 'var(--r-xs)', display: 'flex' }}
                  title="New chat"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                {histories.length === 0 ? (
                  <div style={{ padding: '16px 8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>No history yet</div>
                ) : (
                  histories.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => switchConversation(conv.id)}
                      style={{
                        padding: '7px 9px',
                        borderRadius: 'var(--r-sm)',
                        cursor: 'pointer',
                        background: conv.id === activeConvId ? 'var(--bg-button-hover)' : 'transparent',
                        border: conv.id === activeConvId ? '1px solid var(--border-medium)' : '1px solid transparent',
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '4px',
                        transition: 'all 120ms',
                      }}
                      onMouseEnter={e => { if (conv.id !== activeConvId) e.currentTarget.style.background = 'var(--bg-button-subtle)'; }}
                      onMouseLeave={e => { if (conv.id !== activeConvId) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.title}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {relTime(conv.updatedAt)} · {conv.messages.length} msgs
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '1px', opacity: 0.6, flexShrink: 0 }}
                        title="Delete conversation"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Main Chat Panel ──────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-canvas)',
            borderLeft: '1px solid var(--border-card)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Drag and drop overlay banner */}
          {isDraggingOver && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(35,131,226,0.15)', border: '2px dashed var(--accent-blue)', backdropFilter: 'blur(4px)', zIndex: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', pointerEvents: 'none' }}>
              <ImageIcon size={32} style={{ color: 'var(--accent-blue)' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Drop screenshots to analyze</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Copilot will diagnose the issue and draft your task</div>
            </div>
          )}

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-header)', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button type="button" onClick={() => { setHistoryOpen(p => { LS.set(HISTORY_OPEN_KEY, !p); return !p; }); }} className="btn-icon" title={historyOpen ? 'Hide history' : 'Show history'} style={{ color: historyOpen ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
              <History size={14} />
            </button>

            <LumoraLogo size={16} showText={false} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Lumora Copilot</span>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--r-full)', background: aiProvider === 'codex' ? 'rgba(129,140,248,0.15)' : 'rgba(77,171,98,0.12)', color: aiProvider === 'codex' ? '#818cf8' : 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: aiProvider === 'codex' ? '#818cf8' : 'var(--accent-green)' }} />
                  {aiProvider === 'codex' ? 'Codex ACP (OS Auth)' : aiProvider === 'gemini' ? activeModelLabel : 'Ollama'}
                </span>
              </div>
            </div>

            {/* Actions toggle — compact icon-only with colored dot */}
            <button type="button" onClick={() => toggleActionsMode()}
              title={actionsEnabled ? 'Actions ON — click to disable board edits' : 'Actions OFF — click to enable board edits (or type /actions)'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: 'var(--r-full)', border: `1px solid ${actionsEnabled ? 'rgba(77,171,98,0.35)' : 'var(--border-subtle)'}`, background: actionsEnabled ? 'rgba(77,171,98,0.08)' : 'transparent', cursor: 'pointer', transition: 'all 140ms', flexShrink: 0 }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: actionsEnabled ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0, transition: 'background 140ms' }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: actionsEnabled ? 'var(--accent-green)' : 'var(--text-muted)', letterSpacing: '0.01em' }}>{actionsEnabled ? 'Actions' : 'Actions'}</span>
            </button>

            <button onClick={() => setShowConfig(!showConfig)} className="btn-icon" title="Configure AI" style={{ color: showConfig ? 'var(--accent-blue)' : undefined }}><Settings2 size={14} /></button>
            <button onClick={startNewConversation} className="btn-icon" title="New chat"><Plus size={14} /></button>
            <button onClick={onClose} className="btn-icon" title="Close"><X size={14} /></button>
          </div>

          {/* ── Context bar ────────────────────────────────────────────── */}
          <div style={{ padding: '5px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', flexShrink: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FolderKanban size={10} style={{ color: 'var(--accent-blue)' }} />
              <span><strong style={{ color: 'var(--text-secondary)' }}>{activeBoard?.title || 'Workspace'}</strong> — {cards.length} cards · {lists.length} cols · {swimlanes.length} subfolders · {boards.length} projects</span>
            </span>
            {actionsEnabled && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-green)' }}>
                <Wrench size={9} />
                <span style={{ fontWeight: 600 }}>Board edits enabled</span>
              </span>
            )}
          </div>

          {/* ── Inline config ──────────────────────────────────────────── */}
          {showConfig && (
            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>AI Engine Provider</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {(['codex', 'gemini', 'ollama'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setAiProvider(p)}
                    style={{ padding: '6px 4px', borderRadius: 'var(--r-sm)', border: `1px solid ${aiProvider === p ? (p === 'codex' ? '#818cf8' : 'var(--accent-blue)') : 'var(--border-subtle)'}`, background: aiProvider === p ? 'var(--bg-button-hover)' : 'transparent', color: 'var(--text-primary)', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                    {p === 'codex' ? 'Codex (OS)' : p === 'gemini' ? 'Gemini' : 'Ollama'}
                  </button>
                ))}
              </div>
              {aiProvider === 'codex' ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-subtle)' }}>
                  Running on local ChatGPT subscription login (<code>~/.codex/auth.json</code>). Zero API keys required.
                </div>
              ) : (
                <input type={aiProvider === 'gemini' ? 'password' : 'text'} value={aiProvider === 'gemini' ? apiKeyInput : ollamaEndpoint}
                  onChange={e => aiProvider === 'gemini' ? setApiKeyInput(e.target.value) : setOllamaEndpoint(e.target.value)}
                  placeholder={aiProvider === 'gemini' ? 'Gemini API Key (AIzaSy...)' : 'http://localhost:11434'}
                  className="form-input" style={{ fontSize: '12px', height: '30px' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button type="button" onClick={() => { onClose(); setActiveView('settings'); }} className="btn-subtle" style={{ height: '26px', fontSize: '11px', gap: '4px' }}><span>Full Settings</span><ExternalLink size={9} /></button>
                <button type="button" onClick={() => setShowConfig(false)} className="btn-subtle" style={{ height: '26px', fontSize: '11px' }}>Cancel</button>
                <button type="button" onClick={handleSaveConfig} className="btn-primary" style={{ height: '26px', fontSize: '11px' }}>Save</button>
              </div>
            </div>
          )}

          {/* ── Messages & Stream ────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.filter(m => m.role === 'user').length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ── Welcome Hero (Minimalist, Linear-aesthetic) ── */}
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--r-lg)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <LumoraLogo size={22} showText={false} />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        Lumora Copilot
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Workspace intelligence for codebase diagnostics, task specs & board orchestration
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      {
                        icon: <Terminal size={14} />,
                        color: 'var(--accent-blue)',
                        title: 'Diagnose Codebase',
                        desc: 'Inspect issues & create reproduction plans',
                        prompt: 'I want to diagnose a bug. Please inspect the codebase, outline reproduction steps, and generate a diagnosis plan.',
                      },
                      {
                        icon: <Cpu size={14} />,
                        color: '#818cf8',
                        title: 'Autonomous Dev',
                        desc: 'Feature branches, tests & PR workflows',
                        prompt: 'Review the current backlog cards and suggest which task is ready for autonomous implementation and testing.',
                      },
                      {
                        icon: <TrendingUp size={14} />,
                        color: 'var(--accent-amber)',
                        title: 'Sprint Health Audit',
                        desc: 'Detect WIP bottlenecks & overdue items',
                        prompt: 'Run a full sprint diagnostic on this board. Identify overdue items, WIP bottlenecks, and suggest top 3 actions.',
                      },
                      {
                        icon: <ListChecks size={14} />,
                        color: 'var(--accent-green)',
                        title: 'Technical Specs',
                        desc: 'Draft Gherkin acceptance criteria',
                        prompt: 'Generate detailed technical acceptance criteria in Gherkin format for the top cards in the Backlog.',
                      },
                    ].map((card, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSendMessage(card.prompt)}
                        disabled={isLoading}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '4px',
                          padding: '10px 12px',
                          borderRadius: 'var(--r-md)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--t-fast)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--border-medium)';
                          e.currentTarget.style.background = 'var(--bg-card-hover)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.background = 'var(--bg-input)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: card.color }}>
                          {card.icon}
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{card.title}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.35 }}>{card.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const hasUndo = !!undoStack.find(u => u.convMsgId === msg.id);

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: isUser ? '85%' : '100%', width: isUser ? undefined : '100%' }}>
                    {/* ── Sender label ─── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: 'var(--text-muted)', paddingLeft: isUser ? 0 : '2px' }}>
                      {!isUser && (
                        <LumoraLogo size={12} showText={false} />
                      )}
                      <span style={{ fontWeight: 600, color: isUser ? 'var(--text-muted)' : 'var(--accent-blue)' }}>{isUser ? 'You' : 'Copilot'}</span>
                      <span style={{ color: 'var(--text-subtle)' }}>·</span>
                      <span>{msg.time}</span>
                    </div>

                    {/* ── Attached images in user bubble ─── */}
                    {isUser && msg.images && msg.images.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end', marginBottom: '2px' }}>
                        {msg.images.map((img, imgi) => (
                          <div
                            key={imgi}
                            onClick={() => setLightboxImageUrl(img.previewUrl)}
                            style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-medium)', cursor: 'pointer', maxWidth: '160px', maxHeight: '120px' }}
                            title="Click to view full size"
                          >
                            <img src={img.previewUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <div style={{ position: 'absolute', bottom: 0, insetInline: 0, padding: '2px 5px', background: 'rgba(0,0,0,0.65)', fontSize: '9px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {img.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Bubble ─── */}
                    <div
                      style={{
                        padding: isUser ? '9px 14px' : '14px 16px',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                        background: isUser ? 'var(--accent-blue)' : 'var(--bg-card)',
                        color: isUser ? '#fff' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border-medium)',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        position: 'relative',
                        wordBreak: 'break-word',
                      }}
                    >
                      {isUser
                        ? <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        : <div className="ai-markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      }
                      {/* Copy button */}
                      {!isUser && idx > 0 && (
                        <button onClick={() => handleCopy(msg.content, msg.id)}
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px', borderRadius: 'var(--r-xs)', opacity: 0.6 }}
                          title="Copy">
                          {copiedIdx === msg.id ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>

                    {/* ── Executed actions receipt ─── */}
                    {!isUser && msg.executedActions && msg.executedActions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '2px', alignItems: 'center' }}>
                        {msg.executedActions.map((action, ai) => (
                          <span key={ai} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'rgba(77,171,98,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(77,171,98,0.2)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <Check size={9} />
                            {action.type.replace(/_/g, ' ')}
                            {action.params.title ? `: "${action.params.title}"` : ''}
                          </span>
                        ))}
                        {/* Undo button */}
                        {hasUndo && (
                          <button type="button" onClick={() => handleUndo(msg.id)}
                            style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'rgba(226,185,61,0.1)', color: 'var(--accent-amber)', border: '1px solid rgba(226,185,61,0.2)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, cursor: 'pointer' }}
                            title="Undo these board actions">
                            <Undo2 size={9} />
                            Undo all
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Action error / blocked notice ─── */}
                    {!isUser && msg.actionError && (
                      <div style={{ fontSize: '11px', padding: '5px 10px', borderRadius: 'var(--r-sm)', background: 'rgba(235,87,87,0.06)', color: 'var(--danger)', border: '1px solid rgba(235,87,87,0.15)', display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '2px' }}>
                        <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{msg.actionError}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 2px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Loader2 size={11} className="animate-spin" style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Copilot is analyzing…</div>
                  <div style={{ fontSize: '10px' }}>{attachedImages.length > 0 ? 'Inspecting screenshot visual context' : 'Synthesizing workspace context'}</div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area with Image & Document Attachment Preview ───── */}
          <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-header)', flexShrink: 0, position: 'relative' }}>
            {/* Attached documents / spreadsheets / images preview strip */}
            {attachedDocs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', marginBottom: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-md)', overflowX: 'auto' }} className="hide-scrollbar">
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Paperclip size={10} />
                  Attached ({attachedDocs.length}):
                </span>
                {attachedDocs.map((doc, idx) => (
                  <div key={doc.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 7px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-sm)', flexShrink: 0 }}>
                    {doc.type === 'spreadsheet' ? (
                      <FileSpreadsheet size={13} style={{ color: 'var(--accent-green)' }} />
                    ) : doc.type === 'image' && doc.previewUrl ? (
                      <img src={doc.previewUrl} alt={doc.name} style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '2px' }} />
                    ) : (
                      <FileText size={13} style={{ color: 'var(--accent-blue)' }} />
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-primary)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                    <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>({doc.type === 'spreadsheet' ? `${doc.rowCount} rows` : `${(doc.size / 1024).toFixed(0)}KB`})</span>
                    <button type="button" onClick={() => removeAttachedDoc(idx)} style={{ background: 'none', border: 'none', padding: '1px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => { setAttachedDocs([]); setAttachedImages([]); }} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', flexShrink: 0 }}>
                  Clear all
                </button>
              </div>
            )}

            {/* Slash command palette */}
            {slashPaletteOpen && filteredSlash.length > 0 && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '14px', right: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 100 }}>
                <div style={{ padding: '6px 12px 4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Commands</div>
                {filteredSlash.map((cmd, i) => (
                  <div key={cmd.cmd} onMouseDown={e => { e.preventDefault(); executeSlashCommand(cmd); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', background: i === slashHighlight ? 'var(--bg-button-hover)' : 'transparent', transition: 'background 80ms', borderBottom: i < filteredSlash.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={() => setSlashHighlight(i)}>
                    <div style={{ width: '24px', height: '24px', borderRadius: 'var(--r-sm)', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cmd.color, flexShrink: 0 }}>{cmd.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{cmd.label}</span>
                        <code style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', background: 'var(--bg-input)', padding: '0 4px', borderRadius: '3px', color: 'var(--text-muted)' }}>{cmd.cmd}</code>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cmd.description}</span>
                    </div>
                    {cmd.action === 'toggle' && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--r-full)', background: actionsEnabled ? 'rgba(77,171,98,0.12)' : 'rgba(226,185,61,0.12)', color: actionsEnabled ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                        {actionsEnabled ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modern Clean AI Chat Input Box */}
            <div style={{
              background: 'var(--bg-input)',
              border: `1px solid ${slashPaletteOpen ? 'var(--accent-blue)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--r-lg)',
              padding: '10px 12px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 140ms',
            }}>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onPaste={handlePaste}
                placeholder={attachedImages.length > 0
                  ? "Say what you want Copilot to do with this screenshot…"
                  : "Ask Lumora Copilot, attach screenshots, or type / for commands…"}
                rows={2}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  padding: 0,
                  margin: 0,
                }}
              />

              {/* Bottom Action Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach screenshot or documents (multi-select supported)"
                    className="btn-subtle"
                    style={{
                      height: '26px',
                      padding: '0 8px',
                      fontSize: '11px',
                      gap: '5px',
                      color: attachedImages.length > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      borderRadius: 'var(--r-sm)',
                    }}
                  >
                    <Paperclip size={12} />
                    <span>Attach</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSlashPaletteOpen(true); setSlashFilter(''); }}
                    className="btn-subtle"
                    style={{
                      height: '26px',
                      padding: '0 8px',
                      fontSize: '11px',
                      gap: '4px',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--r-sm)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>/ Commands</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={10} />
                    <span>{aiProvider === 'gemini' ? activeModelLabel : 'Ollama'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || isLoading || slashPaletteOpen}
                    className="btn-primary"
                    style={{
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      borderRadius: 'var(--r-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (!inputText.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || isLoading || slashPaletteOpen ? 0.35 : 1,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUp size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '10.5px', color: 'var(--text-subtle)' }}>
              <span>Paste/drop screenshot · Return to send · Shift+Return for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Image Lightbox Modal ───────────────────────────────────────── */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={lightboxImageUrl} alt="Full Preview" style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain', borderRadius: 'var(--r-lg)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              style={{ position: 'absolute', top: '-14px', right: '-14px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-modal)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
