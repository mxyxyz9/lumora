import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { ListColumn } from './ListColumn';
import { CardDetailModal } from './CardDetailModal';
import { NewBoardModal } from './NewBoardModal';
import { SettingsModal } from './SettingsModal';
import { CustomFieldsModal } from './CustomFieldsModal';
import { MemberManagementModal } from './MemberManagementModal';
import { ActivityLogDrawer } from './ActivityLogDrawer';
import { GitHubSyncModal } from './GitHubSyncModal';
import { SubfolderTabBar } from './SubfolderTabBar';
import { SubfolderHubView } from './SubfolderHubView';
import { CalendarView } from './CalendarView';
import { AiAssistantDrawer } from './AiAssistantDrawer';
import { SettingsView } from './SettingsView';
import { ConfirmModal } from './ConfirmModal';
import { GlobalWorkspaceHub } from './GlobalWorkspaceHub';
import { EditBoardModal } from './EditBoardModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { IntegrationsModal } from './IntegrationsModal';
import { VoicePanel } from './VoicePanel';
import { UpstreamSyncModal } from './UpstreamSyncModal';
import { ArchivedCardsModal } from './ArchivedCardsModal';
import { LumoraLogo, KansoLogo } from './LumoraLogo';
import {
  Settings,
  Users,
  Github,
  Sliders,
  Activity,
  Plus,
  X,
  Folder,
  LayoutGrid,
  Calendar,
  Bot,
  Search,
  Layers,
  MoreHorizontal,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ChevronDown,
  Check,
  Mic,
  GitPullRequest,
  Archive,
} from 'lucide-react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

const PROJECT_COLORS = ['#4f8ef7', '#9b8af7', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c'];

function parseProjectDisplay(rawTitle: string, explicitIcon?: string) {
  if (explicitIcon) {
    const cleanTitle = rawTitle.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u, '');
    return { emoji: explicitIcon, title: cleanTitle || rawTitle };
  }
  const match = rawTitle.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*(.*)/u);
  if (match) {
    return { emoji: match[1], title: match[2] || rawTitle };
  }
  return { emoji: '🎯', title: rawTitle };
}

export const BoardView: React.FC = () => {
  const {
    settings,
    activeBoard,
    activeSwimlaneId,
    activeView,
    setActiveView,
    lists,
    swimlanes,
    cards,
    boards,
    activeBoardId,
    switchBoard,
    moveCard,
    reorderCards,
    reorderLists,
    createList,
    setNewBoardModalOpen,
    setCustomFieldsModalOpen,
    setMemberModalOpen,
    setActivityDrawerOpen,
    setGitHubModalOpen,
    setArchivedCardsModalOpen,
    isSearchOpen,
    setSearchOpen,
    setActiveCardId,
    setActiveSwimlaneId,
  } = useBoardStore();


  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kanso_sidebar_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isIntegrationsModalOpen, setIntegrationsModalOpen] = useState(false);
  const [isUpstreamModalOpen, setUpstreamModalOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string; top: number; left: number } | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);

  const aiConfig = {
    provider: (typeof localStorage !== 'undefined' ? localStorage.getItem('kanso_ai_provider') || 'gemini' : 'gemini') as any,
    geminiApiKey: typeof localStorage !== 'undefined' ? localStorage.getItem('kanso_gemini_api_key') || undefined : undefined,
    geminiModel: typeof localStorage !== 'undefined' ? localStorage.getItem('kanso_gemini_model') || undefined : undefined,
    ollamaEndpoint: typeof localStorage !== 'undefined' ? localStorage.getItem('kanso_ollama_endpoint') || undefined : undefined,
    ollamaModel: typeof localStorage !== 'undefined' ? localStorage.getItem('kanso_ollama_model') || undefined : undefined,
  };

  // Listen for global hotkey to open Voice panel
  useEffect(() => {
    const unbind = window.electronAPI?.onVoiceHotkeyTriggered?.(() => {
      setIsVoicePanelOpen(true);
    });
    return () => unbind?.();
  }, []);

  const showTooltip = (text: string, e: React.MouseEvent) => {
    if (!isSidebarCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      text,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('kanso_sidebar_collapsed', String(next));
      } catch (_) {}
      return next;
    });
    setHoveredTooltip(null);
  };

  // Keyboard shortcut: Cmd+B / Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K for Global Search
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, [setSearchOpen]);

  // Atlaskit DND Monitor
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pragmatic Drag & Drop monitoring
  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const targets = location.current.dropTargets;
        if (!targets.length) return;

        const sourceData = source.data as any;

        // List reordering
        const listTarget = targets.find((t: any) => t.data?.type === 'list');
        if (sourceData.type === 'list' && listTarget) {
          const destData = listTarget.data as any;
          if (sourceData.listId && destData.index !== undefined) {
            reorderLists(sourceData.listId, destData.index);
          }
          return;
        }

        // Card movement & reordering
        if (sourceData.cardId) {
          const cardTarget = targets.find((t: any) => t.data?.cardId && t.data?.cardId !== sourceData.cardId);
          if (cardTarget) {
            const destData = cardTarget.data as any;
            const targetListId = destData.listId;
            const targetIndex = destData.index;
            if (targetListId) {
              reorderCards(sourceData.cardId, targetListId, targetIndex);
            }
            return;
          }
          if (listTarget) {
            const destData = listTarget.data as any;
            const targetListId = destData.listId;
            if (targetListId) {
              reorderCards(sourceData.cardId, targetListId, undefined);
            }
          }
        }
      },
    });
  }, [lists, reorderCards, reorderLists]);

  const handleAddListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    const targetSwimlaneId = activeSwimlaneId !== 'all' ? activeSwimlaneId : undefined;
    await createList(newListTitle.trim(), targetSwimlaneId);
    setNewListTitle('');
    setIsAddingList(false);
  };

  const sortedLists = lists
    .filter(list => {
      // In "All Cards" view ('all'), show all lists across the board
      if (activeSwimlaneId === 'all') return true;
      // If a list was created in a specific subfolder, only show it in that subfolder!
      if (list.swimlaneId && list.swimlaneId !== 'all') {
        return list.swimlaneId === activeSwimlaneId;
      }
      // Lists without a specific swimlaneId (e.g. global project-level lists) are shown everywhere
      return true;
    })
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const currentSubfolder = swimlanes.find(s => s._id === activeSwimlaneId);
  const activeCardsForSubfolder = activeSwimlaneId === 'all'
    ? cards
    : cards.filter(c => c.swimlaneId === activeSwimlaneId);
  const filteredCards = activeCardsForSubfolder.filter(c => !c.archived);
  const archivedCount = cards.filter(c => !!c.archived).length;

  const viewLabels: Record<string, string> = {
    global_hub: 'Home',
    subfolders_hub: 'Subfolders',
    board: 'Board',
    calendar: 'Calendar',
    settings: 'Settings',
  };

  const canvasBgStyle: React.CSSProperties = React.useMemo(() => {
    const bg = settings.customBackground;
    if (!bg || bg === 'default' || bg === 'dots') return {};
    if (bg === 'clean_solid') {
      return {
        backgroundImage: 'none',
        backgroundColor: 'var(--bg-canvas)',
      };
    }
    if (bg.startsWith('http://') || bg.startsWith('https://') || bg.startsWith('data:image/') || bg.startsWith('file://')) {
      return {
        backgroundImage: `url("${bg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      };
    }
    if (bg.includes('radial-gradient(circle') || bg.includes('radial-gradient(var(--border-medium)')) {
      return {
        backgroundImage: bg,
        backgroundSize: bg.includes('1.2px') ? '16px 16px' : '24px 24px',
        backgroundColor: 'var(--bg-canvas)',
      };
    }
    return {
      background: bg,
    };
  }, [settings.customBackground]);

  return (
    <div className="app-container">
      {/* ── Left Sidebar (Collapsible: 220px <-> 68px) ────────────────── */}
      <aside className={`app-sidebar ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        {/* Brand Logo Header with integrated hover Collapse/Expand button */}
        <div
          className="sidebar-logo"
          onClick={() => {
            if (isSidebarCollapsed) {
              hideTooltip();
              toggleSidebar();
            } else {
              setActiveView('global_hub');
            }
          }}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          {isSidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '36px' }}>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  hideTooltip();
                  toggleSidebar();
                }}
                onMouseEnter={e => showTooltip('Expand Sidebar (⌘B)', e)}
                onMouseLeave={hideTooltip}
                className="sidebar-collapsed-toggle-btn"
                aria-label="Expand Sidebar"
              >
                <div className="collapsed-logo-mark">
                  <LumoraLogo size={20} showText={false} />
                </div>
                <div className="collapsed-hover-icon">
                  <PanelLeftOpen size={18} />
                </div>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LumoraLogo size={22} showText={true} />
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  hideTooltip();
                  toggleSidebar();
                }}
                className="btn-icon sidebar-logo-collapse-btn"
                title="Collapse Sidebar"
                style={{ width: '24px', height: '24px', padding: 0 }}
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 1. Global Workspace Level */}
        <div className="sidebar-section" style={{ paddingTop: '10px' }}>
          {!isSidebarCollapsed && <div className="sidebar-section-label">Workspace</div>}
          <button
            className={`sidebar-nav-item ${activeView === 'global_hub' ? 'active' : ''}`}
            onClick={() => setActiveView('global_hub')}
            onMouseEnter={e => showTooltip('Home', e)}
            onMouseLeave={hideTooltip}
            data-tooltip="Home"
          >
            <span className="nav-icon"><Home size={15} /></span>
            <span className="sidebar-nav-text">Home</span>
          </button>
        </div>

        <div className="sidebar-divider" />

        {/* 2. Active Project Views with Fast Switcher Dropdown */}
        <div className="sidebar-section">
          {!isSidebarCollapsed && (
            <div style={{ position: 'relative' }} ref={projectDropdownRef}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px 6px',
                }}
              >
                <span className="sidebar-section-label" style={{ padding: 0, margin: 0 }}>
                  Active Project
                </span>
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(p => !p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isProjectDropdownOpen ? 'var(--bg-button-hover)' : 'transparent',
                    border: 'none',
                    padding: '2px 6px',
                    borderRadius: 'var(--r-sm)',
                    cursor: 'pointer',
                    color: 'var(--accent-blue)',
                    fontWeight: 700,
                    fontSize: '11px',
                    maxWidth: '120px',
                    transition: 'all var(--t-fast)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-hover)')}
                  onMouseLeave={e => {
                    if (!isProjectDropdownOpen) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeBoard ? `${activeBoard.icon || '🎯'} ${parseProjectDisplay(activeBoard.title, activeBoard.icon).title}` : 'Project'}
                  </span>
                  <ChevronDown
                    size={11}
                    style={{
                      flexShrink: 0,
                      opacity: 0.8,
                      transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform var(--t-fast)',
                    }}
                  />
                </button>
              </div>

              {/* Project Switcher Dropdown Popover */}
              {isProjectDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 2px)',
                    left: '6px',
                    right: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-modal)',
                    zIndex: 200,
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {boards.map(b => {
                    const isCurrent = b._id === activeBoardId;
                    const { emoji, title } = parseProjectDisplay(b.title, b.icon);
                    return (
                      <button
                        key={b._id}
                        type="button"
                        onClick={async () => {
                          setIsProjectDropdownOpen(false);
                          await switchBoard(b._id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: 'var(--r-sm)',
                          border: 'none',
                          background: isCurrent ? 'var(--bg-button-hover)' : 'transparent',
                          color: isCurrent ? 'var(--accent-blue)' : 'var(--text-primary)',
                          fontSize: '12px',
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                        onMouseEnter={e => {
                          if (!isCurrent) e.currentTarget.style.background = 'var(--bg-button-hover)';
                        }}
                        onMouseLeave={e => {
                          if (!isCurrent) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '13px' }}>{emoji}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {title}
                        </span>
                        {isCurrent && <Check size={12} />}
                      </button>
                    );
                  })}

                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      setNewBoardModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: 'var(--r-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--bg-button-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    <Plus size={12} />
                    <span>New Project</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            className={`sidebar-nav-item ${activeView === 'subfolders_hub' ? 'active' : ''}`}
            onClick={() => setActiveView('subfolders_hub')}
            onMouseEnter={e => showTooltip('Subfolders & Workstreams', e)}
            onMouseLeave={hideTooltip}
            data-tooltip="Subfolders & Workstreams"
          >
            <span className="nav-icon"><Folder size={15} /></span>
            <span className="sidebar-nav-text">Subfolders</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeView === 'board' ? 'active' : ''}`}
            onClick={() => setActiveView('board')}
            onMouseEnter={e => showTooltip('Kanban Board', e)}
            onMouseLeave={hideTooltip}
            data-tooltip="Kanban Board"
          >
            <span className="nav-icon"><LayoutGrid size={15} /></span>
            <span className="sidebar-nav-text">Board</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
            onMouseEnter={e => showTooltip('Calendar & Milestones', e)}
            onMouseLeave={hideTooltip}
            data-tooltip="Calendar & Milestones"
          >
            <span className="nav-icon"><Calendar size={15} /></span>
            <span className="sidebar-nav-text">Calendar</span>
          </button>
        </div>

        <div className="sidebar-divider" />

        {/* 3. All Workspaces & Projects Directory */}
        <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!isSidebarCollapsed ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px 4px',
              }}
            >
              <span className="sidebar-section-label" style={{ padding: 0, margin: 0 }}>
                All Projects ({boards.length})
              </span>

              <button
                onClick={() => setNewBoardModalOpen(true)}
                className="btn-icon"
                style={{ width: '20px', height: '20px', padding: 0 }}
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '4px' }}>
              <button
                onClick={() => setNewBoardModalOpen(true)}
                onMouseEnter={e => showTooltip('Create Project', e)}
                onMouseLeave={hideTooltip}
                className="btn-icon"
                style={{ width: '38px', height: '38px', padding: 0, borderRadius: 'var(--r-md)' }}
                data-tooltip="Create Project"
              >
                <Plus size={15} />
              </button>
            </div>
          )}

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {boards.map(b => {
              const isCurrent = b._id === activeBoardId;
              const { emoji, title } = parseProjectDisplay(b.title, b.icon);

              return (
                <div
                  key={b._id}
                  className={`sidebar-project-item ${isCurrent ? 'active' : ''}`}
                  onClick={async () => {
                    await switchBoard(b._id);
                  }}
                  onMouseEnter={e => showTooltip(title, e)}
                  onMouseLeave={hideTooltip}
                  data-tooltip={title}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', position: 'relative' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
                    <span className="sidebar-project-icon" style={{ fontSize: isSidebarCollapsed ? '16px' : '14px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {emoji}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="sidebar-project-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </span>
                    )}
                  </div>

                  {!isSidebarCollapsed && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingBoard(b);
                      }}
                      className="sidebar-project-edit-btn"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Footer: Settings */}
        <div className="sidebar-footer" style={{ padding: '8px 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            className={`sidebar-nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings' as any)}
            onMouseEnter={e => showTooltip('Settings', e)}
            onMouseLeave={hideTooltip}
            data-tooltip="Settings"
          >
            <span className="nav-icon"><Settings size={15} /></span>
            <span className="sidebar-nav-text">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Right Main Application Area ──────────────────────────────── */}
      <div className="app-main">
        {/* Top Slim Header Bar */}
        <header className="app-topbar">
          {/* Breadcrumb Navigation */}
          <div className="topbar-breadcrumb">
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveView('global_hub')}
            >
              Lumora
            </span>
            <span className="topbar-breadcrumb-sep">/</span>
            {activeView !== 'global_hub' && activeView !== 'settings' && (
              <>
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveView('subfolders_hub')}
                >
                  {activeBoard ? `${activeBoard.icon || '🎯'} ${parseProjectDisplay(activeBoard.title, activeBoard.icon).title}` : 'Project'}
                </span>
                <span className="topbar-breadcrumb-sep">/</span>
              </>
            )}
            <span className="topbar-breadcrumb-current">{viewLabels[activeView] || activeView}</span>
            {activeView === 'board' && currentSubfolder && activeSwimlaneId !== 'all' && (
              <>
                <span className="topbar-breadcrumb-sep">/</span>
                <span className="topbar-breadcrumb-current">{currentSubfolder.title}</span>
              </>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="topbar-actions">
            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-subtle"
              style={{ gap: '6px', fontSize: '12.5px', height: '30px', padding: '0 10px' }}
              title="Search cards (⌘K)"
            >
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <span>Search</span>
              <span style={{ fontSize: '10px', opacity: 0.6, background: 'var(--bg-card)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-subtle)', marginLeft: '2px' }}>⌘K</span>
            </button>

            {/* Integrations & Cloud PM Sync Button */}
            <button
              onClick={() => setIntegrationsModalOpen(true)}
              className="btn-subtle"
              style={{ gap: '5px', fontSize: '12.5px', height: '30px' }}
              title="Cloud PM Sync (Jira, Linear, Asana, GitHub)"
            >
              <Layers size={13} style={{ color: '#818cf8' }} />
              <span>Integrations</span>
            </button>

            {/* Lumora Copilot Button */}
            <button
              onClick={() => setIsAiDrawerOpen(true)}
              className="btn-subtle"
              style={{ gap: '6px', fontSize: '12.5px', height: '30px' }}
              title="Lumora Copilot"
            >
              <LumoraLogo size={14} showText={false} />
              <span>Lumora Copilot</span>
            </button>

            {/* Lumora Voice Dictation Button (OpenWhispr base) */}
            <button
              onClick={() => setIsVoicePanelOpen(true)}
              className="btn-subtle"
              style={{ gap: '6px', fontSize: '12.5px', height: '30px', color: 'var(--accent-blue)', borderColor: isVoicePanelOpen ? 'rgba(59, 130, 246, 0.4)' : undefined, background: isVoicePanelOpen ? 'rgba(59, 130, 246, 0.1)' : undefined }}
              title="Lumora Voice Dictation (⌥ Space)"
            >
              <Mic size={14} />
              <span>Voice</span>
            </button>

            {/* Archived Tasks Button */}
            <button
              onClick={() => setArchivedCardsModalOpen(true)}
              className="btn-subtle"
              style={{ gap: '6px', fontSize: '12.5px', height: '30px' }}
              title="View & restore archived tasks"
            >
              <Archive size={13} style={{ color: '#7c5ce5' }} />
              <span>Archived</span>
              {archivedCount > 0 && (
                <span style={{ fontSize: '10px', background: '#e0d4ff', color: '#3b2a59', padding: '1px 6px', borderRadius: '100px', fontWeight: 800 }}>
                  {archivedCount}
                </span>
              )}
            </button>

            {/* Tools Menu Popover */}
            <div style={{ position: 'relative' }} ref={toolsRef}>
              <button
                onClick={() => setIsToolsOpen(p => !p)}
                className="btn-icon"
                title="Project Tools"
                style={{ width: '30px', height: '30px' }}
              >
                <MoreHorizontal size={15} />
              </button>

              {isToolsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: 'var(--bg-modal)',
                    border: '1.5px solid var(--border-medium)',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-modal)',
                    padding: '8px',
                    minWidth: '200px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {[
                    { icon: <Archive size={13} />, label: `Archived Tasks (${archivedCount})`, action: () => { setArchivedCardsModalOpen(true); setIsToolsOpen(false); } },
                    { icon: <GitPullRequest size={13} />, label: 'Upstream Sync & Checkpoints', action: () => { setUpstreamModalOpen(true); setIsToolsOpen(false); } },
                    { icon: <Layers size={13} />, label: 'Integrations & PM Sync', action: () => { setIntegrationsModalOpen(true); setIsToolsOpen(false); } },
                    { icon: <Github size={13} />, label: 'GitHub Sync', action: () => { setGitHubModalOpen(true); setIsToolsOpen(false); } },
                    { icon: <Users size={13} />, label: 'Members', action: () => { setMemberModalOpen(true); setIsToolsOpen(false); } },
                    { icon: <Sliders size={13} />, label: 'Custom Fields', action: () => { setCustomFieldsModalOpen(true); setIsToolsOpen(false); } },
                    { icon: <Activity size={13} />, label: 'Activity Log', action: () => { setActivityDrawerOpen(true); setIsToolsOpen(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '8px 10px',
                        borderRadius: 'var(--r-sm)',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Tabs strip */}
        {(activeView === 'subfolders_hub' || activeView === 'board' || activeView === 'calendar') && (
          <div className="view-tabs">
            {[
              { id: 'subfolders_hub', label: 'Subfolders', icon: <Folder size={12} /> },
              { id: 'board', label: 'Board', icon: <LayoutGrid size={12} /> },
              { id: 'calendar', label: 'Calendar', icon: <Calendar size={12} /> },
            ].map(tab => (
              <button
                key={tab.id}
                className={`view-tab ${activeView === tab.id ? 'active' : ''}`}
                onClick={() => setActiveView(tab.id as any)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}

            <div className="view-tabs-spacer" />

            {activeView === 'board' && (
              <button
                onClick={() => setIsAddingList(true)}
                className="btn-subtle"
                style={{ height: '26px', fontSize: '12px', gap: '4px' }}
              >
                <Plus size={12} />
                <span>Add column</span>
              </button>
            )}
          </div>
        )}

        {/* ── Main View Content Area ───────────────────────────────────── */}
        {activeView === 'global_hub' ? (
          <GlobalWorkspaceHub />
        ) : activeView === 'settings' ? (
          <SettingsView />
        ) : activeView === 'calendar' ? (
          <CalendarView />
        ) : activeView === 'subfolders_hub' ? (
          <SubfolderHubView />
        ) : (
          <>
            <SubfolderTabBar />

            <main className="board-canvas" style={canvasBgStyle}>
              {sortedLists.map((list, idx) => {
                const listCards = filteredCards
                  .filter(c => c.listId === list._id)
                  .sort((a, b) => (a.sort || 0) - (b.sort || 0));

                return (
                  <ListColumn
                    key={list._id}
                    list={list}
                    cards={listCards}
                    index={idx}
                  />
                );
              })}

              {/* "+ Add Column" Inline Form */}
              <div style={{ width: '340px', minWidth: '340px', flexShrink: 0 }}>
                {isAddingList ? (
                  <form
                    onSubmit={handleAddListSubmit}
                    style={{
                      background: 'var(--bg-column)',
                      border: '1.5px solid var(--border-subtle)',
                      borderRadius: '40px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 16px 40px var(--border-card)',
                    }}
                  >
                    <input
                      ref={listInputRef}
                      type="text"
                      required
                      value={newListTitle}
                      onChange={e => setNewListTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          setIsAddingList(false);
                          setNewListTitle('');
                        }
                      }}
                      placeholder="Column name (e.g. In Review)..."
                      className="form-input"
                      style={{ padding: '8px 14px', fontSize: '1rem', fontWeight: 800, borderRadius: '16px' }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>↵ Enter to save</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => { setIsAddingList(false); setNewListTitle(''); }}
                          className="btn-subtle"
                          style={{ height: '32px', fontSize: '12px', padding: '0 14px', borderRadius: '100px' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          style={{ fontSize: '12px', height: '32px', padding: '0 16px', gap: '6px', borderRadius: '100px' }}
                        >
                          <Plus size={13} />
                          <span>Add Column</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingList(true)}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '24px 20px',
                      background: 'rgba(255, 255, 255, 0.65)',
                      border: '2.5px dashed rgba(166, 140, 255, 0.5)',
                      borderRadius: '40px',
                      color: '#a68cff',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      backdropFilter: 'blur(8px)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#ffffff';
                      (e.currentTarget as HTMLElement).style.color = '#7c5ce5';
                      (e.currentTarget as HTMLElement).style.borderColor = '#7c5ce5';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(124, 92, 229, 0.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.65)';
                      (e.currentTarget as HTMLElement).style.color = '#a68cff';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(166, 140, 255, 0.5)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <Plus size={20} />
                    <span>+ Add Column</span>
                  </button>
                )}
              </div>
            </main>
          </>
        )}
      </div>

      {/* Modals & Drawers */}
      <CardDetailModal />
      <ArchivedCardsModal />
      <NewBoardModal />
      <EditBoardModal
        board={editingBoard}
        isOpen={!!editingBoard}
        onClose={() => setEditingBoard(null)}
      />
      <SettingsModal />
      <CustomFieldsModal />
      <MemberManagementModal />
      <ActivityLogDrawer />
      <GitHubSyncModal />
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIntegrationsModalOpen(false)}
      />
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectCard={(card) => {
          if (card.boardId !== activeBoardId) {
            switchBoard(card.boardId);
          }
          if (card.swimlaneId) {
            setActiveSwimlaneId(card.swimlaneId);
          }
          setActiveCardId(card._id);
        }}
      />
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
      />
      <VoicePanel
        isOpen={isVoicePanelOpen}
        onClose={() => setIsVoicePanelOpen(false)}
        lists={lists}
        aiConfig={aiConfig}
      />
      <UpstreamSyncModal
        isOpen={isUpstreamModalOpen}
        onClose={() => setUpstreamModalOpen(false)}
      />
      <ConfirmModal />

      {/* Floating Tooltip for Collapsed Sidebar */}
      {hoveredTooltip && isSidebarCollapsed && (
        <div
          style={{
            position: 'fixed',
            top: hoveredTooltip.top,
            left: hoveredTooltip.left,
            transform: 'translateY(-50%)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-sm)',
            padding: '5px 10px',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-modal)',
            zIndex: 99999,
            pointerEvents: 'none',
            animation: 'tooltipFadeIn 0.08s ease',
          }}
        >
          {hoveredTooltip.text}
        </div>
      )}
    </div>
  );
};
