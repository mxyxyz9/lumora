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
} from 'lucide-react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface KanbanCardProps {
  card: Card;
  index: number;
  accentColor?: string;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ card, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineCardStatus | undefined>(() =>
    pipelineOrchestrator.getCardStatus(card._id)
  );

  const {
    setActiveCardId,
    activeBoard,
    comments,
    checklists,
    checklistItems,
    attachments,
    customFields,
    deleteCard,
    showConfirm,
  } = useBoardStore();

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

  const hasBadges = cardComments.length > 0
    || totalChecklistItems.length > 0
    || cardAttachments.length > 0
    || (card.assignees && card.assignees.length > 0)
    || card.github;

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

  const dueBadgeStyle: Record<string, React.CSSProperties> = {
    overdue: { background: 'rgba(248,113,113,0.12)', color: 'var(--accent-red)' },
    today:   { background: 'rgba(251,191,36,0.12)',  color: 'var(--accent-amber)' },
    soon:    { background: 'rgba(79,142,247,0.1)',   color: 'var(--accent-blue)' },
  };

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

  return (
    <div
      ref={cardRef}
      onClick={() => setActiveCardId(card._id)}
      className={`kanban-card ${isDragging ? 'is-dragging' : ''}`}
    >
      {/* Drop insertion line indicator */}
      {isDraggedOver && <div className="card-drop-indicator" />}

      {/* Hover Action Buttons (Quick Delete & Grip Handle) */}
      <div className="card-hover-actions">
        <button
          type="button"
          onClick={handleDeleteQuick}
          className="card-action-btn delete"
          title="Delete task"
        >
          <Trash2 size={11} />
        </button>
        <div ref={dragHandleRef} className="card-action-btn" title="Drag to reorder priority">
          <GripVertical size={12} />
        </div>
      </div>

      {/* Card Header Row: Labels, Jira & GitHub Tags */}
      {(activeCardLabels.length > 0 || card.github || card.title.match(/\[([A-Z0-9]+-\d+)\]/i)) && (
        <div className="card-header-row">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', paddingRight: '16px' }}>
            {activeCardLabels.map(l => (
              <span
                key={l._id}
                className="label-chip"
                style={{ background: l.color || '#4b5563' }}
              >
                {l.name || l.color}
              </span>
            ))}

            {card.title.match(/\[([A-Z0-9]+-\d+)\]/i) && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                padding: '2px 6px', borderRadius: 'var(--r-xs)',
                background: 'rgba(35, 131, 226, 0.12)', border: '1px solid rgba(35, 131, 226, 0.3)',
                color: 'var(--accent-blue)', fontSize: '10.5px', fontWeight: 600,
              }}>
                <span>JIRA</span>
                <span>{card.title.match(/\[([A-Z0-9]+-\d+)\]/i)![1]}</span>
              </div>
            )}

            {card.github && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 6px', borderRadius: 'var(--r-xs)',
                background: 'var(--bg-badge)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500,
              }}>
                <Github size={10} />
                <span>#{card.github.issueNumber}</span>
                <span style={{ color: card.github.state === 'open' ? 'var(--success)' : 'var(--text-muted)' }}>
                  {card.github.state}
                </span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Pipeline Status Banner */}
      {pipelineStatus && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '2px 7px', borderRadius: 'var(--r-xs)',
          background: pipelineStatus.isRunning ? 'rgba(99, 102, 241, 0.15)' : 'rgba(52, 211, 153, 0.12)',
          border: `1px solid ${pipelineStatus.isRunning ? 'rgba(99, 102, 241, 0.35)' : 'rgba(52, 211, 153, 0.25)'}`,
          color: pipelineStatus.isRunning ? '#818cf8' : '#34d399',
          fontSize: '10.5px', fontWeight: 600, marginBottom: '6px', maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <Cpu size={10} style={{ flexShrink: 0, animation: pipelineStatus.isRunning ? 'spin 2s linear infinite' : 'none' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pipelineStatus.statusMessage || `Pipeline: ${pipelineStatus.stage}`}
          </span>
        </div>
      )}

      {/* Title */}
      <div
        className="card-title-text"
        style={{
          paddingRight: activeCardLabels.length === 0 && !card.github ? '16px' : undefined,
          color: card.title?.trim() ? 'var(--text-primary)' : 'var(--text-muted)',
          fontStyle: card.title?.trim() ? 'normal' : 'italic',
        }}
      >
        {card.title?.trim() || 'Untitled task'}
      </div>


      {/* Custom fields */}
      {visibleCustomFields.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {visibleCustomFields.map((cf, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '11px', background: 'var(--bg-badge)',
                color: 'var(--text-secondary)', padding: '1px 6px',
                borderRadius: 'var(--r-xs)', border: '1px solid var(--border-subtle)',
              }}
            >
              {cf?.name}: <strong style={{ color: 'var(--text-primary)' }}>{String(cf?.value)}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      {(hasBadges || dueStatus) && (
        <div className="card-footer-badges">
          <div className="card-badges-left">
            {totalChecklistItems.length > 0 && (
              <div
                className={`badge-item ${finishedChecklistItems.length === totalChecklistItems.length ? 'is-completed' : ''}`}
                title={`${finishedChecklistItems.length}/${totalChecklistItems.length} done`}
              >
                <CheckSquare size={11} />
                <span>{finishedChecklistItems.length}/{totalChecklistItems.length}</span>
              </div>
            )}

            {cardComments.length > 0 && (
              <div className="badge-item" title={`${cardComments.length} comments`}>
                <MessageSquare size={11} />
                <span>{cardComments.length}</span>
              </div>
            )}

            {cardAttachments.length > 0 && (
              <div className="badge-item" title={`${cardAttachments.length} attachments`}>
                <Paperclip size={11} />
                <span>{cardAttachments.length}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Due date badge */}
            {dueStatus && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '10.5px', fontWeight: 600, padding: '1px 6px',
                borderRadius: 'var(--r-full)',
                ...(dueBadgeStyle[dueStatus] || {}),
              }}>
                {dueStatus === 'overdue' ? <AlertCircle size={9} /> : <Clock size={9} />}
                {dueLabel}
              </span>
            )}

            {/* Assignees */}
            {card.assignees && card.assignees.length > 0 && (
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: 'var(--bg-badge)', border: '1px solid var(--border-medium)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)',
              }} title={`${card.assignees.length} assignee(s)`}>
                {card.assignees.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
