import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Folder,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  Layers,
  X,
  CheckCircle2,
} from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC = () => {
  const {
    cards,
    lists,
    swimlanes,
    activeSwimlaneId,
    setActiveSwimlaneId,
    setActiveCardId,
    createCard,
    updateCard,
  } = useBoardStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [inboxTab, setInboxTab] = useState<'upcoming' | 'unscheduled'>('upcoming');
  const [newInboxGoalTitle, setNewInboxGoalTitle] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Month & Year Picker Popover state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Workstream filter dropdown
  const [isWorkstreamOpen, setIsWorkstreamOpen] = useState(false);
  const workstreamRef = useRef<HTMLDivElement>(null);

  // Day Cell Schedule Modal state
  const [selectedDayModalDate, setSelectedDayModalDate] = useState<string | null>(null);
  const [newDayTaskTitle, setNewDayTaskTitle] = useState('');
  const [selectedDaySubfolder, setSelectedDaySubfolder] = useState<string>('all');
  const [selectedDayListId, setSelectedDayListId] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const uniqueSwimlanes = swimlanes.filter((sw, idx, arr) =>
    arr.findIndex(s => s.title === sw.title) === idx
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
      if (workstreamRef.current && !workstreamRef.current.contains(e.target as Node)) {
        setIsWorkstreamOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (calendarMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
      setPickerYear(new Date(year, month - 1, 1).getFullYear());
    }
  };

  const handleNextMonth = () => {
    if (calendarMode === 'week') {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
      setPickerYear(new Date(year, month + 1, 1).getFullYear());
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setPickerYear(now.getFullYear());
  };

  const handleSelectMonthYear = (newMonth: number, newYear: number) => {
    setCurrentDate(new Date(newYear, newMonth, 1));
    setIsPickerOpen(false);
  };

  const filteredCards = activeSwimlaneId === 'all'
    ? cards
    : cards.filter(c => c.swimlaneId === activeSwimlaneId);

  const cardsByDate: Record<string, typeof cards> = {};
  const unscheduledCards: typeof cards = [];
  const upcomingCards: Array<{ card: (typeof cards)[0]; date: Date; dateStr: string; daysRemaining: number }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  filteredCards.forEach(c => {
    const rawDate = c.dueAt || c.startAt;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!cardsByDate[key]) cardsByDate[key] = [];
        cardsByDate[key].push(c);

        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        upcomingCards.push({
          card: c,
          date: d,
          dateStr: key,
          daysRemaining: diffDays,
        });
      } else {
        unscheduledCards.push(c);
      }
    } else {
      unscheduledCards.push(c);
    }
  });

  upcomingCards.sort((a, b) => a.date.getTime() - b.date.getTime());
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const handleCreateDayTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayModalDate || !newDayTaskTitle.trim()) return;
    const targetListId = selectedDayListId || lists[0]?._id;
    if (!targetListId) return;

    await createCard(targetListId, newDayTaskTitle.trim());
    setTimeout(async () => {
      const freshCards = useBoardStore.getState().cards;
      const latest = freshCards[freshCards.length - 1];
      if (latest) {
        await updateCard(latest._id, {
          dueAt: new Date(selectedDayModalDate + 'T12:00:00Z'),
          swimlaneId: selectedDaySubfolder !== 'all' ? selectedDaySubfolder : undefined,
        });
      }
    }, 200);

    setNewDayTaskTitle('');
    setSelectedDayModalDate(null);
  };

  const handleAddInboxGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInboxGoalTitle.trim()) return;
    const defaultList = lists[0];
    if (!defaultList) return;

    await createCard(defaultList._id, newInboxGoalTitle.trim());
    setNewInboxGoalTitle('');
    setIsAddingGoal(false);
  };

  // Build Month Cells
  const calendarCells: Array<{ dayNum: number; isCurrentMonth: boolean; dateKey: string; isToday: boolean }> = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const key = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ dayNum: d, isCurrentMonth: false, dateKey: key, isToday: key === todayKey });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarCells.push({ dayNum: i, isCurrentMonth: true, dateKey: key, isToday: key === todayKey });
  }
  const remaining = 35 - calendarCells.length;
  if (remaining > 0) {
    for (let i = 1; i <= remaining; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      const key = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      calendarCells.push({ dayNum: i, isCurrentMonth: false, dateKey: key, isToday: key === todayKey });
    }
  }

  const activeWorkstreamLabel = activeSwimlaneId === 'all'
    ? 'All Workstreams'
    : swimlanes.find(s => s._id === activeSwimlaneId)?.title || 'Workstream';

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        gap: '16px',
        padding: '16px 20px',
        overflow: 'hidden',
        background: 'var(--bg-canvas)',
      }}
    >
      {/* ── Main Calendar Surface (Soft Rounded Card) ──────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--r-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Top Calendar Toolbar */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-header)',
          }}
        >
          {/* Left: Month Year Picker Trigger & Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }} ref={pickerRef}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(p => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-medium)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  borderRadius: 'var(--r-md)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <span>{monthNames[month]} {year}</span>
                <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* Redesigned Floating Month & Year Selector Popover */}
              {isPickerOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    background: 'var(--bg-modal)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-modal)',
                    padding: '14px',
                    width: '260px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Year pagination row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <button
                      type="button"
                      onClick={() => setPickerYear(p => p - 1)}
                      className="btn-icon"
                      style={{ width: '24px', height: '24px' }}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(p => p + 1)}
                      className="btn-icon"
                      style={{ width: '24px', height: '24px' }}
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Month 3x4 Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {monthNames.map((m, idx) => {
                      const isSelected = idx === month && pickerYear === year;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMonthYear(idx, pickerYear)}
                          style={{
                            padding: '7px 4px',
                            fontSize: '11.5px',
                            fontWeight: isSelected ? 700 : 500,
                            borderRadius: 'var(--r-sm)',
                            border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                            background: isSelected ? 'var(--accent-blue)' : 'var(--bg-canvas)',
                            color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all var(--t-fast)',
                          }}
                        >
                          {m.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button onClick={handlePrevMonth} className="btn-icon" style={{ width: '28px', height: '28px' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={handleToday} className="btn-subtle" style={{ height: '28px', fontSize: '11.5px', padding: '0 8px' }}>
                Today
              </button>
              <button onClick={handleNextMonth} className="btn-icon" style={{ width: '28px', height: '28px' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Right: View toggle & Workstream filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--bg-badge)', padding: '2px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setCalendarMode('month')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: calendarMode === 'month' ? 'var(--bg-card)' : 'transparent',
                  color: calendarMode === 'month' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: calendarMode === 'month' ? 'var(--shadow-xs)' : 'none',
                }}
              >
                <LayoutGrid size={11} />
                <span>Month</span>
              </button>
              <button
                onClick={() => setCalendarMode('week')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: calendarMode === 'week' ? 'var(--bg-card)' : 'transparent',
                  color: calendarMode === 'week' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: calendarMode === 'week' ? 'var(--shadow-xs)' : 'none',
                }}
              >
                <CalendarDays size={11} />
                <span>Week</span>
              </button>
            </div>

            {/* Workstream selector */}
            <div style={{ position: 'relative' }} ref={workstreamRef}>
              <button
                onClick={() => setIsWorkstreamOpen(p => !p)}
                className="btn-subtle"
                style={{ height: '28px', fontSize: '11.5px', gap: '5px', padding: '0 8px' }}
              >
                <Folder size={12} style={{ color: 'var(--accent-blue)' }} />
                <span>{activeWorkstreamLabel}</span>
                <ChevronDown size={11} />
              </button>

              {isWorkstreamOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    background: 'var(--bg-modal)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-modal)',
                    padding: '4px',
                    minWidth: '160px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {[{ _id: 'all', title: 'All Workstreams' }, ...uniqueSwimlanes].map(sw => (
                    <button
                      key={sw._id}
                      onClick={() => { setActiveSwimlaneId(sw._id as any); setIsWorkstreamOpen(false); }}
                      style={{
                        padding: '6px 10px',
                        border: 'none',
                        background: activeSwimlaneId === sw._id ? 'var(--bg-button-hover)' : 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: activeSwimlaneId === sw._id ? 600 : 500,
                        borderRadius: 'var(--r-sm)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {sw.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Calendar Matrix ────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Day Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-header)',
            }}
          >
            {DAY_NAMES.map(day => (
              <div
                key={day}
                style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Month Cells Grid */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridAutoRows: '1fr',
              gap: '4px',
              padding: '6px',
              background: 'var(--bg-card)',
              overflowY: 'auto',
            }}
          >
            {calendarCells.map((cell, idx) => {
              const cellCards = cardsByDate[cell.dateKey] || [];

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDayModalDate(cell.dateKey)}
                  style={{
                    background: cell.isToday ? 'rgba(79, 142, 247, 0.04)' : cell.isCurrentMonth ? 'var(--bg-canvas)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${cell.isToday ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    transition: 'all var(--t-fast)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = cell.isToday ? 'var(--accent-blue)' : 'var(--border-subtle)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: cell.isToday ? 700 : 500,
                        color: cell.isToday ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: cell.isToday ? 'rgba(79, 142, 247, 0.15)' : 'transparent',
                      }}
                    >
                      {cell.dayNum}
                    </span>

                    {cellCards.length > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {cellCards.length}
                      </span>
                    )}
                  </div>

                  {/* Task Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
                    {cellCards.slice(0, 3).map(c => (
                      <div
                        key={c._id}
                        onClick={e => { e.stopPropagation(); setActiveCardId(c._id); }}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--r-xs)',
                          padding: '2px 6px',
                          fontSize: '11px',
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                      </div>
                    ))}
                    {cellCards.length > 3 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        +{cellCards.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right Planning Inbox Panel ──────────────────────────────── */}
      <div
        style={{
          width: '300px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--r-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Inbox Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-header)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Planning Inbox
          </span>
          <button
            onClick={() => setIsAddingGoal(true)}
            className="btn-subtle"
            style={{ height: '24px', fontSize: '11px', padding: '0 6px', gap: '3px' }}
          >
            <Plus size={11} />
            <span>Add Goal</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)', gap: '4px' }}>
          <button
            onClick={() => setInboxTab('upcoming')}
            style={{
              flex: 1,
              padding: '4px 6px',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              background: inboxTab === 'upcoming' ? 'var(--bg-button-hover)' : 'transparent',
              color: inboxTab === 'upcoming' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Upcoming ({upcomingCards.length})
          </button>
          <button
            onClick={() => setInboxTab('unscheduled')}
            style={{
              flex: 1,
              padding: '4px 6px',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              background: inboxTab === 'unscheduled' ? 'var(--bg-button-hover)' : 'transparent',
              color: inboxTab === 'unscheduled' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Unscheduled ({unscheduledCards.length})
          </button>
        </div>

        {/* Add Goal inline input */}
        {isAddingGoal && (
          <form noValidate onSubmit={handleAddInboxGoal} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              type="text"
              value={newInboxGoalTitle}
              onChange={e => setNewInboxGoalTitle(e.target.value)}
              placeholder="Goal or milestone title..."
              className="form-input"
              style={{ height: '28px', fontSize: '12px' }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
              <button type="button" onClick={() => setIsAddingGoal(false)} className="btn-subtle" style={{ height: '24px', fontSize: '11px' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newInboxGoalTitle.trim()}
                className="btn-primary"
                style={{
                  height: '24px',
                  fontSize: '11px',
                  opacity: !newInboxGoalTitle.trim() ? 0.6 : 1,
                  cursor: !newInboxGoalTitle.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Add
              </button>
            </div>
          </form>
        )}

        {/* Inbox Cards List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {inboxTab === 'upcoming' ? (
            upcomingCards.map(({ card: c, dateStr, daysRemaining }) => {
              const isOverdue = daysRemaining < 0;
              const dueTag = isOverdue ? 'Overdue' : daysRemaining === 0 ? 'Today' : `In ${daysRemaining}d`;

              return (
                <div
                  key={c._id}
                  onClick={() => setActiveCardId(c._id)}
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--r-md)',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                      {c.title}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: isOverdue ? 'rgba(248, 113, 113, 0.12)' : 'rgba(79, 142, 247, 0.1)',
                        color: isOverdue ? 'var(--accent-red)' : 'var(--accent-blue)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {dueTag}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {dateStr}
                  </div>
                </div>
              );
            })
          ) : (
            unscheduledCards.map(c => (
              <div
                key={c._id}
                onClick={() => setActiveCardId(c._id)}
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-md)',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.title}
                </span>
                <Clock size={11} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Centered Day Schedule Modal Dialog ───── */}
      {selectedDayModalDate && (() => {
        const isPastDate = selectedDayModalDate < todayKey;
        const dayCards = cardsByDate[selectedDayModalDate] || [];

        return (
          <div
            className="modal-overlay"
            onClick={() => setSelectedDayModalDate(null)}
          >
            <div
              className="modal-dialog"
              style={{
                width: '460px',
                maxWidth: '92vw',
                height: 'auto',
                maxHeight: '85vh',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-header)' }}>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isPastDate ? `Historical Log: ${selectedDayModalDate}` : `Schedule for ${selectedDayModalDate}`}
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {isPastDate ? 'Viewing past milestones and logged tasks' : 'Add a milestone or task to this date'}
                  </p>
                </div>
                <button onClick={() => setSelectedDayModalDate(null)} className="btn-icon" style={{ width: '26px', height: '26px' }}>
                  <X size={14} />
                </button>
              </div>

              {isPastDate ? (
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--r-md)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🔒</span>
                    <span>Historical past date — Read-only mode. New tasks cannot be scheduled in the past.</span>
                  </div>

                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Tasks on this Date ({dayCards.length})
                    </div>
                    {dayCards.length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                        No tasks were scheduled for this date.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                        {dayCards.map(c => (
                          <div
                            key={c._id}
                            onClick={() => {
                              setSelectedDayModalDate(null);
                              setActiveCardId(c._id);
                            }}
                            style={{
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--r-sm)',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {c.title}
                            </span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              Inspect ↗
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button type="button" onClick={() => setSelectedDayModalDate(null)} className="btn-subtle" style={{ height: '30px', fontSize: '12px', padding: '0 14px' }}>
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form noValidate onSubmit={handleCreateDayTask} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newDayTaskTitle}
                      onChange={e => setNewDayTaskTitle(e.target.value)}
                      placeholder="What needs to get done on this day?..."
                      className="form-input"
                      autoFocus
                    />
                  </div>

                  {/* Subfolder Picker */}
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Workstream / Subfolder
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[{ _id: 'all', title: 'Main' }, ...uniqueSwimlanes].map(sw => (
                        <button
                          key={sw._id}
                          type="button"
                          onClick={() => setSelectedDaySubfolder(sw._id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--r-sm)',
                            border: `1px solid ${selectedDaySubfolder === sw._id ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                            background: selectedDaySubfolder === sw._id ? 'rgba(79,142,247,0.15)' : 'var(--bg-card)',
                            color: selectedDaySubfolder === sw._id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {sw.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button type="button" onClick={() => setSelectedDayModalDate(null)} className="btn-subtle" style={{ height: '30px', fontSize: '12px' }}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newDayTaskTitle.trim()}
                      className="btn-primary"
                      style={{
                        height: '30px',
                        fontSize: '12px',
                        padding: '0 14px',
                        opacity: !newDayTaskTitle.trim() ? 0.6 : 1,
                        cursor: !newDayTaskTitle.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Schedule Task
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
