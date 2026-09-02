import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, ChevronDown, Check } from 'lucide-react';

interface CustomDatePickerProps {
  value?: string | Date; // ISO string, Date object, or undefined
  onChange: (isoString?: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TIME_PRESETS = [
  { label: '9:00 AM', hour: 9, min: 0 },
  { label: '12:00 PM', hour: 12, min: 0 },
  { label: '3:00 PM', hour: 15, min: 0 },
  { label: '6:00 PM', hour: 18, min: 0 },
  { label: '11:59 PM', hour: 23, min: 59 },
];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, onClose }) => {
  const currentDate = value ? new Date(value) : new Date();

  // Navigation & View Mode: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
  const [viewYear, setViewYear] = useState<number>(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [yearDecadeStart, setYearDecadeStart] = useState<number>(
    Math.floor(currentDate.getFullYear() / 9) * 9
  );

  // Selected date
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(
    value
      ? {
          year: new Date(value).getFullYear(),
          month: new Date(value).getMonth(),
          day: new Date(value).getDate(),
        }
      : null
  );

  // Time States (12-hr format with AM/PM)
  const initialHours24 = value ? new Date(value).getHours() : 18;
  const initialMins = value ? new Date(value).getMinutes() : 0;

  const [hour12, setHour12] = useState<number>(
    initialHours24 % 12 === 0 ? 12 : initialHours24 % 12
  );
  const [minute, setMinute] = useState<number>(initialMins);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initialHours24 >= 12 ? 'PM' : 'AM');

  const today = new Date();

  const get24Hour = (h12: number, period: 'AM' | 'PM') => {
    if (period === 'AM') {
      return h12 === 12 ? 0 : h12;
    } else {
      return h12 === 12 ? 12 : h12 + 12;
    }
  };

  const syncChange = (
    dayObj: { year: number; month: number; day: number } | null,
    h12: number,
    min: number,
    period: 'AM' | 'PM'
  ) => {
    const h24 = get24Hour(h12, period);
    if (dayObj) {
      const d = new Date(dayObj.year, dayObj.month, dayObj.day, h24, min, 0, 0);
      onChange(d.toISOString());
    } else {
      const d = new Date();
      d.setHours(h24, min, 0, 0);
      setSelectedDay({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
      onChange(d.toISOString());
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setYearDecadeStart(s => s - 9);
    } else if (viewMode === 'months') {
      setViewYear(y => y - 1);
    } else {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(y => y - 1);
      } else {
        setViewMonth(m => m - 1);
      }
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setYearDecadeStart(s => s + 9);
    } else if (viewMode === 'months') {
      setViewYear(y => y + 1);
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(y => y + 1);
      } else {
        setViewMonth(m => m + 1);
      }
    }
  };

  const handleSelectDay = (y: number, m: number, d: number) => {
    const newDay = { year: y, month: m, day: d };
    setSelectedDay(newDay);
    syncChange(newDay, hour12, minute, ampm);
  };

  const handleQuickPresetDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const newDay = { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    setSelectedDay(newDay);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    syncChange(newDay, hour12, minute, ampm);
  };

  const handleQuickPresetTime = (h24: number, min: number) => {
    const newAmpm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    const newH12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setHour12(newH12);
    setMinute(min);
    setAmpm(newAmpm);
    syncChange(selectedDay, newH12, min, newAmpm);
  };

  const handleHourInput = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 12;
    if (num < 1) num = 1;
    if (num > 12) num = 12;
    setHour12(num);
    syncChange(selectedDay, num, minute, ampm);
  };

  const handleMinuteInput = (val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 59) num = 59;
    setMinute(num);
    syncChange(selectedDay, hour12, num, ampm);
  };

  const handleToggleAmpm = (period: 'AM' | 'PM') => {
    setAmpm(period);
    syncChange(selectedDay, hour12, minute, period);
  };

  const handleClear = () => {
    onChange(undefined);
    onClose();
  };

  // Build calendar matrix
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: { year: number; month: number; day: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({ year: prevYear, month: prevMonth, day: d, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ year: viewYear, month: viewMonth, day: d, isCurrentMonth: true });
  }

  const remaining = 35 - calendarCells.length;
  if (remaining > 0) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      calendarCells.push({ year: nextYear, month: nextMonth, day: d, isCurrentMonth: false });
    }
  }

  return (
    <div
      style={{
        width: '310px',
        background: 'var(--bg-modal)',
        border: '1.5px solid var(--border-medium)',
        borderRadius: '28px',
        boxShadow: 'var(--shadow-modal)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 200,
        userSelect: 'none',
        animation: 'fade-in 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Quick Preset Chips ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        <button
          type="button"
          onClick={() => handleQuickPresetDate(0)}
          style={{
            height: '28px',
            fontSize: '11px',
            fontWeight: 800,
            borderRadius: '100px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
            (e.currentTarget as HTMLElement).style.color = 'var(--accent-primary)';
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleQuickPresetDate(1)}
          style={{
            height: '28px',
            fontSize: '11px',
            fontWeight: 800,
            borderRadius: '100px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
            (e.currentTarget as HTMLElement).style.color = 'var(--accent-primary)';
          }}
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => handleQuickPresetDate(7)}
          style={{
            height: '28px',
            fontSize: '11px',
            fontWeight: 800,
            borderRadius: '100px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-button-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
            (e.currentTarget as HTMLElement).style.color = 'var(--accent-primary)';
          }}
        >
          +1 Week
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

      {/* ── Month & Year Header with Click-to-Jump ──────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Month Selector Button */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
            style={{
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 800,
              color: viewMode === 'months' ? 'var(--accent-primary-text)' : 'var(--text-primary)',
              background: viewMode === 'months' ? 'var(--accent-primary)' : 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Click to choose month"
          >
            <span>{MONTH_NAMES[viewMonth]}</span>
            <ChevronDown size={12} style={{ opacity: 0.8 }} />
          </button>

          {/* Year Selector Button */}
          <button
            type="button"
            onClick={() => {
              setYearDecadeStart(Math.floor(viewYear / 9) * 9);
              setViewMode(viewMode === 'years' ? 'days' : 'years');
            }}
            style={{
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 800,
              color: viewMode === 'years' ? 'var(--accent-primary-text)' : 'var(--text-primary)',
              background: viewMode === 'years' ? 'var(--accent-primary)' : 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Click to jump to any year"
          >
            <span>{viewYear}</span>
            <ChevronDown size={12} style={{ opacity: 0.8 }} />
          </button>
        </div>

        {/* Prev / Next Month or Year Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={handlePrev}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Next"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── 1. MONTH SELECTOR GRID (When viewMode === 'months') ─────── */}
      {viewMode === 'months' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', padding: '4px 0' }}>
          {MONTH_SHORT.map((mName, idx) => {
            const isCur = viewMonth === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setViewMonth(idx);
                  setViewMode('days');
                  if (selectedDay) {
                    const newDay = { ...selectedDay, month: idx, year: viewYear };
                    setSelectedDay(newDay);
                    syncChange(newDay, hour12, minute, ampm);
                  }
                }}
                style={{
                  height: '34px',
                  borderRadius: '14px',
                  border: isCur ? 'none' : '1px solid var(--border-subtle)',
                  background: isCur ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: isCur ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isCur ? '0 4px 12px rgba(124, 92, 229, 0.3)' : 'none',
                }}
              >
                {mName}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 2. YEAR SELECTOR GRID (When viewMode === 'years') ───────── */}
      {viewMode === 'years' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {yearDecadeStart} – {yearDecadeStart + 8}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {Array.from({ length: 9 }).map((_, idx) => {
              const y = yearDecadeStart + idx;
              const isCur = viewYear === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setViewMode('days');
                    if (selectedDay) {
                      const newDay = { ...selectedDay, year: y, month: viewMonth };
                      setSelectedDay(newDay);
                      syncChange(newDay, hour12, minute, ampm);
                    }
                  }}
                  style={{
                    height: '34px',
                    borderRadius: '14px',
                    border: isCur ? 'none' : '1px solid var(--border-subtle)',
                    background: isCur ? 'var(--accent-primary)' : 'var(--bg-input)',
                    color: isCur ? 'var(--accent-primary-text)' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isCur ? '0 4px 12px rgba(124, 92, 229, 0.3)' : 'none',
                  }}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. DAYS CALENDAR MATRIX (Default viewMode === 'days') ───── */}
      {viewMode === 'days' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '2px' }}>
            {DAYS_OF_WEEK.map((dw, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  padding: '4px 0',
                }}
              >
                {dw}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarCells.map((cell, idx) => {
              const isSelected =
                selectedDay &&
                selectedDay.year === cell.year &&
                selectedDay.month === cell.month &&
                selectedDay.day === cell.day;

              const isToday =
                today.getFullYear() === cell.year &&
                today.getMonth() === cell.month &&
                today.getDate() === cell.day;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    border: isToday && !isSelected ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                    background: isSelected ? 'var(--accent-primary)' : 'transparent',
                    color: isSelected
                      ? 'var(--accent-primary-text)'
                      : cell.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: isSelected || isToday ? 800 : 600,
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                    boxShadow: isSelected ? '0 3px 10px rgba(124, 92, 229, 0.35)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-button-hover)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)';
                    }
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Custom Time Picker (Direct Inputs & AM/PM Switcher) ─────── */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
            <Clock size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>Time</span>
          </div>

          {/* Custom Time Spinner Boxes + AM/PM Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Hour & Min Input Container */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1.5px solid var(--border-subtle)', borderRadius: '100px', padding: '2px 8px' }}>
              <input
                type="number"
                min={1}
                max={12}
                value={hour12}
                onChange={e => handleHourInput(e.target.value)}
                style={{
                  width: '24px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              />
              <span style={{ fontWeight: 800, color: 'var(--accent-primary)', margin: '0 1px' }}>:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minute < 10 ? `0${minute}` : minute}
                onChange={e => handleMinuteInput(e.target.value)}
                style={{
                  width: '24px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              />
            </div>

            {/* AM / PM Segmented Button */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1.5px solid var(--border-subtle)', borderRadius: '100px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => handleToggleAmpm('AM')}
                style={{
                  padding: '2px 8px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: '100px',
                  background: ampm === 'AM' ? 'var(--accent-primary)' : 'transparent',
                  color: ampm === 'AM' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handleToggleAmpm('PM')}
                style={{
                  padding: '2px 8px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: '100px',
                  background: ampm === 'PM' ? 'var(--accent-primary)' : 'transparent',
                  color: ampm === 'PM' ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Quick Time Preset Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {TIME_PRESETS.map((tp, idx) => {
            const h24 = get24Hour(hour12, ampm);
            const isCur = h24 === tp.hour && minute === tp.min;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPresetTime(tp.hour, tp.min)}
                style={{
                  height: '24px',
                  fontSize: '10.5px',
                  padding: '0 8px',
                  fontWeight: 800,
                  borderRadius: '100px',
                  background: isCur ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: isCur ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
                  border: isCur ? 'none' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer Actions ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              height: '28px',
              fontSize: '11.5px',
              fontWeight: 800,
              color: 'var(--accent-red)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '100px',
              padding: '0 12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Clear Date
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="btn-primary"
          style={{
            height: '28px',
            fontSize: '11.5px',
            fontWeight: 800,
            padding: '0 16px',
            borderRadius: '100px',
            background: 'var(--accent-primary)',
            color: 'var(--accent-primary-text)',
            boxShadow: '0 4px 12px rgba(124, 92, 229, 0.3)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};
