import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X, Check, ChevronDown } from 'lucide-react';

interface CustomDatePickerProps {
  value?: string | Date; // ISO string, Date object, or undefined
  onChange: (isoString?: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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
  const [yearDecadeStart, setYearDecadeStart] = useState<number>(Math.floor(currentDate.getFullYear() / 12) * 12);

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

  const [hour12, setHour12] = useState<number>(initialHours24 % 12 === 0 ? 12 : initialHours24 % 12);
  const [minute, setMinute] = useState<number>(initialMins);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initialHours24 >= 12 ? 'PM' : 'AM');

  const today = new Date();

  // Convert 12-hour + AM/PM to 24-hour format
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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setYearDecadeStart(s => s - 12);
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

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'years') {
      setYearDecadeStart(s => s + 12);
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

  const handleSelectDay = (year: number, month: number, day: number) => {
    const newDay = { year, month, day };
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
        width: '300px',
        background: 'var(--bg-modal)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-modal)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 100,
        userSelect: 'none',
        animation: 'fade-in var(--t-fast) var(--ease-out)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Quick Preset Chips ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
        <button
          type="button"
          onClick={() => handleQuickPresetDate(0)}
          className="btn-subtle"
          style={{ height: '24px', fontSize: '11px', padding: '0 4px', fontWeight: 600 }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleQuickPresetDate(1)}
          className="btn-subtle"
          style={{ height: '24px', fontSize: '11px', padding: '0 4px', fontWeight: 600 }}
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => handleQuickPresetDate(7)}
          className="btn-subtle"
          style={{ height: '24px', fontSize: '11px', padding: '0 4px', fontWeight: 600 }}
        >
          +1 Week
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

      {/* ── Month & Year Header with Click-to-Jump ──────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Month Selector Button */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
            className="notion-prop-pill"
            style={{
              padding: '3px 8px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: viewMode === 'months' ? 'var(--accent-blue)' : 'var(--text-primary)',
              background: viewMode === 'months' ? 'var(--bg-button-hover)' : 'transparent',
              border: 'none',
              gap: '4px',
            }}
            title="Click to choose month"
          >
            <span>{MONTH_NAMES[viewMonth]}</span>
            <ChevronDown size={11} style={{ opacity: 0.7 }} />
          </button>

          {/* Year Selector Button */}
          <button
            type="button"
            onClick={() => {
              setYearDecadeStart(Math.floor(viewYear / 12) * 12);
              setViewMode(viewMode === 'years' ? 'days' : 'years');
            }}
            className="notion-prop-pill"
            style={{
              padding: '3px 8px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: viewMode === 'years' ? 'var(--accent-blue)' : 'var(--text-primary)',
              background: viewMode === 'years' ? 'var(--bg-button-hover)' : 'transparent',
              border: 'none',
              gap: '4px',
            }}
            title="Click to jump to any year"
          >
            <span>{viewYear}</span>
            <ChevronDown size={11} style={{ opacity: 0.7 }} />
          </button>
        </div>

        {/* Prev / Next Month or Year Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="btn-icon"
            style={{ width: '24px', height: '24px', padding: 0 }}
            title="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="btn-icon"
            style={{ width: '24px', height: '24px', padding: 0 }}
            title="Next"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── 1. MONTH SELECTOR GRID (When viewMode === 'months') ─────── */}
      {viewMode === 'months' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', padding: '6px 0' }}>
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
                  height: '36px',
                  borderRadius: 'var(--r-md)',
                  border: isCur ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                  background: isCur ? 'var(--accent-blue)' : 'var(--bg-card)',
                  color: isCur ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: isCur ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--t-fast)',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
            {yearDecadeStart} – {yearDecadeStart + 11}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {Array.from({ length: 12 }).map((_, idx) => {
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
                    height: '36px',
                    borderRadius: 'var(--r-md)',
                    border: isCur ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                    background: isCur ? 'var(--accent-blue)' : 'var(--bg-card)',
                    color: isCur ? '#ffffff' : 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: isCur ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all var(--t-fast)',
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
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  padding: '2px 0',
                }}
              >
                {dw}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
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
                    width: '36px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--r-sm)',
                    border: isToday && !isSelected ? '1.5px solid var(--accent-blue)' : '1px solid transparent',
                    background: isSelected ? 'var(--accent-blue)' : 'transparent',
                    color: isSelected
                      ? '#ffffff'
                      : cell.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    fontSize: '11.5px',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    opacity: cell.isCurrentMonth ? 1 : 0.35,
                    cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                    outline: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-button-hover)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Clock size={13} style={{ color: 'var(--accent-blue)' }} />
            <span>Time</span>
          </div>

          {/* Custom Time Spinner Boxes + AM/PM Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Hour Input Box */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-sm)', padding: '2px 6px' }}>
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
                  fontWeight: 700,
                  textAlign: 'center',
                  fontFamily: 'var(--font)',
                }}
              />
            </div>

            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>:</span>

            {/* Minute Input Box */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-sm)', padding: '2px 6px' }}>
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
                  fontWeight: 700,
                  textAlign: 'center',
                  fontFamily: 'var(--font)',
                }}
              />
            </div>

            {/* AM / PM Segmented Button */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--r-sm)', padding: '1px' }}>
              <button
                type="button"
                onClick={() => handleToggleAmpm('AM')}
                style={{
                  padding: '2px 6px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 'var(--r-xs)',
                  background: ampm === 'AM' ? 'var(--accent-blue)' : 'transparent',
                  color: ampm === 'AM' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handleToggleAmpm('PM')}
                style={{
                  padding: '2px 6px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 'var(--r-xs)',
                  background: ampm === 'PM' ? 'var(--accent-blue)' : 'transparent',
                  color: ampm === 'PM' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
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
                className="btn-subtle"
                style={{
                  height: '22px',
                  fontSize: '10.5px',
                  padding: '0 6px',
                  fontWeight: isCur ? 700 : 500,
                  background: isCur ? 'var(--bg-button-hover)' : 'transparent',
                  color: isCur ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: isCur ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
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
            className="btn-subtle"
            style={{ height: '26px', fontSize: '11.5px', color: 'var(--accent-red)', padding: '0 8px' }}
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
          style={{ height: '26px', fontSize: '11.5px', padding: '0 14px' }}
        >
          Done
        </button>
      </div>
    </div>
  );
};
