import { useState } from "react";
import type { CSSProperties } from "react";
import { addDays, addMonths, dateToKey, formatDueDate, isOverdue, startOfWeek, todayKey } from "../lib/dates";

type CalSubView = "today" | "week" | "month";

interface BoardCalendarCardLike {
  id: string;
  title: string;
  due_date: string | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Shared by Leads and Pipeline — Today/Week/Month sub-tabs driven by each
// card's due_date ("Next Activity"). Generic over the minimal id/title/
// due_date shape both LeadCard and PipelineCard already satisfy.
export function BoardCalendarView<C extends BoardCalendarCardLike>({
  cards,
  onOpenCard,
}: {
  cards: C[];
  onOpenCard: (id: string) => void;
}) {
  const [subView, setSubView] = useState<CalSubView>("today");
  const [anchor, setAnchor] = useState(() => new Date());
  const tkey = todayKey();

  const cardsByDay = new Map<string, C[]>();
  cards.forEach((c) => {
    if (!c.due_date) return;
    const key = c.due_date.slice(0, 10);
    if (!cardsByDay.has(key)) cardsByDay.set(key, []);
    cardsByDay.get(key)!.push(c);
  });

  function goPrev() {
    if (subView === "month") setAnchor((a) => addMonths(a, -1));
    else if (subView === "week") setAnchor((a) => addDays(a, -7));
  }
  function goNext() {
    if (subView === "month") setAnchor((a) => addMonths(a, 1));
    else if (subView === "week") setAnchor((a) => addDays(a, 7));
  }
  function goToday() {
    setAnchor(new Date());
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        {(["today", "week", "month"] as CalSubView[]).map((sv) => (
          <button key={sv} onClick={() => setSubView(sv)} style={subTabButtonStyle(subView === sv)}>
            {sv[0].toUpperCase() + sv.slice(1)}
          </button>
        ))}
      </div>

      {subView !== "today" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={goPrev} style={navArrowStyle} aria-label="Previous">
            ‹
          </button>
          <button onClick={goToday} style={todayButtonStyle}>
            Today
          </button>
          <button onClick={goNext} style={navArrowStyle} aria-label="Next">
            ›
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-body)", marginLeft: 6 }}>
            {subView === "month" ? anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : weekHeading(anchor)}
          </span>
        </div>
      )}

      {subView === "today" && <TodayList cards={cards} onOpenCard={onOpenCard} />}
      {subView === "week" && <WeekGrid anchor={anchor} cardsByDay={cardsByDay} tkey={tkey} onOpenCard={onOpenCard} />}
      {subView === "month" && <MonthGrid anchor={anchor} cardsByDay={cardsByDay} tkey={tkey} onOpenCard={onOpenCard} />}
    </div>
  );
}

function weekHeading(anchor: Date): string {
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function TodayList<C extends BoardCalendarCardLike>({ cards, onOpenCard }: { cards: C[]; onOpenCard: (id: string) => void }) {
  const tkey = todayKey();
  const due = cards
    .filter((c) => c.due_date && c.due_date <= tkey)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  if (due.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>Nothing due today.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {due.map((c) => {
        const overdue = !!c.due_date && isOverdue(c.due_date);
        return (
          <div
            key={c.id}
            onClick={() => onOpenCard(c.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-panel)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{c.title}</span>
            {c.due_date && (
              <span style={{ fontSize: 12, fontWeight: 600, color: overdue ? "var(--danger)" : "var(--text-secondary)" }}>
                {formatDueDate(c.due_date)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid<C extends BoardCalendarCardLike>({
  anchor,
  cardsByDay,
  tkey,
  onOpenCard,
}: {
  anchor: Date;
  cardsByDay: Map<string, C[]>;
  tkey: string;
  onOpenCard: (id: string) => void;
}) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "center", padding: "4px 0" }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((d) => {
          const key = dateToKey(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const dayCards = cardsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              style={{
                minHeight: 84,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: key === tkey ? "var(--accent-today-bg)" : "var(--bg-panel)",
                padding: 6,
                opacity: inMonth ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: key === tkey ? "var(--accent-light)" : "var(--text-secondary)" }}>{d.getDate()}</span>
              {dayCards.slice(0, 3).map((c) => (
                <span key={c.id} onClick={() => onOpenCard(c.id)} style={miniChipStyle}>
                  {c.title}
                </span>
              ))}
              {dayCards.length > 3 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{dayCards.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid<C extends BoardCalendarCardLike>({
  anchor,
  cardsByDay,
  tkey,
  onOpenCard,
}: {
  anchor: Date;
  cardsByDay: Map<string, C[]>;
  tkey: string;
  onOpenCard: (id: string) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
      {days.map((d) => {
        const key = dateToKey(d);
        const dayCards = cardsByDay.get(key) ?? [];
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                textAlign: "center",
                padding: "6px 0",
                borderRadius: 8,
                background: key === tkey ? "var(--accent-today-bg)" : "transparent",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: key === tkey ? "var(--accent-light)" : "var(--text-primary)" }}>{d.getDate()}</div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 120,
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 6,
              }}
            >
              {dayCards.map((c) => (
                <span key={c.id} onClick={() => onOpenCard(c.id)} style={{ ...miniChipStyle, padding: "4px 6px" }}>
                  {c.title}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const miniChipStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--text-body)",
  background: "var(--border)",
  borderRadius: 4,
  padding: "1px 4px",
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const subTabButtonStyle = (active: boolean): CSSProperties => ({
  background: active ? "var(--accent-strong)" : "none",
  border: "none",
  borderRadius: 8,
  color: active ? "#fff" : "var(--text-tertiary)",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 14px",
  cursor: "pointer",
});

const navArrowStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 16,
  width: 32,
  height: 32,
  cursor: "pointer",
};

const todayButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 14px",
  cursor: "pointer",
};
