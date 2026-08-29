import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../lib/types';
import { useBoardStore } from '../store/boardStore';
import { Search, X, Calendar, CornerDownLeft, Archive, Tag, GitPullRequest, Layers, FolderKanban } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (card: Card) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    cards,
    lists,
    swimlanes,
    activeBoard,
  } = useBoardStore();

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global search filtering matching Wekan Board.searchCards logic
  const searchResults = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return [];

    let regex: RegExp;
    try {
      regex = new RegExp(term, 'i');
    } catch {
      // Escape special characters if user types invalid regex
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, 'i');
    }

    return cards.filter((card) => {
      // Filter out archived unless toggle is enabled
      if (!includeArchived && card.archived) {
        return false;
      }

      // Title match
      if (regex.test(card.title)) return true;

      // Description match
      if (card.description && regex.test(card.description)) return true;

      // GitHub issue / metadata match
      if (card.github) {
        if (regex.test(String(card.github.issueNumber))) return true;
        if (regex.test(card.github.repo)) return true;
      }

      // Custom fields match
      if (card.customFields && Array.isArray(card.customFields)) {
        for (const cf of card.customFields) {
          if (cf.value !== undefined && cf.value !== null) {
            if (regex.test(String(cf.value))) return true;
          }
        }
      }

      return false;
    });
  }, [cards, searchTerm, includeArchived]);

  // Keyboard navigation for Cmd+K search dialog
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (searchResults.length > 0 ? (prev + 1) % searchResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (searchResults.length > 0 ? (prev - 1 + searchResults.length) % searchResults.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        onSelectCard(searchResults[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const getListName = (listId: string) => {
    const l = lists.find((item) => item._id === listId);
    return l ? l.title : 'List';
  };

  const getSwimlaneName = (swimlaneId?: string) => {
    if (!swimlaneId) return 'General';
    const s = swimlanes.find((item) => item._id === swimlaneId);
    return s ? s.title : 'General';
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
      }}
    >
      <div
        className="modal-dialog"
        style={{
          width: '680px',
          maxWidth: '92vw',
          maxHeight: '78vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-modal)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border-medium)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-header)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Search size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search cards, descriptions, custom fields... (Cmd+K)"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          )}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            ESC
          </span>
        </div>

        {/* Options & Metadata Bar */}
        <div
          style={{
            padding: '7px 16px',
            background: 'var(--bg-canvas)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{
                accentColor: 'var(--accent-blue)',
                cursor: 'pointer',
                borderRadius: '3px',
              }}
            />
            <span style={{ color: includeArchived ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Include archived cards
            </span>
          </label>

          <span style={{ fontSize: '11px' }}>
            {searchTerm.trim() ? `${searchResults.length} match${searchResults.length !== 1 ? 'es' : ''} found` : `Searching "${activeBoard?.title || 'Workspace'}"`}
          </span>
        </div>

        {/* Results Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {!searchTerm.trim() ? (
            <div
              style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Search size={24} style={{ color: 'var(--border-strong)', marginBottom: '4px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Type to search workspace
              </div>
              <div style={{ fontSize: '11.5px', maxWidth: '340px', lineHeight: 1.4 }}>
                Instant live search across titles, markdown descriptions, tags, and custom fields with full regex support.
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div
              style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Archive size={24} style={{ color: 'var(--border-strong)', marginBottom: '4px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                No cards matched "{searchTerm}"
              </div>
              {!includeArchived && (
                <button
                  type="button"
                  onClick={() => setIncludeArchived(true)}
                  className="btn-subtle"
                  style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--accent-blue)' }}
                >
                  Search inside archived cards?
                </button>
              )}
            </div>
          ) : (
            searchResults.map((card, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={card._id}
                  onClick={() => {
                    onSelectCard(card);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-button-hover)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {card.title}
                      </span>
                      {card.archived && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 'var(--r-full)',
                            background: 'rgba(234,179,8,0.15)',
                            color: '#eab308',
                            border: '1px solid rgba(234,179,8,0.3)',
                          }}
                        >
                          Archived
                        </span>
                      )}
                      {card.github && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontFamily: 'var(--font-mono)',
                            padding: '1px 5px',
                            borderRadius: 'var(--r-full)',
                            background: 'rgba(168,85,247,0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168,85,247,0.3)',
                          }}
                        >
                          GH #{card.github.issueNumber}
                        </span>
                      )}
                    </div>

                    {card.description && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {card.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                        {getListName(card.listId)}
                      </span>
                      <span>·</span>
                      <span>{getSwimlaneName(card.swimlaneId)}</span>
                      {card.dueAt && (
                        <>
                          <span>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={10} />
                            {new Date(card.dueAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
                      opacity: isSelected ? 1 : 0.4,
                    }}
                  >
                    <CornerDownLeft size={13} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            padding: '7px 16px',
            background: 'var(--bg-header)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↑ ↓</strong> navigate</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↵</strong> open card</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>esc</strong> close</span>
          </div>
          <span>Lumora Board Search</span>
        </div>
      </div>
    </div>
  );
};
