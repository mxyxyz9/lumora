import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../lib/types';
import { useBoardStore } from '../store/boardStore';
import { getCardPalette } from './KanbanCard';
import { Search, X, Calendar, CornerDownLeft, Archive, Tag, GitPullRequest, Layers, FolderKanban, Sparkles } from 'lucide-react';

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
    settings,
  } = useBoardStore();

  const isDarkTheme = ['midnight', 'abyss', 'emerald_dark', 'dark', 'oled'].includes(settings.theme || '');

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
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, 'i');
    }

    return cards.filter((card) => {
      if (!includeArchived && card.archived) {
        return false;
      }
      if (regex.test(card.title)) return true;
      if (card.description && regex.test(card.description)) return true;
      if (card.github) {
        if (regex.test(String(card.github.issueNumber))) return true;
        if (regex.test(card.github.repo)) return true;
      }
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
    if (!swimlaneId) return 'Main';
    const s = swimlanes.find((item) => item._id === swimlaneId);
    return s ? s.title : 'Main';
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
        paddingTop: '10vh',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(10px)',
        zIndex: 200,
      }}
    >
      <div
        className="modal-dialog"
        style={{
          width: '640px',
          maxWidth: '92vw',
          maxHeight: '78vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-modal)',
          borderRadius: '36px',
          border: '1.5px solid var(--border-medium)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input Bar */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1.5px solid var(--border-subtle)',
            background: 'var(--bg-modal)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Search size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search cards, tasks, descriptions, or #tags..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 700,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={12} />
            </button>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--accent-primary)',
              padding: '3px 10px',
              borderRadius: '100px',
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
            padding: '8px 22px',
            background: 'var(--bg-input)',
            borderBottom: '1.5px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{
                accentColor: 'var(--accent-primary)',
                cursor: 'pointer',
                width: '15px',
                height: '15px',
                borderRadius: '4px',
              }}
            />
            <span style={{ color: includeArchived ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
              Include archived cards
            </span>
          </label>

          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {searchTerm.trim() ? `${searchResults.length} match${searchResults.length !== 1 ? 'es' : ''}` : `${cards.length} cards in workspace`}
          </span>
        </div>

        {/* Results Body */}
        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {!searchTerm.trim() ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '18px', background: 'var(--bg-input)', border: '1.5px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={24} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Instant Workspace Search
              </div>
              <div style={{ fontSize: '12px', maxWidth: '360px', lineHeight: 1.45, fontWeight: 600 }}>
                Type keywords, tags, or descriptions to find tasks across all columns and subfolders.
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                {['bug', 'offline', 'calendar', 'sync', 'pipeline'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSearchTerm(tag)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '100px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-primary)',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Archive size={28} style={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                No cards matched "{searchTerm}"
              </div>
              {!includeArchived && (
                <button
                  type="button"
                  onClick={() => setIncludeArchived(true)}
                  className="btn-subtle"
                  style={{ fontSize: '12px', marginTop: '4px', color: 'var(--accent-primary)', borderRadius: '100px', padding: '4px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', fontWeight: 800 }}
                >
                  Search inside archived cards?
                </button>
              )}
            </div>
          ) : (
            searchResults.map((card, idx) => {
              const isSelected = idx === selectedIndex;
              const pal = getCardPalette(card, idx);

              const cardBg = isDarkTheme ? (pal.darkBg || 'var(--bg-card)') : pal.bg;
              const cardTitle = isDarkTheme ? (pal.darkTitle || 'var(--text-primary)') : pal.title;
              const cardText = isDarkTheme ? (pal.darkText || 'var(--text-secondary)') : pal.text;
              const tagBg = isDarkTheme ? (pal.darkTagBg || 'rgba(255,255,255,0.08)') : pal.tagBg;
              const tagColor = isDarkTheme ? (pal.darkTagColor || pal.text) : pal.tagColor;
              const cardBorder = isDarkTheme
                ? (isSelected ? '2px solid var(--accent-primary)' : (pal.darkBorder || '1px solid var(--border-subtle)'))
                : (isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(0,0,0,0.06)');

              return (
                <div
                  key={card._id}
                  onClick={() => {
                    onSelectCard(card);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    background: cardBg,
                    border: cardBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: isSelected ? '0 8px 20px rgba(124, 92, 229, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: cardTitle,
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
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '100px',
                            background: tagBg,
                            color: tagColor,
                          }}
                        >
                          Archived
                        </span>
                      )}
                      {card.github && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '100px',
                            background: tagBg,
                            color: tagColor,
                          }}
                        >
                          GH #{card.github.issueNumber}
                        </span>
                      )}
                    </div>

                    {card.description && (
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: cardText,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          opacity: 0.85,
                          fontWeight: 500,
                        }}
                      >
                        {card.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: tagColor, marginTop: '2px', fontWeight: 700 }}>
                      <span style={{ padding: '2px 8px', borderRadius: '100px', background: tagBg }}>
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
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                      opacity: isSelected ? 1 : 0.4,
                      flexShrink: 0,
                    }}
                  >
                    <CornerDownLeft size={16} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            padding: '10px 22px',
            background: 'var(--bg-input)',
            borderTop: '1.5px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span><strong style={{ color: 'var(--text-primary)' }}>↑ ↓</strong> navigate</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>↵</strong> open card</span>
            <span><strong style={{ color: 'var(--text-primary)' }}>esc</strong> close</span>
          </div>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>Workspace Search</span>
        </div>
      </div>
    </div>
  );
};
