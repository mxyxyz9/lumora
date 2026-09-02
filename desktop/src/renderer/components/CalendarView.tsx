import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../store/boardStore';
import { getCardPalette, PASTEL_PALETTES } from './KanbanCard';
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
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  Filter,
  GripVertical,
  Check,
} from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    settings,
  } = useBoardStore();

  const isDarkTheme = ['midnight', 'abyss', 'emerald_dark', 'dark', 'oled'].includes(settings.theme || '');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [inboxTab, setInboxTab] = useState<'upcoming' | 'unscheduled'>('unscheduled');
  const [newInboxGoalTitle, setNewInboxGoalTitle] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  // Drag & Drop tracking state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);

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
  const [selectedDayColor, setSelectedDayColor] = useState<string>('purple');
  const [selectedDayTime, setSelectedDayTime] = useState<string>('10:00 AM');

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

  const handlePrev = () => {
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

  const handleNext = () => {
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

  const filteredCards = (activeSwimlaneId === 'all'
    ? cards
    : cards.filter(c => c.swimlaneId === activeSwimlaneId)
  ).filter(c => !c.archived);

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

  const handleScheduleCardToDate = async (cardId: string, dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    await updateCard(cardId, { dueAt: targetDate });
    setDragOverDateKey(null);
    setDraggedCardId(null);
  };

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
          color: selectedDayColor,
          description: selectedDayTime !== 'All Day' ? `Time: ${selectedDayTime}` : undefined,
        });
      }
    }, 200);

    setNewDayTaskTitle('');
    setSelectedDayModalDate(null);
  };

  const handleAddInboxGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInboxGoalTitle.trim() || !lists[0]?._id) return;
    await createCard(lists[0]._id, newInboxGoalTitle.trim());
    setNewInboxGoalTitle('');
    setIsAddingGoal(false);
  };

  // Month grid cells generation
  const monthCells: Array<{ dayNum: number; dateKey: string; isCurrentMonth: boolean; isToday: boolean }> = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthCells.push({ dayNum: day, dateKey: key, isCurrentMonth: false, isToday: key === todayKey });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthCells.push({ dayNum: day, dateKey: key, isCurrentMonth: true, isToday: key === todayKey });
  }
  const remaining = 35 - monthCells.length > 0 ? 35 - monthCells.length : (42 - monthCells.length > 0 ? 42 - monthCells.length : 0);
  for (let day = 1; day <= remaining; day++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    monthCells.push({ dayNum: day, dateKey: key, isCurrentMonth: false, isToday: key === todayKey });
  }

  // Week Mode Days (7 vertical column days)
  const curr = new Date(currentDate);
  const dayOfWeek = curr.getDay();
  const startOfWeek = new Date(curr);
  startOfWeek.setDate(curr.getDate() - dayOfWeek);

  const weekDays: Array<{ dayName: string; dayNum: number; dateKey: string; isToday: boolean; monthName: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    weekDays.push({
      dayName: DAY_NAMES[i],
      dayNum: d.getDate(),
      dateKey: key,
      isToday: key === todayKey,
      monthName: monthNames[d.getMonth()].slice(0, 3),
    });
  }

  const weekRangeLabel = `${weekDays[0].monthName} ${weekDays[0].dayNum} – ${weekDays[6].monthName} ${weekDays[6].dayNum}, ${weekDays[6].dateKey.slice(0, 4)}`;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        padding: '24px 28px',
        gap: '24px',
        background: 'var(--bg-canvas, #f4f0ff)',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* ── Main Left Section: Calendar Grid Area ──────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Top Floating Control Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card, #ffffff)',
            padding: '10px 20px',
            borderRadius: '24px',
            border: '1.5px solid var(--border-subtle, #ede8f9)',
            boxShadow: '0 4px 16px rgba(100, 80, 200, 0.05)',
            flexShrink: 0,
          }}
        >
          {/* Left: Month / Week Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }} ref={pickerRef}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(p => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-input, #fbf9ff)',
                  border: '1.5px solid var(--border-subtle, #ede8f9)',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--text-primary, #201435)',
                  cursor: 'pointer',
                  padding: '6px 16px',
                  borderRadius: '100px',
                  boxShadow: '0 2px 6px rgba(100, 80, 200, 0.04)',
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                <CalendarIcon size={15} style={{ color: 'var(--accent-primary, #7c5ce5)' }} />
                <span>{calendarMode === 'month' ? `${monthNames[month]} ${year}` : weekRangeLabel}</span>
                <ChevronDown size={13} style={{ color: 'var(--accent-primary, #7c5ce5)' }} />
              </button>

              {/* Floating Month & Year Selector Popover */}
              {isPickerOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    background: 'var(--bg-modal)',
                    border: '1.5px solid var(--border-medium)',
                    borderRadius: '28px',
                    boxShadow: 'var(--shadow-modal)',
                    padding: '16px',
                    width: '280px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <button
                      type="button"
                      onClick={() => setPickerYear(p => p - 1)}
                      className="btn-icon"
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(p => p + 1)}
                      className="btn-icon"
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {monthNames.map((m, idx) => {
                      const isSelected = idx === month && pickerYear === year;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMonthYear(idx, pickerYear)}
                          style={{
                            padding: '8px 4px',
                            fontSize: '12px',
                            fontWeight: isSelected ? 800 : 600,
                            borderRadius: '14px',
                            border: isSelected ? 'none' : '1.5px solid var(--border-subtle)',
                            background: isSelected ? 'var(--accent-primary)' : 'var(--bg-input)',
                            color: isSelected ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
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

            {/* Prev / Today / Next Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handlePrev}
                className="btn-icon"
                style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                title="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleToday}
                className="btn-subtle"
                style={{ height: '30px', fontSize: '12px', padding: '0 12px', borderRadius: '100px', fontWeight: 800 }}
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="btn-icon"
                style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                title="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Right: View toggle & Subfolder Filter & Add Task */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Month / Week Segmented Pill */}
            <div style={{ display: 'flex', background: 'var(--bg-input, #f4f0ff)', padding: '3px', borderRadius: '100px', border: '1.5px solid var(--border-subtle, #ede8f9)' }}>
              <button
                type="button"
                onClick={() => setCalendarMode('week')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: calendarMode === 'week' ? 'var(--accent-primary, #7c5ce5)' : 'transparent',
                  color: calendarMode === 'week' ? '#ffffff' : 'var(--text-secondary, #635280)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: calendarMode === 'week' ? '0 2px 8px rgba(124, 92, 229, 0.25)' : 'none',
                }}
              >
                <CalendarDays size={12} />
                <span>Week</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarMode('month')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  background: calendarMode === 'month' ? 'var(--accent-primary, #7c5ce5)' : 'transparent',
                  color: calendarMode === 'month' ? '#ffffff' : 'var(--text-secondary, #635280)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: calendarMode === 'month' ? '0 2px 8px rgba(124, 92, 229, 0.25)' : 'none',
                }}
              >
                <LayoutGrid size={12} />
                <span>Month</span>
              </button>
            </div>

            {/* Subfolder Workstream Filter Pill */}
            <div style={{ position: 'relative' }} ref={workstreamRef}>
              <button
                type="button"
                onClick={() => setIsWorkstreamOpen(p => !p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1.5px solid var(--border-subtle, #ede8f9)',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--text-primary, #3b2a59)',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: '100px',
                  boxShadow: '0 2px 6px rgba(100, 80, 200, 0.04)',
                }}
              >
                <Filter size={12} style={{ color: 'var(--accent-primary, #7c5ce5)' }} />
                <span>
                  {activeSwimlaneId === 'all'
                    ? 'All Subfolders'
                    : uniqueSwimlanes.find(s => s._id === activeSwimlaneId)?.title || 'Subfolder'}
                </span>
                <ChevronDown size={12} style={{ opacity: 0.6 }} />
              </button>

              {isWorkstreamOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: 'var(--bg-modal)',
                    border: '1.5px solid var(--border-medium)',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-modal)',
                    padding: '6px',
                    width: '180px',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setActiveSwimlaneId('all'); setIsWorkstreamOpen(false); }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      background: activeSwimlaneId === 'all' ? 'var(--bg-button-hover)' : 'transparent',
                      color: activeSwimlaneId === 'all' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    All Subfolders
                  </button>
                  {uniqueSwimlanes.map(sw => (
                    <button
                      key={sw._id}
                      type="button"
                      onClick={() => { setActiveSwimlaneId(sw._id); setIsWorkstreamOpen(false); }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeSwimlaneId === sw._id ? 'var(--bg-button-hover)' : 'transparent',
                        color: activeSwimlaneId === sw._id ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
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

            {/* Quick Add Event button */}
            <button
              type="button"
              onClick={() => setSelectedDayModalDate(todayKey)}
              className="btn-primary"
              style={{ height: '32px', fontSize: '12px', padding: '0 14px', borderRadius: '100px', background: 'var(--accent-primary, #7c5ce5)' }}
            >
              <Plus size={13} />
              <span>+ Schedule Task</span>
            </button>
          </div>
        </div>

        {/* ── 36px Rounded Calendar Canvas ──────────────────────────────── */}
        <div
          style={{
            flex: 1,
            background: 'var(--bg-card, #ffffff)',
            border: '1.5px solid var(--border-subtle, #ede8f9)',
            borderRadius: '36px',
            boxShadow: '0 16px 40px rgba(100, 80, 200, 0.08)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {calendarMode === 'month' ? (
            /* ── MONTH VIEW (DRAG & DROP DROP TARGET) ── */
            <>
              {/* Day of Week Header Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', flexShrink: 0 }}>
                {DAY_NAMES.map(d => (
                  <div
                    key={d}
                    style={{
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--accent-primary, #7c5ce5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: 'var(--bg-input, #f4f0ff)',
                      padding: '6px 0',
                      borderRadius: '100px',
                      border: '1px solid var(--border-subtle, #ede8f9)',
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Month Day Grid Container */}
              <div
                className="no-scrollbar"
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridAutoRows: '1fr',
                  gap: '10px',
                  overflowY: 'auto',
                  minHeight: 0,
                }}
              >
                {monthCells.map((cell, idx) => {
                  const cellCards = cardsByDate[cell.dateKey] || [];
                  const isHoveredTarget = dragOverDateKey === cell.dateKey;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDayModalDate(cell.dateKey)}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverDateKey !== cell.dateKey) setDragOverDateKey(cell.dateKey);
                      }}
                      onDragLeave={e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverDateKey(null);
                        }
                      }}
                      onDrop={async e => {
                        e.preventDefault();
                        const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
                        if (cardId) {
                          await handleScheduleCardToDate(cardId, cell.dateKey);
                        }
                        setDragOverDateKey(null);
                        setDraggedCardId(null);
                      }}
                      style={{
                        background: isHoveredTarget
                          ? 'var(--bg-input)'
                          : cell.isToday
                          ? 'var(--bg-card)'
                          : cell.isCurrentMonth
                          ? 'var(--bg-card)'
                          : 'var(--bg-app)',
                        border: isHoveredTarget
                          ? '2.5px dashed var(--accent-primary)'
                          : cell.isToday
                          ? '2px solid var(--accent-primary)'
                          : '1.5px solid var(--border-subtle)',
                        borderRadius: '20px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        cursor: 'pointer',
                        opacity: cell.isCurrentMonth ? 1 : 0.5,
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isHoveredTarget ? '0 0 0 3px rgba(124, 92, 229, 0.2)' : 'none',
                      }}
                    >
                      {/* Day Number Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: cell.isToday ? 'var(--accent-primary-text)' : cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: cell.isToday ? 'var(--accent-primary)' : 'transparent',
                            boxShadow: cell.isToday ? '0 2px 8px rgba(124, 92, 229, 0.35)' : 'none',
                          }}
                        >
                          {cell.dayNum}
                        </span>

                        {cellCards.length > 0 && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: 'var(--accent-primary)',
                              background: 'var(--bg-input)',
                              padding: '1px 7px',
                              borderRadius: '100px',
                            }}
                          >
                            {cellCards.length}
                          </span>
                        )}
                      </div>

                      {/* Task Pills (Draggable to move between days!) */}
                      <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', marginTop: '2px' }}>
                        {cellCards.slice(0, 3).map((c, cardIdx) => {
                          const pal = getCardPalette(c, cardIdx);
                          const cardBg = isDarkTheme ? (pal.darkBg || 'var(--bg-card)') : pal.bg;
                          const cardTitle = isDarkTheme ? (pal.darkTitle || 'var(--text-primary)') : pal.title;
                          const cardBorder = isDarkTheme ? (pal.darkBorder || '1px solid var(--border-subtle)') : '1px solid rgba(0,0,0,0.06)';

                          return (
                            <div
                              key={c._id}
                              draggable={true}
                              onDragStart={e => {
                                e.stopPropagation();
                                e.dataTransfer.setData('text/plain', c._id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedCardId(c._id);
                              }}
                              onDragEnd={() => {
                                setDraggedCardId(null);
                                setDragOverDateKey(null);
                              }}
                              onClick={e => {
                                e.stopPropagation();
                                setActiveCardId(c._id);
                              }}
                              style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: '10px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                color: cardTitle,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                transition: 'all 0.15s ease',
                                cursor: 'grab',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: cardTitle,
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                            </div>
                          );
                        })}
                        {cellCards.length > 3 && (
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#7c5ce5', textAlign: 'center', marginTop: '2px' }}>
                            +{cellCards.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── DEDICATED 7-COLUMN WEEK VIEW (WITH DRAG & DROP & DROP PREVIEWS) ── */
            <div
              className="no-scrollbar"
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '12px',
                overflowX: 'auto',
                overflowY: 'hidden',
                minHeight: 0,
              }}
            >
              {weekDays.map((day) => {
                const dayCards = cardsByDate[day.dateKey] || [];
                const isHoveredTarget = dragOverDateKey === day.dateKey;

                return (
                  <div
                    key={day.dateKey}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverDateKey !== day.dateKey) {
                        setDragOverDateKey(day.dateKey);
                      }
                    }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverDateKey(null);
                      }
                    }}
                    onDrop={async e => {
                      e.preventDefault();
                      const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
                      if (cardId) {
                        await handleScheduleCardToDate(cardId, day.dateKey);
                      }
                      setDragOverDateKey(null);
                      setDraggedCardId(null);
                    }}
                    style={{
                      background: isHoveredTarget ? 'var(--bg-input)' : day.isToday ? 'var(--bg-input)' : 'var(--bg-card)',
                      border: isHoveredTarget
                        ? '2.5px dashed var(--accent-primary)'
                        : day.isToday
                        ? '2px solid var(--accent-primary)'
                        : '1.5px solid var(--border-subtle)',
                      borderRadius: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      boxShadow: isHoveredTarget
                        ? '0 0 0 3px var(--border-card), 0 12px 30px var(--border-card)'
                        : day.isToday
                        ? '0 8px 24px var(--border-card)'
                        : '0 2px 8px var(--border-card)',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: isHoveredTarget ? 'scale(1.02)' : 'none',
                    }}
                  >
                    {/* Day Column Header */}
                    <div
                      style={{
                        padding: '12px 10px 10px',
                        borderBottom: '1.5px solid var(--border-subtle)',
                        background: day.isToday ? 'var(--bg-input)' : 'var(--bg-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 800, color: day.isToday ? 'var(--accent-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {day.dayName}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 800,
                            color: day.isToday ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                            background: day.isToday ? 'var(--accent-primary)' : 'transparent',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: day.isToday ? '0 2px 8px rgba(124, 92, 229, 0.35)' : 'none',
                          }}
                        >
                          {day.dayNum}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: 'var(--accent-primary)',
                            background: 'var(--bg-input)',
                            padding: '1px 6px',
                            borderRadius: '100px',
                          }}
                        >
                          {dayCards.length}
                        </span>
                      </div>
                    </div>

                    {/* Day Cards List */}
                    <div
                      className="no-scrollbar"
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        overflowY: 'auto',
                      }}
                    >
                      {/* Active Drop Slot Preview */}
                      {isHoveredTarget && (
                        <div className="card-drop-slot" style={{ margin: '2px 0' }}>
                          <span>✦ Drop on {day.dayName} ✦</span>
                        </div>
                      )}

                      {dayCards.length === 0 && !isHoveredTarget ? (
                        <div style={{ textAlign: 'center', padding: '24px 4px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                          No tasks scheduled
                        </div>
                      ) : (
                        dayCards.map((c, idx) => {
                          const pal = getCardPalette(c, idx);
                          const isCardDragged = draggedCardId === c._id;
                          const cardBg = isDarkTheme ? (pal.darkBg || 'var(--bg-card)') : pal.bg;
                          const cardTitle = isDarkTheme ? (pal.darkTitle || 'var(--text-primary)') : pal.title;
                          const cardBorder = isDarkTheme ? (pal.darkBorder || '1px solid var(--border-subtle)') : '1px solid rgba(0,0,0,0.06)';
                          const tagBg = isDarkTheme ? (pal.darkTagBg || 'rgba(255,255,255,0.08)') : pal.tagBg;
                          const tagColor = isDarkTheme ? (pal.darkTagColor || pal.text) : pal.tagColor;

                          return (
                            <div
                              key={c._id}
                              draggable={true}
                              onDragStart={e => {
                                e.stopPropagation();
                                e.dataTransfer.setData('text/plain', c._id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedCardId(c._id);
                              }}
                              onDragEnd={() => {
                                setDraggedCardId(null);
                                setDragOverDateKey(null);
                              }}
                              onClick={() => setActiveCardId(c._id)}
                              style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: '18px',
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                cursor: 'grab',
                                opacity: isCardDragged ? 0.4 : 1,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.02)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'none';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                              }}
                            >
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: cardTitle, lineHeight: 1.35, wordBreak: 'break-word' }}>
                                {c.title}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', gap: '4px' }}>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '100px',
                                    background: tagBg,
                                    color: tagColor,
                                  }}
                                >
                                  Task
                                </span>

                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '100px',
                                    background: 'var(--bg-button-hover)',
                                    color: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <Clock size={10} />
                                  <span>10:00 AM</span>
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quick Add Day Task Trigger */}
                    <div style={{ padding: '6px 8px 8px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-input)', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDayModalDate(day.dateKey)}
                        style={{
                          width: '100%',
                          height: '28px',
                          border: 'none',
                          borderRadius: '100px',
                          background: 'var(--bg-button-subtle)',
                          color: 'var(--accent-primary)',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-hover)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-subtle)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--accent-primary)';
                        }}
                      >
                        <Plus size={12} />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Section: Planning Inbox & Unscheduled Tasks (DRAGGABLE) ── */}
      <div
        style={{
          width: '320px',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-subtle)',
          borderRadius: '36px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          padding: '16px 16px 14px',
          gap: '12px',
        }}
      >
        {/* Unified Minimalist Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Planning Inbox
            </span>
          </div>
          <button
            onClick={() => setIsAddingGoal(true)}
            className="btn-primary"
            style={{ height: '28px', fontSize: '11.5px', padding: '0 12px', gap: '4px', borderRadius: '100px', background: 'var(--accent-primary)', color: 'var(--accent-primary-text)' }}
          >
            <Plus size={12} />
            <span>Add Goal</span>
          </button>
        </div>

        {/* Integrated Segmented Pill Switcher */}
        <div style={{ display: 'flex', padding: '4px', background: 'var(--bg-input)', borderRadius: '100px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setInboxTab('upcoming')}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: 'none',
              borderRadius: '100px',
              background: inboxTab === 'upcoming' ? 'var(--accent-primary)' : 'transparent',
              color: inboxTab === 'upcoming' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: inboxTab === 'upcoming' ? '0 2px 8px rgba(124, 92, 229, 0.25)' : 'none',
            }}
          >
            Upcoming ({upcomingCards.length})
          </button>
          <button
            type="button"
            onClick={() => setInboxTab('unscheduled')}
            style={{
              flex: 1,
              padding: '6px 10px',
              border: 'none',
              borderRadius: '100px',
              background: inboxTab === 'unscheduled' ? 'var(--accent-primary)' : 'transparent',
              color: inboxTab === 'unscheduled' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: inboxTab === 'unscheduled' ? '0 2px 8px rgba(124, 92, 229, 0.25)' : 'none',
            }}
          >
            Unscheduled ({unscheduledCards.length})
          </button>
        </div>

        {/* Drag Hint Banner */}
        <div style={{ padding: '6px 12px', background: 'var(--bg-input)', borderRadius: '12px', fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GripVertical size={12} />
          <span>Drag tasks directly onto calendar days to schedule!</span>
        </div>

        {/* Add Goal inline input */}
        {isAddingGoal && (
          <form
            onSubmit={handleAddInboxGoal}
            style={{
              padding: '12px 14px',
              borderBottom: '1.5px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'var(--bg-input)',
            }}
          >
            <input
              type="text"
              value={newInboxGoalTitle}
              onChange={e => setNewInboxGoalTitle(e.target.value)}
              placeholder="Goal or milestone title..."
              style={{
                height: '32px',
                fontSize: '12.5px',
                padding: '0 12px',
                borderRadius: '14px',
                border: '1.5px solid var(--border-subtle)',
                outline: 'none',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="btn-subtle"
                style={{ height: '26px', fontSize: '11.5px', padding: '0 10px', borderRadius: '100px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newInboxGoalTitle.trim()}
                className="btn-primary"
                style={{
                  height: '26px',
                  fontSize: '11.5px',
                  padding: '0 12px',
                  borderRadius: '100px',
                  background: 'var(--accent-primary)',
                  color: 'var(--accent-primary-text)',
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
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {inboxTab === 'upcoming' ? (
            upcomingCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600 }}>
                No upcoming deadlines. Everything is on track! ✨
              </div>
            ) : (
              upcomingCards.map(({ card: c, dateStr, daysRemaining }, idx) => {
                const isOverdue = daysRemaining < 0;
                const dueTag = isOverdue ? 'Overdue' : daysRemaining === 0 ? 'Today' : `In ${daysRemaining}d`;
                const pal = getCardPalette(c, idx);
                const isCardDragged = draggedCardId === c._id;
                const cardBg = isDarkTheme ? (pal.darkBg || 'var(--bg-card)') : pal.bg;
                const cardTitle = isDarkTheme ? (pal.darkTitle || 'var(--text-primary)') : pal.title;
                const cardBorder = isDarkTheme ? (pal.darkBorder || '1px solid var(--border-subtle)') : '1px solid rgba(0,0,0,0.06)';
                const tagBg = isDarkTheme ? (pal.darkTagBg || 'rgba(255,255,255,0.08)') : pal.tagBg;
                const tagColor = isDarkTheme ? (pal.darkTagColor || pal.text) : pal.tagColor;

                return (
                  <div
                    key={c._id}
                    draggable={true}
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', c._id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedCardId(c._id);
                    }}
                    onDragEnd={() => {
                      setDraggedCardId(null);
                      setDragOverDateKey(null);
                    }}
                    onClick={() => setActiveCardId(c._id)}
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      borderRadius: '18px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      cursor: 'grab',
                      opacity: isCardDragged ? 0.4 : 1,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: cardTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {c.title}
                      </span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '100px',
                          background: isOverdue ? 'rgba(239, 68, 68, 0.2)' : tagBg,
                          color: isOverdue ? 'var(--accent-red)' : tagColor,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        {dueTag}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: tagColor, opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            unscheduledCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600 }}>
                All tasks are scheduled on the calendar! 📅
              </div>
            ) : (
              unscheduledCards.map((c, idx) => {
                const pal = getCardPalette(c, idx);
                const isCardDragged = draggedCardId === c._id;
                const cardBg = isDarkTheme ? (pal.darkBg || 'var(--bg-card)') : pal.bg;
                const cardTitle = isDarkTheme ? (pal.darkTitle || 'var(--text-primary)') : pal.title;
                const cardBorder = isDarkTheme ? (pal.darkBorder || '1px solid var(--border-subtle)') : '1px solid rgba(0,0,0,0.06)';

                return (
                  <div
                    key={c._id}
                    draggable={true}
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', c._id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedCardId(c._id);
                    }}
                    onDragEnd={() => {
                      setDraggedCardId(null);
                      setDragOverDateKey(null);
                    }}
                    onClick={() => setActiveCardId(c._id)}
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      borderRadius: '18px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'grab',
                      opacity: isCardDragged ? 0.4 : 1,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: cardTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, marginRight: '8px' }}>
                      {c.title}
                    </span>
                    <button
                      type="button"
                      onClick={async e => {
                        e.stopPropagation();
                        await handleScheduleCardToDate(c._id, todayKey);
                      }}
                      className="btn-subtle"
                      style={{ height: '24px', fontSize: '10.5px', padding: '0 8px', borderRadius: '100px', fontWeight: 800, whiteSpace: 'nowrap', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
                      title="Schedule for Today"
                    >
                      + Today
                    </button>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* ── Centered Day Schedule Modal Dialog ─────────────────────────── */}
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
                width: '480px',
                maxWidth: '92vw',
                height: 'auto',
                maxHeight: '85vh',
                background: 'var(--bg-modal)',
                borderRadius: '36px',
                border: '1.5px solid var(--border-medium)',
                boxShadow: 'var(--shadow-modal)',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: '1.5px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-modal)' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {isPastDate ? `Historical Log: ${selectedDayModalDate}` : `Schedule Task for ${selectedDayModalDate}`}
                  </h3>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                    {isPastDate ? 'Viewing past milestones and logged tasks' : 'Add a scheduled milestone or task to this date'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayModalDate(null)}
                  className="btn-icon"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--accent-primary)' }}
                >
                  <X size={15} />
                </button>
              </div>

              {isPastDate ? (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🔒</span>
                    <span>Historical past date — Read-only mode. New tasks cannot be scheduled in the past.</span>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Tasks on this Date ({dayCards.length})
                    </div>
                    {dayCards.length === 0 ? (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                        No tasks were scheduled for this date.
                      </div>
                    ) : (
                      <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {dayCards.map((c, idx) => {
                          const pal = getCardPalette(c, idx);
                          const cardBg = isDarkTheme ? (pal.darkBg || 'var(--bg-card)') : pal.bg;
                          const cardTitle = isDarkTheme ? (pal.darkTitle || 'var(--text-primary)') : pal.title;
                          const cardBorder = isDarkTheme ? (pal.darkBorder || '1px solid var(--border-subtle)') : '1px solid rgba(0,0,0,0.06)';
                          const tagColor = isDarkTheme ? (pal.darkTagColor || pal.text) : pal.tagColor;

                          return (
                            <div
                              key={c._id}
                              onClick={() => {
                                setSelectedDayModalDate(null);
                                setActiveCardId(c._id);
                              }}
                              style={{
                                background: cardBg,
                                border: cardBorder,
                                borderRadius: '16px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '13px', fontWeight: 700, color: cardTitle }}>
                                {c.title}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: tagColor }}>
                                Open →
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1.5px solid var(--border-subtle)' }}>
                    <button type="button" onClick={() => setSelectedDayModalDate(null)} className="btn-subtle" style={{ height: '32px', fontSize: '12px', padding: '0 16px', borderRadius: '100px' }}>
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateDayTask} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newDayTaskTitle}
                      onChange={e => setNewDayTaskTitle(e.target.value)}
                      placeholder="What needs to get done on this day?..."
                      style={{
                        width: '100%',
                        height: '40px',
                        background: 'var(--bg-input)',
                        border: '1.5px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '0 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Time Slot Selector */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                      Time Slot / Meeting Hour
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', 'All Day'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedDayTime(t)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '100px',
                            border: selectedDayTime === t ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
                            background: selectedDayTime === t ? 'var(--bg-button-hover)' : 'var(--bg-card)',
                            color: selectedDayTime === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Color Picker */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                      Card Color
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {PASTEL_PALETTES.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedDayColor(p.id)}
                          style={{
                            background: isDarkTheme ? p.darkBg : p.bg,
                            border: selectedDayColor === p.id ? '2.5px solid var(--accent-primary)' : `1px solid ${isDarkTheme ? p.darkBorder : 'rgba(0,0,0,0.1)'}`,
                            borderRadius: '14px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 800,
                            fontSize: '11px',
                            color: isDarkTheme ? p.darkTitle : p.title,
                          }}
                        >
                          {p.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workstream / Subfolder */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                      Workstream / Subfolder
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[{ _id: 'all', title: 'Main' }, ...uniqueSwimlanes].map(sw => (
                        <button
                          key={sw._id}
                          type="button"
                          onClick={() => setSelectedDaySubfolder(sw._id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '100px',
                            border: selectedDaySubfolder === sw._id ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)',
                            background: selectedDaySubfolder === sw._id ? 'var(--bg-button-hover)' : 'var(--bg-card)',
                            color: selectedDaySubfolder === sw._id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {sw.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1.5px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDayModalDate(null)}
                      className="btn-subtle"
                      style={{ height: '34px', fontSize: '12px', padding: '0 16px', borderRadius: '100px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newDayTaskTitle.trim()}
                      className="btn-primary"
                      style={{
                        height: '34px',
                        fontSize: '12px',
                        padding: '0 18px',
                        borderRadius: '100px',
                        background: 'var(--accent-primary)',
                        color: 'var(--accent-primary-text)',
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
