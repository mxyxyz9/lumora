import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { Archive, RotateCcw, Trash2, X, Search, Calendar, Folder, Layers } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';

export const ArchivedCardsModal: React.FC = () => {
  const {
    isArchivedCardsModalOpen,
    setArchivedCardsModalOpen,
    cards,
    lists,
    swimlanes,
    unarchiveCard,
    deleteCard,
    showConfirm,
  } = useBoardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>('all');

  if (!isArchivedCardsModalOpen) return null;

  const archivedCards = cards.filter(c => !!c.archived);

  const columnOptions = [
    { value: 'all', label: `All Columns (${archivedCards.length})` },
    ...lists.map(l => ({
      value: l._id,
      label: l.title,
      badge: `${archivedCards.filter(c => c.listId === l._id).length}`,
    })),
  ];

  const filteredCards = archivedCards.filter(c => {
    const matchesSearch = !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesList = selectedListId === 'all' || c.listId === selectedListId;
    return matchesSearch && matchesList;
  });

  const handleRestore = async (cardId: string, title: string) => {
    await unarchiveCard(cardId);
  };

  const handleDeletePermanently = (cardId: string, title: string) => {
    showConfirm({
      title: 'Permanently Delete Task',
      message: `Are you sure you want to permanently delete "${title || 'Untitled Task'}"? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      isDestructive: true,
      onConfirm: async () => {
        await deleteCard(cardId);
      },
    });
  };

  return (
    <div
      className="confirm-modal-overlay"
      onClick={() => setArchivedCardsModalOpen(false)}
      style={{ zIndex: 110 }}
    >
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '36px',
          background: 'var(--bg-modal)',
          border: '1.5px solid var(--border-medium)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
      >
        {/* Seamless Minimalist Header & Search Filter */}
        <div
          style={{
            padding: '24px 24px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'var(--bg-modal)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Archive size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <div>
                <h2 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Archived Tasks ({archivedCards.length})
                </h2>
                <p className="modal-subtitle" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Review, restore back to board, or permanently clean up archived tasks.
                </p>
              </div>
            </div>

            <button
              onClick={() => setArchivedCardsModalOpen(false)}
              className="btn-icon"
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Unified Inline Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {/* Search box */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search archived tasks..."
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: '12px',
                  height: '36px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '100px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* List Column Filter */}
            <div style={{ width: '190px', flexShrink: 0 }}>
              <CustomDropdown
                value={selectedListId}
                options={columnOptions}
                onChange={setSelectedListId}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'var(--bg-column)',
          }}
        >
          {filteredCards.length === 0 ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--bg-card)',
                borderRadius: '24px',
                border: '1.5px dashed var(--border-subtle)',
              }}
            >
              <Archive size={32} style={{ color: 'var(--accent-primary)', margin: '0 auto 12px', opacity: 0.6 }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {searchQuery || selectedListId !== 'all'
                  ? 'No matching archived tasks found'
                  : 'No archived tasks in this project'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Archive completed cards from Done or Backlog to keep your board clean.
              </div>
            </div>
          ) : (
            filteredCards.map(card => {
              const list = lists.find(l => l._id === card.listId);
              const swimlane = swimlanes.find(s => s._id === card.swimlaneId);

              return (
                <div
                  key={card._id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: '0 4px 12px var(--border-card)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {card.title || 'Untitled Task'}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {list && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={11} style={{ color: 'var(--accent-primary)' }} />
                          <span>{list.title}</span>
                        </span>
                      )}
                      {swimlane && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Folder size={11} style={{ color: 'var(--accent-primary)' }} />
                          <span>{swimlane.title}</span>
                        </span>
                      )}
                      {card.dueAt && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} />
                          <span>Due {new Date(card.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleRestore(card._id, card.title)}
                      className="btn-primary"
                      style={{
                        height: '32px',
                        fontSize: '12px',
                        padding: '0 14px',
                        borderRadius: '100px',
                        gap: '6px',
                        background: 'var(--accent-primary)',
                        color: 'var(--accent-primary-text)',
                      }}
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePermanently(card._id, card.title)}
                      className="btn-destructive"
                      style={{
                        height: '32px',
                        fontSize: '12px',
                        padding: '0 12px',
                        borderRadius: '100px',
                        gap: '4px',
                      }}
                      title="Permanently delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
