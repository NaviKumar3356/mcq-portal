import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ---------------------------------------------------------------------
// Local datetime-local <-> Date helpers. We keep the public value format
// identical to the native <input type="datetime-local"> string
// ("YYYY-MM-DDTHH:mm") so this drops in wherever startAt/endAt were used
// before, with zero changes to submit/parse logic elsewhere.
// ---------------------------------------------------------------------
function pad(n) { return String(n).padStart(2, '0'); }

function toLocalValue(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalValue(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh = 0, mm = 0] = (timePart || '').split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }

function buildMonthGrid(viewDate) {
  const first = startOfMonth(viewDate);
  const startWeekday = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatDisplay(date) {
  if (!date) return null;
  const datePart = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { datePart, timePart };
}

function formatDuration(ms) {
  if (ms == null || ms <= 0) return null;
  const totalMin = Math.round(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}

// One calendar+time popover for a single field (open or close).
function CalendarPopover({ value, onChange, onClose, minDate, label, accentClass, anchorRect }) {
  const initial = value || minDate || new Date();
  const [viewDate, setViewDate] = useState(startOfMonth(initial));
  const [hour, setHour] = useState(value ? value.getHours() : 9);
  const [minute, setMinute] = useState(value ? value.getMinutes() - (value.getMinutes() % 5) : 0);
  const popRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function updatePosition() {
      if (!anchorRect) return;
      const width = Math.min(360, window.innerWidth - 24);
      let left = anchorRect.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      left = Math.max(12, left);
      const estimatedHeight = 470;
      const below = anchorRect.bottom + 8;
      const top = below + estimatedHeight <= window.innerHeight - 12 ? below : Math.max(12, anchorRect.top - estimatedHeight - 8);
      setPosition({ top, left });
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true); };
  }, [anchorRect]);

  useEffect(() => {
    function onDocClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) onClose();
    }
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function pickDay(day) {
    if (!day) return;
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
    onChange(next);
  }

  function applyTime(nextHour, nextMinute) {
    setHour(nextHour);
    setMinute(nextMinute);
    const base = value || initial;
    onChange(new Date(base.getFullYear(), base.getMonth(), base.getDate(), nextHour, nextMinute, 0, 0));
  }

  function isDisabled(day) {
    if (!day || !minDate) return false;
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    return d < minDate;
  }

  const hours12 = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className={`schedpick-popover ${accentClass}`} ref={popRef} role="dialog" aria-label={`${label} date and time`} style={{ position: 'fixed', top: position.top, left: position.left, width: 'min(360px, calc(100vw - 24px))' }}>
      <div className="schedpick-cal-head">
        <button type="button" className="schedpick-nav" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <div className="schedpick-cal-title">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
        <button type="button" className="schedpick-nav" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} aria-label="Next month">›</button>
      </div>

      <div className="schedpick-weekdays">
        {WEEKDAY_LABELS.map((w, i) => <span key={i}>{w}</span>)}
      </div>

      <div className="schedpick-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={i} className="schedpick-cell empty" />;
          const disabled = isDisabled(day);
          const isToday = sameDay(day, today);
          const isSelected = value && sameDay(day, value);
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              className={`schedpick-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => pickDay(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="schedpick-time-row">
        <span className="schedpick-time-label">🕐 Time</span>
        <select value={hour} onChange={(e) => applyTime(Number(e.target.value), minute)} aria-label="Hour">
          {hours12.map((h) => (
            <option key={h} value={h}>{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</option>
          ))}
        </select>
        <select value={minute} onChange={(e) => applyTime(hour, Number(e.target.value))} aria-label="Minute">
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
            <option key={m} value={m}>:{pad(m)}</option>
          ))}
        </select>
      </div>

      <div className="schedpick-quick-row">
        {[
          ['Now', () => new Date()],
          ['+1 hour', () => new Date(Date.now() + 3600000)],
          ['Tomorrow 9 AM', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }],
          ['+7 days', () => new Date(Date.now() + 7 * 86400000)],
        ].map(([label2, fn]) => (
          <button type="button" key={label2} className="schedpick-quick-chip" onClick={() => { const d = fn(); setViewDate(startOfMonth(d)); setHour(d.getHours()); setMinute(d.getMinutes()); onChange(d); }}>
            {label2}
          </button>
        ))}
      </div>

      <div className="schedpick-footer">
        {value && <button type="button" className="schedpick-clear" onClick={() => { onChange(null); onClose(); }}>Clear</button>}
        <button type="button" className="schedpick-done" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function ScheduleField({ label, chip, hint, value, onChange, minDate, accentClass, placeholder }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [anchorRect, setAnchorRect] = useState(null);

  function toggleOpen() {
    if (!open && triggerRef.current) setAnchorRect(triggerRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  }
  const display = formatDisplay(value);

  return (
    <div className={`schedpick-field ${accentClass}`}>
      <div className="schedpick-field-label-row">
        <label>{label}</label>
        <span className="schedpick-chip">{chip}</span>
      </div>
      <button type="button" ref={triggerRef} className={`schedpick-trigger ${open ? 'is-open' : ''} ${value ? 'has-value' : ''}`} onClick={toggleOpen}>
        <span className="schedpick-trigger-icon">📅</span>
        {display ? (
          <span className="schedpick-trigger-value">
            <strong>{display.datePart}</strong>
            <small>{display.timePart}</small>
          </span>
        ) : (
          <span className="schedpick-trigger-placeholder">{placeholder}</span>
        )}
        <span className="schedpick-trigger-caret">▾</span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <CalendarPopover
          value={value}
          minDate={minDate}
          label={label}
          accentClass={accentClass}
          onChange={onChange}
          onClose={() => setOpen(false)}
          anchorRect={anchorRect}
        />,
        document.body
      )}
      <span className="schedpick-hint">{hint}</span>
    </div>
  );
}

// Public component. Props mirror the two datetime-local inputs it replaces:
// startValue/endValue are "YYYY-MM-DDTHH:mm" strings (or ''), and
// onStartChange/onEndChange receive the same string format back.
export default function ScheduleRangePicker({ startValue, endValue, onStartChange, onEndChange }) {
  const startDate = useMemo(() => fromLocalValue(startValue), [startValue]);
  const endDate = useMemo(() => fromLocalValue(endValue), [endValue]);

  const duration = startDate && endDate ? formatDuration(endDate - startDate) : null;
  const invalidRange = startDate && endDate && endDate <= startDate;

  return (
    <div className="schedpick-range">
      <div className="schedpick-fields">
        <ScheduleField
          label="Opens at"
          chip="🟢 START — optional"
          hint="Students can start from this moment. Leave blank to allow immediate access."
          value={startDate}
          accentClass="open"
          placeholder="Immediately"
          onChange={(d) => onStartChange(toLocalValue(d))}
        />
        <div className="schedpick-connector" aria-hidden="true">
          <span className="schedpick-connector-line" />
          <span className="schedpick-connector-dot">→</span>
          <span className="schedpick-connector-line" />
        </div>
        <ScheduleField
          label="Closes at"
          chip="🔒 END — optional"
          hint="No new attempts start after this. Server time controls enforcement, not the student's device."
          value={endDate}
          minDate={startDate}
          accentClass="close"
          placeholder="No deadline"
          onChange={(d) => onEndChange(toLocalValue(d))}
        />
      </div>

      {(duration || invalidRange) && (
        <div className={`schedpick-summary ${invalidRange ? 'is-invalid' : ''}`}>
          {invalidRange
            ? '⚠ Closing time must be after the opening time.'
            : `🪟 Assessment window: open for ${duration}`}
        </div>
      )}
    </div>
  );
}
