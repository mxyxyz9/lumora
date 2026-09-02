import React, { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import {
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Folder,
  Calendar,
  Layers,
  Zap,
  Check,
  Filter,
} from 'lucide-react';

function loadGuestData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function parseProjectDisplay(rawTitle: string, explicitIcon?: string) {
  if (explicitIcon) {
    const cleanTitle = rawTitle.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*/u, '');
    return { emoji: explicitIcon, title: cleanTitle || rawTitle };
  }
  const match = rawTitle.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF])\s*(.*)/u);
  if (match) {
    return { emoji: match[1], title: match[2] || rawTitle };
  }
  return { emoji: '🎯', title: rawTitle };
}

export const GlobalWorkspaceHub: React.FC = () => {
  const {
    boards,
    switchBoard,
    setActiveView,
    setActiveCardId,
    setNewBoardModalOpen,
    cards,
    lists,
    swimlanes,
    activeBoardId,
    session,
  } = useBoardStore();

  const handleSelectProject = (boardId: string) => {
    switchBoard(boardId, 'global_hub');
  };

  const handleOpenProjectBoard = async (boardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await switchBoard(boardId, 'board');
  };

  // Load all guest data for computing stats across all projects in guest mode
  const allGuestSwimlanes = session?.isGuest ? loadGuestData<any[]>('kanso_guest_swimlanes', []) : [];
  const allGuestCards = session?.isGuest ? loadGuestData<any[]>('kanso_guest_cards', []) : [];
  const allGuestLists = session?.isGuest ? loadGuestData<any[]>('kanso_guest_lists', []) : [];

  // Global task stats (aggregated across current session cards or guest cards)
  const totalTasks = session?.isGuest ? allGuestCards.length : cards.length;
  const doneCards = session?.isGuest
    ? allGuestCards.filter(c => {
        const l = allGuestLists.find(list => list._id === c.listId);
        return l?.title.toLowerCase().match(/done|complet|shipped/);
      })
    : cards.filter(c => {
        const l = lists.find(list => list._id === c.listId);
        return l?.title.toLowerCase().match(/done|complet|shipped/);
      });
  const inProgressCards = session?.isGuest
    ? allGuestCards.filter(c => {
        const l = allGuestLists.find(list => list._id === c.listId);
        return l?.title.toLowerCase().match(/progress|review|doing|codex|diagnos/);
      })
    : cards.filter(c => {
        const l = lists.find(list => list._id === c.listId);
        return l?.title.toLowerCase().match(/progress|review|doing|codex|diagnos/);
      });
  const overdueCards = (session?.isGuest ? allGuestCards : cards).filter(
    c => c.dueAt && new Date(c.dueAt) < new Date()
  );
  const completionRate = totalTasks > 0 ? Math.round((doneCards.length / totalTasks) * 100) : 0;

  // Upcoming: cards with due dates sorted soonest first
  const upcomingCards = (session?.isGuest ? allGuestCards : cards)
    .filter(c => c.dueAt)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 8);

  // Greeting
  const firstName = session?.username?.split(' ')[0] || session?.username || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div
      className="page-content"
      style={{
        padding: '36px clamp(48px, 6vw, 100px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        boxSizing: 'border-box',
        background: 'var(--bg-canvas)',
      }}
    >
      {/* ── Greeting Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Workspace Overview
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {greeting}, {firstName}.
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Here is what is happening across your projects, subfolders, and upcoming goals.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setNewBoardModalOpen(true)}
          style={{ gap: '6px', height: '34px', fontSize: '13px', borderRadius: 'var(--r-md)' }}
        >
          <Plus size={14} />
          <span>New Project</span>
        </button>
      </div>

      {/* ── KPI Stats Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {[
          {
            label: 'Total Tasks',
            value: totalTasks,
            color: 'var(--text-primary)',
            icon: <Layers size={16} />,
            detail: `${session?.isGuest ? allGuestLists.length : lists.length} columns active`,
          },
          {
            label: 'In Progress',
            value: inProgressCards.length,
            color: 'var(--accent-blue)',
            icon: <TrendingUp size={16} />,
            detail: 'Active execution flow',
          },
          {
            label: 'Overdue',
            value: overdueCards.length,
            color: overdueCards.length > 0 ? 'var(--accent-red)' : 'var(--text-primary)',
            icon: <AlertCircle size={16} />,
            detail: overdueCards.length === 0 ? 'All milestones on schedule' : 'Requires review',
          },
          {
            label: 'Completion',
            value: `${completionRate}%`,
            color: 'var(--accent-green)',
            icon: <CheckCircle2 size={16} />,
            detail: `${doneCards.length} of ${totalTasks} completed`,
          },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--r-lg)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: 'var(--shadow-card)',
              transition: 'border-color var(--t-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {stat.label}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: stat.color, letterSpacing: '-0.02em' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {stat.detail}
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Projects Grid ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Projects & Workstreams
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Click a card to inspect stats & goals, or click &ldquo;Open Board&rdquo; to work directly.
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {boards.length} {boards.length === 1 ? 'project' : 'projects'} in workspace
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {boards.map(b => {
            const isSelected = b._id === activeBoardId;
            const { emoji, title } = parseProjectDisplay(b.title, b.icon);

            // Compute board-specific statistics
            const boardSwimlanes = isSelected
              ? swimlanes
              : session?.isGuest
                ? allGuestSwimlanes.filter(s => s.boardId === b._id)
                : [];
            const boardCards = isSelected
              ? cards
              : session?.isGuest
                ? allGuestCards.filter(c => c.boardId === b._id)
                : [];
            const boardLists = isSelected
              ? lists
              : session?.isGuest
                ? allGuestLists.filter(l => l.boardId === b._id)
                : [];

            const subfoldersCount = Math.max(boardSwimlanes.length, 1);
            const tasksCount = boardCards.length;
            const doneBoardCards = boardCards.filter(c => {
              const l = boardLists.find(list => list._id === c.listId);
              return l?.title.toLowerCase().match(/done|complet|shipped/);
            });
            const boardProgress = tasksCount > 0 ? Math.round((doneBoardCards.length / tasksCount) * 100) : 0;

            return (
              <div
                key={b._id}
                onClick={() => handleSelectProject(b._id)}
                style={{
                  background: 'var(--bg-card)',
                  border: `2px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-card)'}`,
                  borderRadius: 'var(--r-lg)',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  minHeight: '180px',
                  boxShadow: isSelected ? '0 0 16px rgba(79,142,247,0.18)' : 'var(--shadow-card)',
                  transition: 'all var(--t-fast) var(--ease-out)',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)';
                  (e.currentTarget as HTMLElement).style.boxShadow = isSelected
                    ? '0 8px 24px rgba(79,142,247,0.25)'
                    : 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.borderColor = isSelected
                    ? 'var(--accent-blue)'
                    : 'var(--border-card)';
                  (e.currentTarget as HTMLElement).style.boxShadow = isSelected
                    ? '0 0 16px rgba(79,142,247,0.18)'
                    : 'var(--shadow-card)';
                }}
              >
                {/* Header: Icon + Title + Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '17px',
                        flexShrink: 0,
                      }}
                    >
                      {emoji}
                    </div>
                    <span
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={title}
                    >
                      {title}
                    </span>
                  </div>

                  {isSelected ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: 'rgba(79, 142, 247, 0.12)',
                        color: 'var(--accent-blue)',
                        flexShrink: 0,
                      }}
                    >
                      Selected
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: 'var(--bg-badge)',
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      Project
                    </span>
                  )}
                </div>

                {/* Subfolders & Tasks counters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Folder size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{subfoldersCount} {subfoldersCount === 1 ? 'subfolder' : 'subfolders'}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Layers size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{tasksCount} {tasksCount === 1 ? 'task' : 'tasks'}</span>
                  </span>
                </div>

                {/* Uniform Sprint Progress bar across ALL project cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Sprint Progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{boardProgress}%</span>
                  </div>
                  <div className="progress-track" style={{ height: '5px', background: 'var(--bg-badge)' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${boardProgress}%`,
                        background: isSelected ? 'var(--accent-blue)' : 'var(--accent-green)',
                      }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '2px' }}>
                  <button
                    type="button"
                    onClick={(e) => handleOpenProjectBoard(b._id, e)}
                    className="btn-subtle"
                    style={{
                      fontSize: '12px',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '28px',
                      padding: '0 12px',
                      borderRadius: '100px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>Open Board</span>
                    <ArrowRight size={13} style={{ color: 'var(--accent-primary)' }} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Create New Project Card */}
          <div
            onClick={() => setNewBoardModalOpen(true)}
            style={{
              background: 'var(--bg-button-subtle)',
              border: '2px dashed var(--border-medium)',
              borderRadius: 'var(--r-lg)',
              padding: '18px 20px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              minHeight: '180px',
              transition: 'all var(--t-fast) var(--ease-out)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-hover)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-subtle)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-medium)';
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus size={16} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Create New Project
            </span>
          </div>
        </div>
      </div>

      {/* ── Upcoming Deadlines & Goals ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Upcoming Deadlines & Goals
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Tasks across all workstreams with assigned due dates.
            </p>
          </div>

          <button
            onClick={() => setActiveView('calendar')}
            className="btn-subtle"
            style={{ fontSize: '12px', height: '28px', gap: '4px', borderRadius: 'var(--r-sm)' }}
          >
            <Calendar size={13} />
            <span>View Calendar</span>
          </button>
        </div>

        {upcomingCards.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12.5px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            No upcoming task deadlines scheduled. Assign a due date on any card to track it here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingCards.map(card => {
              const due = new Date(card.dueAt!);
              const now = new Date();
              const isOverdue = due < now;
              const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const swimlane = (session?.isGuest ? allGuestSwimlanes : swimlanes).find(sw => sw._id === card.swimlaneId);
              const list = (session?.isGuest ? allGuestLists : lists).find(l => l._id === card.listId);

              return (
                <div
                  key={card._id}
                  onClick={() => setActiveCardId(card._id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--r-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={14} style={{ color: isOverdue ? 'var(--accent-red)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {card.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {swimlane && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Folder size={10} />
                            <span>{swimlane.title}</span>
                          </span>
                        )}
                        {list && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Layers size={10} />
                            <span>{list.title}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--r-sm)',
                        background: isOverdue ? 'rgba(248, 113, 113, 0.12)' : 'rgba(79, 142, 247, 0.1)',
                        color: isOverdue ? 'var(--accent-red)' : 'var(--accent-blue)',
                      }}
                    >
                      {isOverdue ? 'Overdue' : diffDays === 0 ? 'Due Today' : `In ${diffDays}d`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

