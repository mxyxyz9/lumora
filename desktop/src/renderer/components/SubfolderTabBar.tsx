import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { Swimlane } from '../lib/types';
import {
  Folder,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  X,
  Check,
  LayoutGrid,
  Rows3,
  Layers,
} from 'lucide-react';

export const SubfolderTabBar: React.FC = () => {
  const {
    swimlanes,
    cards,
    activeSwimlaneId,
    setActiveSwimlaneId,
    viewMode,
    setViewMode,
    createSwimlane,
    updateSwimlane,
    deleteSwimlane,
    showConfirm,
  } = useBoardStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [tabMenuPos, setTabMenuPos] = useState<{ x: number; y: number; swimlane: Swimlane } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Close popup menu on outside click, window scroll or resize
  useEffect(() => {
    function handleClose() {
      setTabMenuPos(null);
    }
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setTabMenuPos(null);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, []);

  // Global Keyboard Shortcuts (⌘1 for All Cards, ⌘2, ⌘3... for subfolders)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveSwimlaneId('all');
        } else {
          const num = parseInt(e.key, 10);
          if (!isNaN(num) && num >= 2 && num <= 9) {
            const index = num - 2;
            if (swimlanes[index]) {
              e.preventDefault();
              setActiveSwimlaneId(swimlanes[index]._id);
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swimlanes, setActiveSwimlaneId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newId = await createSwimlane(newTitle.trim());
    setActiveSwimlaneId(newId);
    setNewTitle('');
    setIsAdding(false);
  };

  const handleSaveEdit = async (swimlaneId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      await updateSwimlane(swimlaneId, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (swimlaneId: string, title: string) => {
    setTabMenuPos(null);
    showConfirm({
      title: 'Delete Subfolder',
      message: `Are you sure you want to delete subfolder "${title}"? Cards will remain safely in the project.`,
      confirmText: 'Delete Subfolder',
      isDestructive: true,
      onConfirm: async () => {
        await deleteSwimlane(swimlaneId);
      },
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '12px',
        height: '38px',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* ── Browser Tab Strip (Chrome / Arc Style) ─────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          overflowX: 'auto',
          height: '100%',
          scrollbarWidth: 'none',
        }}
      >
        {/* 1. All Cards Browser Tab (⌘1) */}
        <div
          onClick={() => setActiveSwimlaneId('all')}
          style={{
            position: 'relative',
            height: '33px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            background: activeSwimlaneId === 'all' ? 'var(--bg-app)' : 'transparent',
            border: activeSwimlaneId === 'all' ? '1px solid var(--border-subtle)' : '1px solid transparent',
            borderBottom: activeSwimlaneId === 'all' ? '1px solid var(--bg-app)' : '1px solid transparent',
            marginBottom: activeSwimlaneId === 'all' ? '-1px' : '0',
            zIndex: activeSwimlaneId === 'all' ? 2 : 1,
            color: activeSwimlaneId === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: activeSwimlaneId === 'all' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all var(--t-fast) var(--ease-out)',
          }}
          onMouseEnter={e => {
            if (activeSwimlaneId !== 'all') {
              e.currentTarget.style.background = 'var(--bg-button-subtle)';
            }
          }}
          onMouseLeave={e => {
            if (activeSwimlaneId !== 'all') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="All Cards across all workstreams (⌘1)"
        >
          <Layers size={13} style={{ color: activeSwimlaneId === 'all' ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
          <span>All Cards</span>

          {/* Count badge */}
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: activeSwimlaneId === 'all' ? 'var(--accent-blue)' : 'var(--text-muted)',
              background: activeSwimlaneId === 'all' ? 'rgba(79,142,247,0.1)' : 'var(--bg-badge)',
              padding: '1px 6px',
              borderRadius: 'var(--r-full)',
            }}
          >
            {cards.length}
          </span>

          {/* Shortcut badge */}
          <kbd
            style={{
              fontSize: '9px',
              fontFamily: 'inherit',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'var(--bg-badge)',
              padding: '1px 4px',
              borderRadius: '3px',
              opacity: 0.8,
            }}
          >
            ⌘1
          </kbd>
        </div>

        {/* 2. Dynamic Subfolder Tabs */}
        {swimlanes.map((sw, idx) => {
          const swCards = cards.filter(c => c.swimlaneId === sw._id);
          const isSelected = activeSwimlaneId === sw._id;
          const shortcutNum = idx + 2;

          if (editingId === sw._id) {
            return (
              <form
                key={sw._id}
                onSubmit={e => handleSaveEdit(sw._id, e)}
                style={{
                  height: '33px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--bg-app)',
                  borderTopLeftRadius: '6px',
                  borderTopRightRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  borderBottom: '1px solid var(--bg-app)',
                  padding: '0 8px',
                  marginBottom: '-1px',
                  zIndex: 3,
                }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  autoFocus
                  className="form-input"
                  style={{ padding: '2px 6px', fontSize: '12px', width: '120px', height: '22px', border: 'none' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 6px', height: '20px', fontSize: '11px' }}>
                  <Check size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="btn-subtle"
                  style={{ padding: '0 4px', height: '20px' }}
                >
                  <X size={11} />
                </button>
              </form>
            );
          }

          return (
            <div
              key={sw._id}
              onClick={() => setActiveSwimlaneId(sw._id)}
              style={{
                position: 'relative',
                height: '33px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 10px',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                background: isSelected ? 'var(--bg-app)' : 'transparent',
                border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderBottom: isSelected ? '1px solid var(--bg-app)' : '1px solid transparent',
                marginBottom: isSelected ? '-1px' : '0',
                zIndex: isSelected ? 2 : 1,
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--t-fast) var(--ease-out)',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--bg-button-subtle)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              title={`Filter by ${sw.title} (⌘${shortcutNum})`}
            >
              <Folder size={12} style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
              <span>{sw.title}</span>

              {/* Count badge */}
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
                  background: isSelected ? 'rgba(79,142,247,0.1)' : 'var(--bg-badge)',
                  padding: '1px 6px',
                  borderRadius: 'var(--r-full)',
                }}
              >
                {swCards.length}
              </span>

              {/* Shortcut badge */}
              {shortcutNum <= 9 && (
                <kbd
                  style={{
                    fontSize: '9px',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-badge)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    opacity: 0.8,
                  }}
                >
                  ⌘{shortcutNum}
                </kbd>
              )}

              {/* Tab Options Button */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTabMenuPos(tabMenuPos?.swimlane._id === sw._id ? null : {
                    x: Math.max(12, Math.min(rect.left - 40, window.innerWidth - 170)),
                    y: rect.bottom + 5,
                    swimlane: sw,
                  });
                }}
                className="btn-icon"
                style={{
                  width: '18px',
                  height: '18px',
                  padding: 0,
                  marginLeft: '2px',
                  opacity: isSelected ? 0.9 : 0.4,
                }}
                title="Tab options"
              >
                <MoreHorizontal size={11} />
              </button>
            </div>
          );
        })}

        {/* 3. New Tab Button (+) */}
        {isAdding ? (
          <form
            onSubmit={handleAddSubmit}
            style={{
              height: '33px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--bg-app)',
              borderTopLeftRadius: '6px',
              borderTopRightRadius: '6px',
              border: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--bg-app)',
              padding: '0 8px',
              marginBottom: '-1px',
              zIndex: 3,
            }}
          >
            <input
              ref={addInputRef}
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="New tab name..."
              className="form-input"
              style={{ padding: '2px 6px', fontSize: '12px', width: '130px', height: '22px', border: 'none' }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="btn-primary"
              style={{ padding: '0 6px', height: '20px', fontSize: '11px' }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTitle('');
              }}
              className="btn-subtle"
              style={{ padding: '0 4px', height: '20px' }}
            >
              <X size={11} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-icon"
            style={{
              width: '24px',
              height: '24px',
              alignSelf: 'center',
              marginLeft: '4px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
            }}
            title="Create new subfolder tab"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* ── Right: View Mode Segmented Control ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: 'var(--bg-card)',
          padding: '2px',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-xs)',
          flexShrink: 0,
          marginBottom: '3px',
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode('tabs')}
          style={{
            padding: '3px 8px',
            borderRadius: 'var(--r-xs)',
            border: 'none',
            background: viewMode === 'tabs' ? 'var(--bg-button-hover)' : 'transparent',
            color: viewMode === 'tabs' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11.5px',
            fontWeight: viewMode === 'tabs' ? 700 : 500,
            transition: 'all var(--t-fast)',
          }}
          title="Single Subfolder Focus Mode"
        >
          <LayoutGrid size={11} style={{ color: viewMode === 'tabs' ? 'var(--accent-blue)' : 'inherit' }} />
          <span>Focus Tab</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('stacked')}
          style={{
            padding: '3px 8px',
            borderRadius: 'var(--r-xs)',
            border: 'none',
            background: viewMode === 'stacked' ? 'var(--bg-button-hover)' : 'transparent',
            color: viewMode === 'stacked' ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11.5px',
            fontWeight: viewMode === 'stacked' ? 700 : 500,
            transition: 'all var(--t-fast)',
          }}
          title="Stacked Swimlanes Mode (View all subfolders grouped vertically)"
        >
          <Rows3 size={11} style={{ color: viewMode === 'stacked' ? 'var(--accent-purple)' : 'inherit' }} />
          <span>Stacked Lanes</span>
        </button>
      </div>

      {/* ── Global Floating Overlay Tab Options Menu (Never Clipped) ──── */}
      {tabMenuPos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${tabMenuPos.y}px`,
            left: `${tabMenuPos.x}px`,
            width: '150px',
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-modal)',
            padding: '4px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fade-in 100ms ease-out',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setEditTitle(tabMenuPos.swimlane.title);
              setEditingId(tabMenuPos.swimlane._id);
              setTabMenuPos(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              borderRadius: 'var(--r-sm)',
              width: '100%',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Edit2 size={12} style={{ color: 'var(--accent-blue)' }} />
            <span>Rename</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const sw = tabMenuPos.swimlane;
              setTabMenuPos(null);
              handleDelete(sw._id, sw.title);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              background: 'none',
              border: 'none',
              color: 'var(--danger)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              borderRadius: 'var(--r-sm)',
              width: '100%',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
