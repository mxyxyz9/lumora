import React, { useState, useRef, useEffect } from 'react';
import { List, Card as CardType } from '../lib/types';
import { KanbanCard } from './KanbanCard';
import { useBoardStore } from '../store/boardStore';
import { Plus, MoreHorizontal, Edit2, Trash2, X, GripVertical, Maximize2 } from 'lucide-react';
import { dropTargetForElements, draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

// Accent colors per list index
const LIST_COLORS = ['#4f8ef7', '#9b8af7', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c'];

interface ListColumnProps {
  list: List;
  cards: CardType[];
  index: number;
}

export const ListColumn: React.FC<ListColumnProps> = ({ list, cards, index }) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { createCard, updateList, deleteList, showConfirm, setActiveCardId, activeSwimlaneId } = useBoardStore();

  const accentColor = LIST_COLORS[index % LIST_COLORS.length];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'list', listId: list._id, index }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });
  }, [list._id, index]);

  useEffect(() => {
    const handleEl = dragHandleRef.current;
    const colEl = columnRef.current;
    if (!handleEl || !colEl) return;
    return draggable({
      element: colEl,
      dragHandle: handleEl,
      getInitialData: () => ({ type: 'list', listId: list._id, index }),
      onDragStart: () => setIsDraggingList(true),
      onDrop: () => setIsDraggingList(false),
    });
  }, [list._id, index]);

  const handleQuickAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newCardTitle.trim();
    if (!title) {
      setIsAddingCard(false);
      return;
    }
    const targetSwimlaneId = activeSwimlaneId !== 'all' ? activeSwimlaneId : undefined;
    await createCard(list._id, title, '', targetSwimlaneId);
    setNewCardTitle('');
    // Keep focus in textarea so user can rapidly add another card
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleOpenDrawerWithDraft = async () => {
    const targetSwimlaneId = activeSwimlaneId !== 'all' ? activeSwimlaneId : undefined;
    const title = newCardTitle.trim();
    const newCardId = await createCard(list._id, title, '', targetSwimlaneId);
    setNewCardTitle('');
    setIsAddingCard(false);
    if (newCardId) {
      setActiveCardId(newCardId);
    }
  };

  const handleSaveTitle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (listTitle.trim() && listTitle !== list.title) {
      await updateList(list._id, { title: listTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDeleteList = () => {
    setIsMenuOpen(false);
    showConfirm({
      title: 'Delete Column',
      message: `Are you sure you want to delete column "${list.title}" and all its tasks? This action cannot be undone.`,
      confirmText: 'Delete Column',
      isDestructive: true,
      onConfirm: async () => {
        await deleteList(list._id);
      },
    });
  };

  return (
    <div
      ref={columnRef}
      className={`kanban-column ${isDraggedOver ? 'is-drag-over' : ''} ${isDraggingList ? 'is-dragging' : ''}`}
      style={{ '--card-accent': accentColor } as any}
    >
      {/* Column Header */}
      <div className="column-header">
        {/* Title & Grip */}
        <div className="column-title-box">
          <div
            ref={dragHandleRef}
            style={{ cursor: 'grab', color: 'var(--text-subtle)', display: 'flex', flexShrink: 0, padding: '2px' }}
            title="Drag to reorder column"
          >
            <GripVertical size={14} />
          </div>

          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} style={{ flex: 1 }}>
              <input
                type="text"
                value={listTitle}
                onChange={e => setListTitle(e.target.value)}
                autoFocus
                onBlur={handleSaveTitle}
                className="form-input"
                style={{ padding: '4px 10px', fontSize: '1.1rem', fontWeight: 800, height: '32px', borderRadius: '12px' }}
              />
            </form>
          ) : (
            <div
              className="column-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename column"
            >
              <span>{list.title}</span>
              <Edit2 size={13} className="column-title-edit-icon" />
            </div>
          )}
        </div>

        {/* Count Pill Badge + Quick Add + Options Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', flexShrink: 0 }} ref={menuRef}>
          <span className="column-count">{cards.length}</span>

          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="btn-icon"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Quick add task"
          >
            <Plus size={14} />
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn-icon"
            style={{ width: '28px', height: '28px', borderRadius: '50%', color: 'var(--text-muted)' }}
            title="Column options"
          >
            <MoreHorizontal size={15} />
          </button>

          {isMenuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              width: '160px',
              background: 'var(--bg-modal)',
              border: '1.5px solid var(--border-medium)',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-md)',
              padding: '6px',
              zIndex: 60,
              display: 'flex', flexDirection: 'column', gap: '3px',
            }}>
              <button
                onClick={() => { setIsMenuOpen(false); setIsEditingTitle(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  borderRadius: '12px', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Edit2 size={13} style={{ color: 'var(--text-muted)' }} />
                <span>Rename</span>
              </button>

              <button
                onClick={handleDeleteList}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', background: 'none', border: 'none',
                  color: 'var(--danger)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  borderRadius: '12px', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Quick Add Form (when isAddingCard is triggered) */}
      {isAddingCard && (
        <form
          onSubmit={handleQuickAddSubmit}
          style={{
            padding: '16px',
            background: 'var(--bg-card)',
            border: '2px solid var(--border-subtle)',
            borderRadius: '24px',
            margin: '0 0 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 8px 24px var(--border-card)',
            flexShrink: 0,
            animation: 'cardPopIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={newCardTitle}
            onChange={e => setNewCardTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickAddSubmit();
              } else if (e.key === 'Escape') {
                setIsAddingCard(false);
                setNewCardTitle('');
              }
            }}
            placeholder="What needs to be done? (Enter to save)"
            rows={2}
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '10px 12px',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: '13.5px',
              fontWeight: 600,
              lineHeight: 1.45,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="submit"
                disabled={!newCardTitle.trim()}
                className="btn-primary"
                style={{ height: '30px', fontSize: '12px', padding: '0 14px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}
              >
                Add Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCard(false);
                  setNewCardTitle('');
                }}
                className="btn-subtle"
                style={{ height: '30px', fontSize: '12px', padding: '0 12px', borderRadius: '100px' }}
              >
                Cancel
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenDrawerWithDraft}
              className="btn-subtle"
              style={{ height: '30px', fontSize: '11.5px', gap: '5px', padding: '0 10px', borderRadius: '100px' }}
              title="Open full task drawer"
            >
              <Maximize2 size={12} />
              <span>Details</span>
            </button>
          </div>
        </form>
      )}

      {/* Card list */}
      <div className="card-list">
        {cards.map((card, idx) => (
          <KanbanCard key={card._id} card={card} index={idx} accentColor={accentColor} />
        ))}
        {isDraggedOver && cards.length === 0 && (
          <div className="card-drop-slot">
            <span>✦ Drop task here ✦</span>
          </div>
        )}
      </div>

      {/* Bottom "+ Add Task" Button (always accessible) */}
      {!isAddingCard && (
        <button
          type="button"
          onClick={() => setIsAddingCard(true)}
          className="add-task-btn"
          style={{ flexShrink: 0 }}
        >
          <span>+ Add Task</span>
        </button>
      )}
    </div>
  );
};
