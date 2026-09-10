import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { addDays, addMonths, dateToKey, nextWeekday, parseDateKey, todayKey } from "../lib/dates";

interface DatePickerFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

// Lets a parent open the popover programmatically (e.g. Leads/Pipeline
// prompting for a next-activity date right after a note is logged) without
// lifting the open/closed state out of this component for every consumer.
export interface DatePickerFieldHandle {
  open: () => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function shortLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
function fullShortcutLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Anchored pill + popover (same self-contained trigger/panel pattern as
// ListMenu) replacing the native <input type="date">, styled after a
// Todoist-style quick date picker: smart shortcuts plus a month grid.
export const DatePickerField = forwardRef<DatePickerFieldHandle, DatePickerFieldProps>(function DatePickerField({ value, onChange }, ref) {
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => (value ? parseDateKey(value) : new Date()));
  const [panelMaxHeight, setPanelMaxHeight] = useState(420);
  const [panelAlign, setPanelAlign] = useState<"left" | "right">("left");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const tkey = todayKey();

  function label(): string {
    if (!value) return "Date";
    if (value === tkey) return "Today";
    if (value === dateToKey(addDays(today, 1))) return "Tomorrow";
    return fullShortcutLabel(parseDateKey(value));
  }

  function openPopover() {
    setDisplayMonth(value ? parseDateKey(value) : new Date());
    // Cap the panel to whatever room is actually left below the trigger in
    // the viewport — a plain CSS maxHeight based on 100vh still lets the
    // panel's own box extend past the visible viewport when the trigger
    // sits low on the page (the surrounding fixed-overlay modal has no
    // scroll container of its own to reveal it), leaving the bottom of the
    // popover permanently unreachable. Measuring here keeps the whole panel
    // — and therefore its own scrollbar — inside what's actually visible.
    const rect = triggerRef.current?.getBoundingClientRect();
    const available = rect ? window.innerHeight - rect.bottom - 16 : 420;
    setPanelMaxHeight(Math.max(200, Math.min(420, available)));
    // The panel is a fixed 280px wide, anchored to the trigger's left edge by
    // default — fine for a composer near the left of a narrow form, but a
    // trigger sitting near the right edge of a wide row would push most of
    // the panel off-screen with no way to reach it. Flip to anchoring off
    // the trigger's right edge instead whenever there isn't enough room.
    setPanelAlign(rect && window.innerWidth - rect.left < 280 + 16 ? "right" : "left");
    setOpen(true);
  }

  useImperativeHandle(ref, () => ({ open: openPopover }));

  // A nested position:fixed overlay for outside-click detection gets clipped
  // to (or otherwise misbehaves inside) any scrolling ancestor with its own
  // overflow — which every modal that hosts this picker has, for its own
  // long-content scrolling. A capture-phase listener on the document itself
  // sidesteps that entirely: it isn't affected by any ancestor's overflow/
  // z-index, and capture-phase means it still sees the click even if some
  // handler further down calls stopPropagation on the bubble phase.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown, true);
    return () => document.removeEventListener("mousedown", handlePointerDown, true);
  }, [open]);

  function pick(d: Date | null) {
    onChange(d ? dateToKey(d) : null);
    setOpen(false);
  }

  const shortcuts = [
    { label: "Today", date: today, icon: <DotIcon /> },
    { label: "Tomorrow", date: addDays(today, 1), icon: <ArrowIcon /> },
    { label: "This weekend", date: nextWeekday(addDays(today, -1), 6), icon: <WeekendIcon /> },
    { label: "Next week", date: nextWeekday(today, 1), icon: <NextWeekIcon /> },
  ];

  const firstOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div
      ref={wrapperRef}
      onClick={(e) => e.stopPropagation()}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* A <span role="button"> clear control used to live nested inside
          this trigger <button> — interactive content nested inside a
          <button> is invalid HTML, and in practice makes the inner control
          unreachable to screen readers regardless of its own aria-label
          (they only ever expose the outer button). Two sibling buttons
          inside a shared pill instead: real markup, both independently
          reachable by keyboard/screen reader. */}
      <span style={{ ...pillStyle, ...(value ? pillActiveStyle : {}) }}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPopover())}
          aria-label={value ? undefined : "Choose date"}
          style={triggerInnerButtonStyle}
        >
          <CalendarIcon />
          {label()}
        </button>
        {value && (
          <button type="button" onClick={() => pick(null)} aria-label="Clear date" style={clearButtonStyle}>
            ×
          </button>
        )}
      </span>

      {open && (
        <div
          style={{
            ...panelStyle,
            maxHeight: panelMaxHeight,
            ...(panelAlign === "right" ? { left: "auto", right: 0 } : {}),
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {shortcuts.map((s) => (
              <button key={s.label} type="button" onClick={() => pick(s.date)} style={rowButtonStyle}>
                {s.icon}
                <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{shortLabel(s.date)}</span>
              </button>
            ))}
            <button type="button" onClick={() => pick(null)} style={rowButtonStyle}>
              <NoDateIcon />
              <span style={{ flex: 1, textAlign: "left" }}>No Date</span>
            </button>
          </div>

          <div style={dividerStyle} />

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <button type="button" onClick={() => setDisplayMonth((m) => addMonths(m, -1))} aria-label="Previous month" style={navButtonStyle}>
                ‹
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {displayMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button type="button" onClick={() => setDisplayMonth((m) => addMonths(m, 1))} aria-label="Next month" style={navButtonStyle}>
                ›
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
              {WEEKDAY_LABELS.map((w, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {days.map((d) => {
                const key = dateToKey(d);
                const inMonth = d.getMonth() === displayMonth.getMonth();
                const isToday = key === tkey;
                const isSelected = key === value;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pick(d)}
                    style={{
                      ...dayButtonStyle,
                      opacity: inMonth ? 1 : 0.35,
                      background: isSelected ? "var(--accent-strong)" : isToday ? "var(--accent-today-bg)" : "transparent",
                      color: isSelected ? "#fff" : isToday ? "var(--accent)" : "var(--text-body)",
                      fontWeight: isToday || isSelected ? 700 : 400,
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="var(--accent)" strokeWidth="1.6" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WeekendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6" width="10" height="5" rx="1.2" stroke="var(--accent)" strokeWidth="1.4" />
      <path d="M2 6V4.5C2 3.7 2.7 3 3.5 3H10.5C11.3 3 12 3.7 12 4.5V6" stroke="var(--accent)" strokeWidth="1.4" />
    </svg>
  );
}
function NextWeekIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="var(--accent-deep)" strokeWidth="1.4" />
      <path d="M5 7H9M9 7L7 5M9 7L7 9" stroke="var(--accent-deep)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function NoDateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="var(--text-muted)" strokeWidth="1.4" />
      <path d="M3.5 10.5L10.5 3.5" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Split across two real sibling <button>s (see the JSX above) rather than
// one styled element — this const is now just the shared, unpadded outer
// frame; each button owns its own padding/cursor so both remain
// independently focusable and clickable instead of one interactive element
// nested inside another.
const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  fontSize: 13,
  fontWeight: 600,
};

const pillActiveStyle: CSSProperties = {
  color: "var(--success)",
  borderColor: "var(--success)",
};

const triggerInnerButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  color: "inherit",
  font: "inherit",
  padding: "7px 12px",
  cursor: "pointer",
};

const clearButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 24,
  minHeight: 24,
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 15,
  lineHeight: 1,
  padding: "0 10px 0 0",
};

const panelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 10,
  width: 280,
  overflowY: "auto",
  overscrollBehavior: "contain",
  zIndex: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const rowButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "none",
  border: "none",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 8px",
  cursor: "pointer",
  textAlign: "left",
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: "var(--border)",
  margin: "6px 0",
};

const navButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: 16,
  cursor: "pointer",
  padding: "0 8px",
  lineHeight: 1.4,
  minWidth: 24,
  minHeight: 24,
};

const dayButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 99,
  fontSize: 12,
  padding: "6px 0",
  cursor: "pointer",
  textAlign: "center",
};
