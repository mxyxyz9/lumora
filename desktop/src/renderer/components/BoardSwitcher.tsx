import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { ChevronDown, Plus, Layout, Check, Trash2, Edit3 } from 'lucide-react';

export const BoardSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    boards,
    activeBoardId,
    activeBoard,
    switchBoard,
    setNewBoardModalOpen,
    deleteBoard,
    updateBoardTitle,
    showConfirm,
  } = useBoardStore();

  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingBoardId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (bId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBoardId(bId);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = async (bId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      await updateBoardTitle(bId, editingTitle.trim());
    }
    setEditingBoardId(null);
  };

  const handleDelete = (bId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'Delete Board',
      message: 'Are you sure you want to delete this workspace project? All lists and tasks will be removed.',
      confirmText: 'Delete Board',
      isDestructive: true,
      onConfirm: async () => {
        await deleteBoard(bId);
      },
    });
  };

  return (
    <div className="board-switcher-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="board-switcher-btn"
        title="Switch Board"
      >
        <div className="board-pill" />
        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeBoard ? activeBoard.title.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u, '') : 'Select Board'}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          className="board-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '280px',
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-modal)',
            padding: '8px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ padding: '6px 8px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Workspaces & Projects ({boards.length})
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {boards.map(b => {
              const isActive = b._id === activeBoardId;
              const isEditing = editingBoardId === b._id;
              const cleanTitle = (b.title || 'Untitled').replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u, '');

              if (isEditing) {
                return (
                  <form
                    key={b._id}
                    onSubmit={(e) => handleSaveRename(b._id, e)}
                    style={{ display: 'flex', gap: '4px', padding: '4px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '4px 8px', fontSize: '11px' }}>Save</button>
                  </form>
                );
              }

              return (
                <div
                  key={b._id}
                  onClick={() => {
                    switchBoard(b._id);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--r-sm)',
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--border-medium)' : 'transparent',
                    color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  className="dropdown-item-hover"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Layout size={14} style={{ opacity: isActive ? 1 : 0.5 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {cleanTitle}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isActive && <Check size={14} />}
                    <button
                      onClick={(e) => handleStartRename(b._id, cleanTitle, e)}
                      title="Rename Board"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                    >
                      <Edit3 size={12} />
                    </button>
                    {boards.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(b._id, e)}
                        title="Delete Board"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

          <button
            onClick={() => {
              setIsOpen(false);
              setNewBoardModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Plus size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Create New Board...</span>
          </button>
        </div>
      )}
    </div>
  );
};
