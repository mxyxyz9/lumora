import React, { useRef, useState, useEffect } from 'react';
import { Card, PipelineCardStatus } from '../lib/types';
import { useBoardStore } from '../store/boardStore';
import { pipelineOrchestrator } from '../lib/pipelineOrchestrator';
import {
  MessageSquare,
  CheckSquare,
  Paperclip,
  Github,
  AlertCircle,
  Clock,
  GripVertical,
  Cpu,
  CheckCircle2,
  Trash2,
  Archive,
  Palette,
} from 'lucide-react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface KanbanCardProps {
  card: Card;
  index: number;
  accentColor?: string;
}

// Pastel & Theme-Aware Color Palette for Playful Cards
export const PASTEL_PALETTES = [
  { id: 'yellow', name: 'Yellow', bg: '#ffeaa7', text: '#b28900', title: '#382800', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#8a6a00', darkBg: '#272015', darkText: '#fde68a', darkTitle: '#fef3c7', darkBorder: 'rgba(245, 158, 11, 0.35)', darkTagBg: 'rgba(245, 158, 11, 0.15)', darkTagColor: '#fbbf24' },
  { id: 'purple', name: 'Purple', bg: '#e0d4ff', text: '#493396', title: '#24143a', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#493396', darkBg: '#251e3e', darkText: '#e9d5ff', darkTitle: '#f5f3ff', darkBorder: 'rgba(168, 85, 247, 0.35)', darkTagBg: 'rgba(168, 85, 247, 0.15)', darkTagColor: '#c084fc' },
  { id: 'sky', name: 'Sky Blue', bg: '#c7ecee', text: '#1e7075', title: '#0c383b', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#1e7075', darkBg: '#142538', darkText: '#bae6fd', darkTitle: '#f0f9ff', darkBorder: 'rgba(56, 189, 248, 0.35)', darkTagBg: 'rgba(56, 189, 248, 0.15)', darkTagColor: '#38bdf8' },
  { id: 'coral', name: 'Coral Red', bg: '#ffb8b8', text: '#a62a2a', title: '#4d0f0f', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#a62a2a', darkBg: '#331722', darkText: '#fecdd3', darkTitle: '#fff1f2', darkBorder: 'rgba(244, 63, 94, 0.35)', darkTagBg: 'rgba(244, 63, 94, 0.15)', darkTagColor: '#fb7185' },
  { id: 'green', name: 'Sage Green', bg: '#d4f1dd', text: '#1f8b4d', title: '#0a3d20', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#1f8b4d', darkBg: '#132c22', darkText: '#a7f3d0', darkTitle: '#ecfdf5', darkBorder: 'rgba(52, 211, 153, 0.35)', darkTagBg: 'rgba(52, 211, 153, 0.15)', darkTagColor: '#34d399' },
  { id: 'peach', name: 'Peach', bg: '#ffe5d9', text: '#c45b38', title: '#52200f', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#c45b38', darkBg: '#321c13', darkText: '#fed7aa', darkTitle: '#fff7ed', darkBorder: 'rgba(249, 115, 22, 0.35)', darkTagBg: 'rgba(249, 115, 22, 0.15)', darkTagColor: '#fb923c' },
  { id: 'pink', name: 'Blush Pink', bg: '#ffccdf', text: '#a62a6e', title: '#4a0f30', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#a62a6e', darkBg: '#32152e', darkText: '#fbcfe8', darkTitle: '#fdf2f8', darkBorder: 'rgba(236, 72, 153, 0.35)', darkTagBg: 'rgba(236, 72, 153, 0.15)', darkTagColor: '#f472b6' },
  { id: 'slate', name: 'Cool Slate', bg: '#f1f2f6', text: '#57606f', title: '#2f3542', tagBg: 'rgba(255,255,255,0.7)', tagColor: '#57606f', darkBg: '#1c283e', darkText: '#cbd5e1', darkTitle: '#f8fafc', darkBorder: 'rgba(148, 163, 184, 0.35)', darkTagBg: 'rgba(148, 163, 184, 0.15)', darkTagColor: '#94a3b8' },
];

export function getCardPalette(card: Card, _index?: number) {
  if (card.color) {
    const found = PASTEL_PALETTES.find(p => p.id === card.color?.toLowerCase() || p.name.toLowerCase() === card.color?.toLowerCase());
    if (found) return found;
    const map: Record<string, typeof PASTEL_PALETTES[0]> = {
      blue: PASTEL_PALETTES[2],
      red: PASTEL_PALETTES[3],
      orange: PASTEL_PALETTES[5],
      gray: PASTEL_PALETTES[7],
      yellow: PASTEL_PALETTES[0],
      purple: PASTEL_PALETTES[1],
      green: PASTEL_PALETTES[4],
      pink: PASTEL_PALETTES[6],
    };
    if (map[card.color.toLowerCase()]) return map[card.color.toLowerCase()];
  }
  let hash = 0;
  for (let i = 0; i < (card._id || '').length; i++) {
    hash = (hash * 31 + card._id.charCodeAt(i)) & 0xffffffff;
  }
  const palIndex = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[palIndex];
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ card, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineCardStatus | undefined>(() =>
    pipelineOrchestrator.getCardStatus(card._id)
  );

  const {
    settings,
    setActiveCardId,
    activeBoard,
    comments,
    checklists,
    checklistItems,
    attachments,
    customFields,
    deleteCard,
    archiveCard,
    updateCard,
    showConfirm,
  } = useBoardStore();

  const isDarkTheme = ['midnight', 'abyss', 'emerald_dark', 'dark', 'oled'].includes(settings.theme || '');
  const palette = getCardPalette(card, index);

  const cardBg = isDarkTheme ? (palette.darkBg || 'var(--bg-card)') : palette.bg;
  const cardText = isDarkTheme ? (palette.darkText || 'var(--text-secondary)') : palette.text;
  const cardTitle = isDarkTheme ? (palette.darkTitle || 'var(--text-primary)') : palette.title;
  const cardBorder = isDarkTheme ? (palette.darkBorder || '1px solid var(--border-subtle)') : '1px solid rgba(0,0,0,0.04)';
  const tagBg = isDarkTheme ? (palette.darkTagBg || 'rgba(255,255,255,0.08)') : palette.tagBg;
  const tagColor = isDarkTheme ? (palette.darkTagColor || palette.text) : palette.tagColor;

  useEffect(() => {
    const unsub = pipelineOrchestrator.subscribe((status) => {
      if (status.cardId === card._id) {
        setPipelineStatus({ ...status });
      }
    });
    return () => unsub();
  }, [card._id]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const cleanupDraggable = draggable({
      element: el,
      getInitialData: () => ({ type: 'card', cardId: card._id, listId: card.listId, sort: card.sort ?? index, index }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    const cleanupDropTarget = dropTargetForElements({
      element: el,
      getData: () => ({ type: 'card', cardId: card._id, listId: card.listId, sort: card.sort ?? index, index }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
    });

    return () => {
      cleanupDraggable();
      cleanupDropTarget();
    };
  }, [card._id, card.listId, card.sort, index]);

  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isColorPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColorPickerOpen]);

  const cardComments = comments.filter(c => c.cardId === card._id);
  const cardChecklists = checklists.filter(c => c.cardId === card._id);
  const totalChecklistItems = checklistItems.filter(i => cardChecklists.some(cl => cl._id === i.checklistId));
  const finishedChecklistItems = totalChecklistItems.filter(i => i.isFinished);
  const cardAttachments = attachments.filter(a => a.cardId === card._id);

  const boardLabels = activeBoard?.labels || [];
  const activeCardLabels = boardLabels.filter(l => (card.labelIds || []).includes(l._id));

  const visibleCustomFields = (card.customFields || []).map(cfVal => {
    const def = customFields.find(f => f._id === cfVal._id);
    if (!def || !def.showOnCard || !cfVal.value) return null;
    return { name: def.name, value: cfVal.value, type: def.type };
  }).filter(Boolean);

  // Due date status
  let dueStatus: null | 'overdue' | 'today' | 'soon' = null;
  let dueLabel = '';
  if (card.dueAt) {
    const due = new Date(card.dueAt);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    if (diffDays < 0) { dueStatus = 'overdue'; dueLabel = 'Overdue'; }
    else if (diffDays === 0) { dueStatus = 'today'; dueLabel = 'Due today'; }
    else if (diffDays <= 2) { dueStatus = 'soon'; dueLabel = `Due in ${diffDays}d`; }
  }

  // Format short display date for prototype parity (e.g. "Oct 12")
  let displayDateStr = '';
  if (card.dueAt) {
    const d = new Date(card.dueAt);
    displayDateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else if (card.createdAt) {
    const d = new Date(card.createdAt);
    displayDateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const handleDeleteQuick = (e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task "${card.title || 'Untitled task'}"?`,
      confirmText: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        await deleteCard(card._id);
      },
    });
  };

  const handleArchiveQuick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await archiveCard(card._id);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Non-shifting zero-jitter drop indicator line */}
      {isDraggedOver && (
        <div className="card-drop-indicator" />
      )}

      <div
        ref={cardRef}
        onClick={() => setActiveCardId(card._id)}
        className={`kanban-card ${isDragging ? 'is-dragging' : ''}`}
        style={{
          backgroundColor: cardBg,
          color: cardText,
          border: cardBorder,
          transform: isDraggedOver ? 'translateY(4px)' : undefined,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        }}
      >
        {/* Hover Action Buttons (Quick Color, Archive, Delete & Grip Handle) */}
        <div className="card-hover-actions">
        {/* Quick Color Picker */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsColorPickerOpen(p => !p);
            }}
            className="card-action-btn"
            title="Change card color"
          >
            <Palette size={12} />
          </button>

          {isColorPickerOpen && (
            <div
              ref={colorPickerRef}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                background: 'var(--bg-modal)',
                border: '1.5px solid var(--border-medium)',
                borderRadius: '16px',
                padding: '8px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
                zIndex: 60,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                width: '140px',
              }}
            >
              {PASTEL_PALETTES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={async () => {
                    await updateCard(card._id, { color: p.id });
                    setIsColorPickerOpen(false);
                  }}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: isDarkTheme ? p.darkBg : p.bg,
                    border: (card.color === p.id || (!card.color && palette.id === p.id))
                      ? '2px solid var(--accent-primary)'
                      : `1px solid ${isDarkTheme ? p.darkBorder : 'rgba(0,0,0,0.1)'}`,
                    cursor: 'pointer',
                  }}
                  title={p.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Archive Button */}
        <button
          type="button"
          onClick={handleArchiveQuick}
          className="card-action-btn"
          title="Archive task (keep board clean)"
        >
          <Archive size={12} />
        </button>

        {/* Quick Delete Button */}
        <button
          type="button"
          onClick={handleDeleteQuick}
          className="card-action-btn delete"
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>

        <div ref={dragHandleRef} className="card-action-btn" title="Drag to reorder priority">
          <GripVertical size={13} />
        </div>
      </div>

      {/* Card Header Row: Tags / Labels */}
      <div className="card-header-row">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {activeCardLabels.length > 0 ? (
            activeCardLabels.map(l => (
              <span
                key={l._id}
                className="label-chip"
                style={{
                  background: tagBg,
                  color: tagColor,
                }}
              >
                {l.name || l.color}
              </span>
            ))
          ) : (
            // Default playful category tag if none assigned
            <span
              className="label-chip"
              style={{
                background: tagBg,
                color: tagColor,
              }}
            >
              Task
            </span>
          )}

          {card.title.match(/\[([A-Z0-9]+-\d+)\]/i) && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '4px 10px', borderRadius: '100px',
              background: tagBg,
              color: tagColor, fontSize: '11px', fontWeight: 800,
            }}>
              <span>JIRA {card.title.match(/\[([A-Z0-9]+-\d+)\]/i)![1]}</span>
            </div>
          )}

          {card.github && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '100px',
              background: tagBg,
              color: tagColor, fontSize: '11px', fontWeight: 800,
            }}>
              <Github size={11} />
              <span>#{card.github.issueNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Status Banner */}
      {pipelineStatus && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '100px',
          background: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.8)',
          color: cardTitle,
          fontSize: '11px', fontWeight: 800, margin: '4px 0', maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        }}>
          <Cpu size={11} style={{ flexShrink: 0, animation: pipelineStatus.isRunning ? 'spin 2s linear infinite' : 'none' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pipelineStatus.statusMessage || `Pipeline: ${pipelineStatus.stage}`}
          </span>
        </div>
      )}

      {/* Title */}
      <h3
        className="card-title-text"
        style={{
          color: cardTitle,
        }}
      >
        {card.title?.trim() || 'Untitled task'}
      </h3>

      {/* Custom fields */}
      {visibleCustomFields.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0' }}>
          {visibleCustomFields.map((cf, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '11.5px', background: tagBg,
                color: tagColor, padding: '2px 8px',
                borderRadius: '100px', fontWeight: 700,
              }}
            >
              {cf?.name}: <strong>{String(cf?.value)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Footer / Meta Row: Date & Avatar */}
      <div className="card-footer-meta">
        <div className="card-meta-date" style={{ color: cardText }}>
          {displayDateStr || 'Today'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Badge Indicators */}
          {totalChecklistItems.length > 0 && (
            <div
              className={`card-meta-badge ${finishedChecklistItems.length === totalChecklistItems.length ? 'is-completed' : ''}`}
              style={{ background: tagBg, color: tagColor }}
              title={`${finishedChecklistItems.length}/${totalChecklistItems.length} checklist items done`}
            >
              <CheckSquare size={12} />
              <span>{finishedChecklistItems.length}/{totalChecklistItems.length}</span>
            </div>
          )}

          {cardComments.length > 0 && (
            <div
              className="card-meta-badge"
              style={{ background: tagBg, color: tagColor }}
              title={`${cardComments.length} comments`}
            >
              <MessageSquare size={12} />
              <span>{cardComments.length}</span>
            </div>
          )}

          {cardAttachments.length > 0 && (
            <div
              className="card-meta-badge"
              style={{ background: tagBg, color: tagColor }}
              title={`${cardAttachments.length} attachments`}
            >
              <Paperclip size={12} />
              <span>{cardAttachments.length}</span>
            </div>
          )}

          {/* Circular Card Avatar */}
          <div
            className="card-meta-avatar"
            style={{
              background: isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              color: isDarkTheme ? '#ffffff' : '#3b2a59',
            }}
            title={card.assignees && card.assignees.length > 0 ? `${card.assignees.length} assignee(s)` : 'Assigned'}
          >
            {card.assignees && card.assignees.length > 0 ? card.assignees.length : '✦'}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

