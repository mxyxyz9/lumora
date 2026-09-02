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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'var(--bg-header)',
        borderBottom: '1.5px solid var(--border-subtle)',
        gap: '12px',
        height: '48px',
        userSelect: 'none',
        position: 'relative',
        zIndex: 40,
        boxShadow: '0 2px 8px var(--border-card)',
      }}
    >
      {/* ── Playful Pill Tab Strip ─────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
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
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 14px',
            borderRadius: '100px',
            background: activeSwimlaneId === 'all' ? 'var(--accent-primary)' : 'var(--bg-card)',
            border: activeSwimlaneId === 'all' ? 'none' : '1.5px solid var(--border-subtle)',
            boxShadow: activeSwimlaneId === 'all' ? '0 4px 12px var(--border-card)' : '0 2px 6px var(--border-card)',
            color: activeSwimlaneId === 'all' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: activeSwimlaneId === 'all' ? 'translateY(-1px)' : 'none',
          }}
          onMouseEnter={e => {
            if (activeSwimlaneId !== 'all') {
              e.currentTarget.style.background = 'var(--bg-button-hover)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={e => {
            if (activeSwimlaneId !== 'all') {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.transform = 'none';
            }
          }}
          title="All Cards across all workstreams (⌘1)"
        >
          <Layers size={13} style={{ color: activeSwimlaneId === 'all' ? 'var(--accent-primary-text)' : 'var(--accent-primary)' }} />
          <span>All Cards</span>

          {/* Count badge */}
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              color: activeSwimlaneId === 'all' ? 'var(--accent-primary)' : 'var(--accent-primary)',
              background: activeSwimlaneId === 'all' ? 'var(--accent-primary-text)' : 'var(--bg-input)',
              border: activeSwimlaneId === 'all' ? 'none' : '1px solid var(--border-subtle)',
              padding: '1px 7px',
              borderRadius: '100px',
            }}
          >
            {cards.length}
          </span>

          {/* Shortcut badge */}
          <kbd
            style={{
              fontSize: '9.5px',
              fontFamily: 'inherit',
              fontWeight: 700,
              color: activeSwimlaneId === 'all' ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
              background: activeSwimlaneId === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--bg-input)',
              border: activeSwimlaneId === 'all' ? 'none' : '1px solid var(--border-subtle)',
              padding: '1px 5px',
              borderRadius: '6px',
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
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-card)',
                  borderRadius: '100px',
                  border: '2px solid var(--accent-primary)',
                  padding: '0 4px 0 12px',
                  boxShadow: '0 4px 12px var(--border-card)',
                  boxSizing: 'border-box',
                  zIndex: 3,
                }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  autoFocus
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    padding: '0',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    width: '120px',
                    fontFamily: 'inherit',
                  }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 10px', height: '24px', fontSize: '11px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}>
                  <Check size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <X size={12} />
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
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                borderRadius: '100px',
                background: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                border: isSelected ? 'none' : '1.5px solid var(--border-subtle)',
                boxShadow: isSelected ? '0 4px 12px var(--border-card)' : '0 2px 6px var(--border-card)',
                color: isSelected ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isSelected ? 'translateY(-1px)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--bg-button-hover)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'none';
                }
              }}
              title={`Filter by ${sw.title} (⌘${shortcutNum})`}
            >
              <Folder size={12} style={{ color: isSelected ? 'var(--accent-primary-text)' : 'var(--accent-primary)' }} />
              <span>{sw.title}</span>

              {/* Count badge */}
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: isSelected ? 'var(--accent-primary)' : 'var(--accent-primary)',
                  background: isSelected ? 'var(--accent-primary-text)' : 'var(--bg-input)',
                  border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                  padding: '1px 7px',
                  borderRadius: '100px',
                }}
              >
                {swCards.length}
              </span>

              {/* Shortcut badge */}
              {shortcutNum <= 9 && (
                <kbd
                  style={{
                    fontSize: '9.5px',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-input)',
                    border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                    padding: '1px 5px',
                    borderRadius: '6px',
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
                  width: '20px',
                  height: '20px',
                  padding: 0,
                  marginLeft: '2px',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: isSelected ? 'var(--accent-primary-text)' : 'var(--text-muted)',
                  border: 'none',
                }}
                title="Tab options"
              >
                <MoreHorizontal size={12} />
              </button>
            </div>
          );
        })}

        {/* 3. New Tab Button (+) */}
        {isAdding ? (
          <form
            onSubmit={handleAddSubmit}
            style={{
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-card)',
              borderRadius: '100px',
              border: '2px solid var(--accent-primary)',
              padding: '0 4px 0 12px',
              boxShadow: '0 4px 12px var(--border-card)',
              boxSizing: 'border-box',
              zIndex: 3,
            }}
          >
            <input
              ref={addInputRef}
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="New tab name..."
              autoFocus
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '0',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                width: '130px',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="btn-primary"
              style={{ padding: '0 12px', height: '24px', fontSize: '11.5px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTitle('');
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="btn-icon"
            style={{
              width: '28px',
              height: '28px',
              alignSelf: 'center',
              marginLeft: '4px',
              borderRadius: '50%',
              color: 'var(--accent-primary)',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-subtle)',
            }}
            title="Create new subfolder tab"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* ── Right: View Mode Segmented Control ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'var(--bg-card)',
          padding: '3px',
          borderRadius: '100px',
          border: '1.5px solid var(--border-subtle)',
          boxShadow: '0 2px 6px var(--border-card)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode('tabs')}
          style={{
            padding: '4px 12px',
            borderRadius: '100px',
            border: 'none',
            background: viewMode === 'tabs' ? 'var(--accent-primary)' : 'transparent',
            color: viewMode === 'tabs' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 800,
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: viewMode === 'tabs' ? '0 2px 8px var(--border-card)' : 'none',
          }}
          title="Single Subfolder Focus Mode"
        >
          <LayoutGrid size={12} style={{ color: viewMode === 'tabs' ? 'var(--accent-primary-text)' : 'var(--accent-primary)' }} />
          <span>Focus Tab</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('stacked')}
          style={{
            padding: '4px 12px',
            borderRadius: '100px',
            border: 'none',
            background: viewMode === 'stacked' ? 'var(--accent-primary)' : 'transparent',
            color: viewMode === 'stacked' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 800,
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: viewMode === 'stacked' ? '0 2px 8px var(--border-card)' : 'none',
          }}
          title="Stacked Swimlanes Mode (View all subfolders grouped vertically)"
        >
          <Rows3 size={12} style={{ color: viewMode === 'stacked' ? 'var(--accent-primary-text)' : 'var(--accent-primary)' }} />
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
