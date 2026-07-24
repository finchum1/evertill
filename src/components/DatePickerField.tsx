import { useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import type { Recurrence } from "../types";
import { addDays, addMonths, dateToKey, nextWeekday, parseDateKey, todayKey } from "../lib/dates";

interface DatePickerFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  recurrence?: Recurrence;
  onRecurrenceChange?: (r: Recurrence) => void;
  // Lets a caller swap in its own trigger element (e.g. TaskRow's compact
  // text badge) while still reusing this component's popover/panel wholesale
  // — otherwise every consumer wanting the same picker experience with a
  // different-looking trigger would have to duplicate the whole panel.
  renderTrigger?: (args: { onClick: () => void; triggerRef: RefObject<HTMLButtonElement | null> }) => ReactNode;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const RECURRENCE_OPTIONS: Recurrence[] = ["daily", "weekly", "weekday", "monthly", "yearly"];

function shortLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}
function fullShortcutLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Two-part (bold main + muted detail) label for each repeat option, computed
// against whichever date is currently relevant — the picked due date if one
// is set, otherwise today — so "Every week" always shows the actual weekday
// it'll land on, matching the reference's "Every week on Thursday" style.
function recurrenceOption(r: Recurrence, refDate: Date): { main: string; detail?: string } {
  switch (r) {
    case "daily":
      return { main: "Every day" };
    case "weekly":
      return { main: "Every week", detail: `on ${refDate.toLocaleDateString(undefined, { weekday: "long" })}` };
    case "weekday":
      return { main: "Every weekday", detail: "(Mon – Fri)" };
    case "monthly":
      return { main: "Every month", detail: `on the ${ordinal(refDate.getDate())}` };
    case "yearly":
      return {
        main: "Every year",
        detail: `on ${refDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`,
      };
    default:
      return { main: "Does not repeat" };
  }
}

// Anchored pill + popover (same self-contained trigger/panel pattern as
// ListMenu/CreateMenu) replacing the native <input type="date">, styled after
// a Todoist-style quick date picker: smart shortcuts, a month grid, and an
// optional Repeat row when recurrence props are supplied.
export function DatePickerField({ value, onChange, recurrence, onRecurrenceChange, renderTrigger }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => (value ? parseDateKey(value) : new Date()));
  const [panelMaxHeight, setPanelMaxHeight] = useState(420);
  const [panelAlign, setPanelAlign] = useState<"left" | "right">("left");
  const [repeatOpen, setRepeatOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    // trigger sitting near the right edge of a wide row (e.g. TaskRow's due-
    // date badge) would push most of the panel off-screen with no way to
    // reach it. Flip to anchoring off the trigger's right edge instead
    // whenever there isn't enough room to the right.
    setPanelAlign(rect && window.innerWidth - rect.left < 280 + 16 ? "right" : "left");
    setRepeatOpen(false);
    setOpen(true);
  }

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
      onClick={(e) => e.stopPropagation()}
      style={{ position: "relative", display: "inline-block" }}
    >
      {renderTrigger ? (
        renderTrigger({ onClick: () => (open ? setOpen(false) : openPopover()), triggerRef })
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPopover())}
          style={{ ...pillStyle, ...(value ? pillActiveStyle : {}) }}
        >
          <CalendarIcon />
          {label()}
          {value && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
              style={clearButtonStyle}
            >
              ×
            </span>
          )}
        </button>
      )}

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
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
                <button type="button" onClick={() => setDisplayMonth((m) => addMonths(m, -1))} style={navButtonStyle}>
                  ‹
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {displayMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
                <button type="button" onClick={() => setDisplayMonth((m) => addMonths(m, 1))} style={navButtonStyle}>
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

            {onRecurrenceChange && (
              <>
                <div style={dividerStyle} />
                <button
                  type="button"
                  onClick={() => setRepeatOpen((o) => !o)}
                  style={{ ...rowButtonStyle, ...(repeatOpen ? repeatHeaderOpenStyle : {}) }}
                >
                  <RepeatIcon />
                  <span style={{ flex: 1, textAlign: "left" }}>
                    {recurrence && recurrence !== "none" ? recurrenceOption(recurrence, value ? parseDateKey(value) : today).main : "Repeat"}
                  </span>
                </button>
                {repeatOpen && (
                  <div style={{ display: "flex", flexDirection: "column", marginTop: 2 }}>
                    {RECURRENCE_OPTIONS.map((r) => {
                      const opt = recurrenceOption(r, value ? parseDateKey(value) : today);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            onRecurrenceChange(r);
                            setRepeatOpen(false);
                          }}
                          style={{ ...rowButtonStyle, ...(recurrence === r ? repeatSelectedRowStyle : {}) }}
                        >
                          <span style={{ flex: 1, textAlign: "left" }}>
                            {opt.main}
                            {opt.detail && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> {opt.detail}</span>}
                          </span>
                        </button>
                      );
                    })}
                    {recurrence && recurrence !== "none" && (
                      <button
                        type="button"
                        onClick={() => {
                          onRecurrenceChange("none");
                          setRepeatOpen(false);
                        }}
                        style={{ ...rowButtonStyle, color: "var(--danger)" }}
                      >
                        <span style={{ flex: 1, textAlign: "left" }}>Does not repeat</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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
function RepeatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 6.5C2.5 4.3 4.3 2.5 6.5 2.5H10M10 2.5L8 0.5M10 2.5L8 4.5M11.5 7.5C11.5 9.7 9.7 11.5 7.5 11.5H4M4 11.5L6 13.5M4 11.5L6 9.5"
        stroke="var(--text-secondary)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 12px",
  cursor: "pointer",
};

const pillActiveStyle: CSSProperties = {
  color: "var(--success)",
  borderColor: "var(--success)",
};

const clearButtonStyle: CSSProperties = {
  marginLeft: 2,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
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
};

const dayButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 99,
  fontSize: 12,
  padding: "6px 0",
  cursor: "pointer",
  textAlign: "center",
};

const repeatHeaderOpenStyle: CSSProperties = {
  background: "var(--border)",
};

const repeatSelectedRowStyle: CSSProperties = {
  color: "var(--accent-light)",
};
