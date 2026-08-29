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
        {/* Grip handle */}
        <div
          ref={dragHandleRef}
          style={{ cursor: 'grab', color: 'var(--text-subtle)', display: 'flex', flexShrink: 0 }}
          title="Drag to reorder column"
        >
          <GripVertical size={13} />
        </div>

        {/* Accent dot */}
        <div
          className="column-accent-dot"
          style={{ background: accentColor }}
        />

        {/* Title */}
        <div className="column-title-box">
          {isEditingTitle ? (
            <form onSubmit={handleSaveTitle} style={{ flex: 1 }}>
              <input
                type="text"
                value={listTitle}
                onChange={e => setListTitle(e.target.value)}
                autoFocus
                onBlur={handleSaveTitle}
                className="form-input"
                style={{ padding: '3px 7px', fontSize: '13px', height: '26px' }}
              />
            </form>
          ) : (
            <div
              className="column-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename column"
            >
              <span>{list.title}</span>
              <Edit2 size={11} className="column-title-edit-icon" />
            </div>
          )}
        </div>

        {/* Count + Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', position: 'relative', flexShrink: 0 }} ref={menuRef}>
          <span className="column-count-badge">{cards.length}</span>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="btn-icon"
            style={{ width: '24px', height: '24px' }}
            title="Column options"
          >
            <MoreHorizontal size={13} />
          </button>

          {isMenuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0,
              width: '160px',
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-md)',
              padding: '4px',
              zIndex: 60,
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <button
                onClick={() => { setIsMenuOpen(false); setIsEditingTitle(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', background: 'none', border: 'none',
                  color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
                  borderRadius: 'var(--r-sm)', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-button-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Edit2 size={12} style={{ color: 'var(--text-muted)' }} />
                <span>Rename</span>
              </button>

              <button
                onClick={handleDeleteList}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', background: 'none', border: 'none',
                  color: 'var(--danger)', fontSize: '13px', cursor: 'pointer',
                  borderRadius: 'var(--r-sm)', textAlign: 'left',
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
      </div>

      {/* Thin accent line under header */}
      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 12px' }} />

      {/* Card list */}
      <div className="column-card-list">
        {cards.map((card, idx) => (
          <KanbanCard key={card._id} card={card} index={idx} accentColor={accentColor} />
        ))}
      </div>

      {/* Add Card Section */}
      {isAddingCard ? (
        <form onSubmit={handleQuickAddSubmit} style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-md)', margin: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
            placeholder="Task title... (Enter to add, Esc to close)"
            rows={2}
            autoFocus
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              lineHeight: 1.45,
              fontFamily: 'var(--font)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="submit"
                disabled={!newCardTitle.trim()}
                className="btn-primary"
                style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
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
                style={{ height: '24px', fontSize: '11px', padding: '0 6px' }}
              >
                Cancel
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenDrawerWithDraft}
              className="btn-subtle"
              style={{ height: '24px', fontSize: '10.5px', gap: '4px', padding: '0 6px' }}
              title="Open full task drawer"
            >
              <Maximize2 size={10} />
              <span>Full Drawer</span>
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingCard(true)}
          className="add-card-btn"
        >
          <Plus size={13} />
          <span>Add a task</span>
        </button>
      )}
    </div>
  );
};
