import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { GoogleEvent, Recurrence, Todo, TodoList, TodoSubtask } from "../types";
import { LIST_COLOR_HEX } from "../types";
import { addDays, addMonths, dateToKey, startOfWeek, todayKey } from "../lib/dates";
import { TODO_DRAG_MIME } from "../lib/dragTypes";
import { TaskRow } from "./TaskRow";
import { TaskComposer } from "./TaskComposer";
import { QuickAddTaskModal } from "./QuickAddTaskModal";
import { parseSmartDueDate } from "../lib/smartDate";
import type { useGoogleCalendar } from "../hooks/useGoogleCalendar";

type SubView = "month" | "week" | "day";

interface CalendarViewProps {
  todos: Todo[];
  lists: TodoList[];
  subtasks: TodoSubtask[];
  googleCalendarData: ReturnType<typeof useGoogleCalendar>;
  onOpenTodo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onAddTodo: (
    listId: string,
    title: string,
    dueDate: string | null,
    extra?: { description?: string; recurrence?: Recurrence }
  ) => Promise<Todo | undefined> | void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onEditSubtask: (id: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onUpdateRecurrence: (id: string, recurrence: Recurrence) => void;
  onDropTodoOnDate: (todoId: string, dateKey: string) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// All-day events carry a plain 'YYYY-MM-DD' string with no timezone info —
// keying off it directly (rather than `new Date(event.start)`) avoids the
// classic off-by-one: `new Date('2026-08-12')` parses as UTC midnight,
// which rolls back a day in any timezone west of UTC. Timed events do
// carry a real offset in their ISO string, so `new Date(...)` + the
// existing local-date `dateToKey` helper is safe for those.
function googleEventDateKey(event: GoogleEvent): string {
  return event.allDay ? event.start.slice(0, 10) : dateToKey(new Date(event.start));
}

function formatEventTime(event: GoogleEvent): string {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Dims an event once it's over, everywhere an event renders (Today/Day's
// EventsHeader, Month's chips, Week's all-day chips and timed blocks).
// `event.end` is exclusive already for both timed events (a real instant)
// and all-day events (Google's own 'day after the last day' convention),
// so a plain instant comparison against now is correct for both without
// any special-casing.
function isEventPast(event: GoogleEvent): boolean {
  return new Date(event.end).getTime() < Date.now();
}

// Shared by CalendarView's own effect (Month/Week/Day sub-tabs) and
// TaskListView's Today header — both just need "events grouped by the
// local day they fall on" for whatever range they ask for.
function useEventsByDay(googleCalendarData: ReturnType<typeof useGoogleCalendar>, rangeStart: Date, rangeEnd: Date) {
  const [eventsByDay, setEventsByDay] = useState<Map<string, GoogleEvent[]>>(new Map());
  const [eventErrors, setEventErrors] = useState<{ email: string; message: string }[]>([]);
  const startKey = rangeStart.getTime();
  const endKey = rangeEnd.getTime();

  useEffect(() => {
    let cancelled = false;
    googleCalendarData
      .getEvents(new Date(startKey).toISOString(), new Date(endKey).toISOString())
      .then(({ events, errors }) => {
        if (cancelled) return;
        const map = new Map<string, GoogleEvent[]>();
        for (const e of events) {
          const key = googleEventDateKey(e);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(e);
        }
        for (const list of map.values()) {
          list.sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1));
        }
        setEventsByDay(map);
        setEventErrors(errors);
      })
      .catch(() => {
        if (!cancelled) setEventErrors([{ email: "", message: "Couldn't load Google Calendar events." }]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, endKey, googleCalendarData.calendars]);

  return { eventsByDay, eventErrors };
}

export function CalendarView({
  todos,
  lists,
  subtasks,
  googleCalendarData,
  onOpenTodo,
  onToggleComplete,
  onAddTodo,
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onUpdateDueDate,
  onUpdateRecurrence,
  onDropTodoOnDate,
}: CalendarViewProps) {
  const [subView, setSubView] = useState<SubView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  // The visible date range depends on which sub-tab is active — a 42-day
  // grid for Month, 7 days for Week, one day for Day — computed here once
  // rather than duplicated per grid component.
  let rangeStart: Date;
  let rangeEnd: Date;
  if (subView === "month") {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    rangeStart = startOfWeek(firstOfMonth);
    rangeEnd = addDays(rangeStart, 42);
  } else if (subView === "week") {
    rangeStart = startOfWeek(anchor);
    rangeEnd = addDays(rangeStart, 7);
  } else {
    rangeStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    rangeEnd = addDays(rangeStart, 1);
  }
  const { eventsByDay } = useEventsByDay(googleCalendarData, rangeStart, rangeEnd);

  async function handleQuickAddCreate(
    listId: string,
    title: string,
    description: string,
    dueDate: string | null,
    recurrence: Recurrence,
    subtaskTitles: string[]
  ) {
    const newTodo = await onAddTodo(listId, title, dueDate, { description, recurrence });
    if (newTodo) {
      for (const subtaskTitle of subtaskTitles) onAddSubtask(newTodo.id, subtaskTitle);
    }
    setQuickAddDate(null);
  }

  // Calendar never shows completed tasks — they live in the Completed view instead.
  const todosByDay = new Map<string, Todo[]>();
  todos.forEach((t) => {
    if (t.completed || !t.due_date) return;
    const key = t.due_date.slice(0, 10);
    if (!todosByDay.has(key)) todosByDay.set(key, []);
    todosByDay.get(key)!.push(t);
  });

  function goPrev() {
    if (subView === "month") setAnchor((a) => addMonths(a, -1));
    else if (subView === "week") setAnchor((a) => addDays(a, -7));
    else setAnchor((a) => addDays(a, -1));
  }
  function goNext() {
    if (subView === "month") setAnchor((a) => addMonths(a, 1));
    else if (subView === "week") setAnchor((a) => addDays(a, 7));
    else setAnchor((a) => addDays(a, 1));
  }
  function goToday() {
    setAnchor(new Date());
  }
  function openDay(d: Date) {
    setAnchor(d);
    setSubView("day");
  }

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Calendar</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {(["month", "week", "day"] as SubView[]).map((sv) => (
            <button key={sv} onClick={() => setSubView(sv)} style={tabButtonStyle(subView === sv)}>
              {sv[0].toUpperCase() + sv.slice(1)}
            </button>
          ))}
        </div>
      </div>

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
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-body)", marginLeft: 6 }}>{headingFor(subView, anchor)}</span>
      </div>

      {subView === "month" && (
        <MonthGrid
          anchor={anchor}
          todosByDay={todosByDay}
          eventsByDay={eventsByDay}
          lists={lists}
          onOpenDay={openDay}
          onOpenTodo={onOpenTodo}
          onToggleComplete={onToggleComplete}
          onQuickAddDate={setQuickAddDate}
          onDropTodoOnDate={onDropTodoOnDate}
        />
      )}
      {subView === "week" && (
        <WeekGrid
          anchor={anchor}
          todosByDay={todosByDay}
          eventsByDay={eventsByDay}
          lists={lists}
          onOpenDay={openDay}
          onOpenTodo={onOpenTodo}
          onToggleComplete={onToggleComplete}
          onQuickAddDate={setQuickAddDate}
          onDropTodoOnDate={onDropTodoOnDate}
        />
      )}
      {subView === "day" && (
        <DayList
          day={anchor}
          todosByDay={todosByDay}
          events={eventsByDay.get(dateToKey(anchor)) ?? []}
          lists={lists}
          subtasks={subtasks}
          onOpenTodo={onOpenTodo}
          onToggleComplete={onToggleComplete}
          onAddTodo={onAddTodo}
          onAddSubtask={onAddSubtask}
          onToggleSubtask={onToggleSubtask}
          onEditSubtask={onEditSubtask}
          onDeleteSubtask={onDeleteSubtask}
          onUpdateDueDate={onUpdateDueDate}
          onUpdateRecurrence={onUpdateRecurrence}
        />
      )}

      {quickAddDate && (
        <QuickAddTaskModal lists={lists} initialDueDate={quickAddDate} onClose={() => setQuickAddDate(null)} onCreate={handleQuickAddCreate} />
      )}
    </div>
  );
}

function headingFor(subView: SubView, anchor: Date): string {
  if (subView === "month") return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (subView === "day") {
    return anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function MonthGrid({
  anchor,
  todosByDay,
  eventsByDay,
  lists,
  onOpenDay,
  onOpenTodo,
  onToggleComplete,
  onQuickAddDate,
  onDropTodoOnDate,
}: {
  anchor: Date;
  todosByDay: Map<string, Todo[]>;
  eventsByDay: Map<string, GoogleEvent[]>;
  lists: TodoList[];
  onOpenDay: (d: Date) => void;
  onOpenTodo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onQuickAddDate: (dateKey: string) => void;
  onDropTodoOnDate: (todoId: string, dateKey: string) => void;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const tkey = todayKey();

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
          const dayTodos = todosByDay.get(key) ?? [];
          const dayEvents = eventsByDay.get(key) ?? [];
          const isDragOver = dragOverKey === key;
          const shownTodos = dayTodos.slice(0, 2);
          const shownEvents = dayEvents.slice(0, Math.max(0, 3 - shownTodos.length));
          const overflow = dayTodos.length - shownTodos.length + (dayEvents.length - shownEvents.length);
          return (
            <div
              key={key}
              onClick={() => onQuickAddDate(key)}
              title="Add a task for this day"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(TODO_DRAG_MIME)) e.preventDefault();
              }}
              onDragEnter={(e) => {
                if (e.dataTransfer.types.includes(TODO_DRAG_MIME)) setDragOverKey(key);
              }}
              onDragLeave={() => setDragOverKey((cur) => (cur === key ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverKey(null);
                const todoId = e.dataTransfer.getData(TODO_DRAG_MIME);
                if (todoId) onDropTodoOnDate(todoId, key);
              }}
              style={{
                height: 96,
                borderRadius: 8,
                border: isDragOver ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: isDragOver ? "var(--accent-subtle-bg)" : key === tkey ? "var(--accent-today-bg)" : "var(--bg-panel)",
                padding: 6,
                cursor: "pointer",
                opacity: inMonth ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                overflow: "hidden",
              }}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDay(d);
                }}
                title="Open this day"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: key === tkey ? "var(--accent-light)" : "var(--text-secondary)",
                  flexShrink: 0,
                  alignSelf: "flex-start",
                  cursor: "pointer",
                }}
              >
                {d.getDate()}
              </span>
              {shownTodos.map((t) => (
                <span
                  key={t.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData(TODO_DRAG_MIME, t.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTodo(t.id);
                  }}
                  style={{ ...miniChipStyle, cursor: "grab" }}
                >
                  <MiniCheckbox todo={t} list={lists.find((l) => l.id === t.list_id)} onToggleComplete={onToggleComplete} />
                  <span style={miniChipLabelStyle}>{t.title}</span>
                </span>
              ))}
              {shownEvents.map((ev) => (
                <span
                  key={ev.id}
                  title={`${ev.title} — ${formatEventTime(ev)}`}
                  onClick={(e) => e.stopPropagation()}
                  style={eventChipStyle(ev.color, isEventPast(ev))}
                >
                  {!ev.allDay && <span style={eventChipTimeStyle}>{formatEventTime(ev)}</span>}
                  <span style={miniChipLabelStyle}>{ev.title}</span>
                </span>
              ))}
              {overflow > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>+{overflow} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hours shown in the Week view's timed grid — 6 AM through 11 PM covers
// the vast majority of real calendar events without forcing a scroll just
// to see them, while still being reachable by scrolling for anything
// earlier/later.
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 48;
// Shared by the day-header/all-day row and the timed grid below it — both
// need this exact same leading gutter width and column layout (a flex row
// with a fixed-width spacer, then a 7-column grid with no gap, columns
// separated by borderLeft rather than gap) or their day columns drift out
// of alignment with each other, since a `gap` and a `border` consume the
// grid's available width differently even with identical gridTemplateColumns.
const WEEK_GUTTER_WIDTH = 52;

function WeekGrid({
  anchor,
  todosByDay,
  eventsByDay,
  lists,
  onOpenDay,
  onOpenTodo,
  onToggleComplete,
  onQuickAddDate,
  onDropTodoOnDate,
}: {
  anchor: Date;
  todosByDay: Map<string, Todo[]>;
  eventsByDay: Map<string, GoogleEvent[]>;
  lists: TodoList[];
  onOpenDay: (d: Date) => void;
  onOpenTodo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onQuickAddDate: (dateKey: string) => void;
  onDropTodoOnDate: (todoId: string, dateKey: string) => void;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const tkey = todayKey();
  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i);
  const gridHeight = hours.length * HOUR_HEIGHT;

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 12 }}>
        <div style={{ width: WEEK_GUTTER_WIDTH, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((d, dayIndex) => {
            const key = dateToKey(d);
            const dayTodos = todosByDay.get(key) ?? [];
            const dayEvents = eventsByDay.get(key) ?? [];
            const allDayEvents = dayEvents.filter((e) => e.allDay);
            const isDragOver = dragOverKey === key;
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "0 4px",
                  borderLeft: dayIndex > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  onClick={() => onOpenDay(d)}
                  style={{
                    cursor: "pointer",
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
                  onClick={() => onQuickAddDate(key)}
                  title="Add a task for this day"
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(TODO_DRAG_MIME)) e.preventDefault();
                  }}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes(TODO_DRAG_MIME)) setDragOverKey(key);
                  }}
                  onDragLeave={() => setDragOverKey((cur) => (cur === key ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverKey(null);
                    const todoId = e.dataTransfer.getData(TODO_DRAG_MIME);
                    if (todoId) onDropTodoOnDate(todoId, key);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    minHeight: 60,
                    maxHeight: 120,
                    overflowY: "auto",
                    border: isDragOver ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: isDragOver ? "var(--accent-subtle-bg)" : "transparent",
                    borderRadius: 8,
                    padding: 6,
                    cursor: "pointer",
                  }}
                >
                  {dayTodos.map((t) => (
                    <span
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData(TODO_DRAG_MIME, t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTodo(t.id);
                      }}
                      style={{ ...miniChipStyle, flexShrink: 0, cursor: "grab" }}
                    >
                      <MiniCheckbox todo={t} list={lists.find((l) => l.id === t.list_id)} onToggleComplete={onToggleComplete} />
                      <span style={miniChipLabelStyle}>{t.title}</span>
                    </span>
                  ))}
                  {allDayEvents.map((ev) => (
                    <span
                      key={ev.id}
                      title={ev.title}
                      onClick={(e) => e.stopPropagation()}
                      style={eventChipStyle(ev.color, isEventPast(ev))}
                    >
                      <span style={miniChipLabelStyle}>{ev.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timed grid: hour labels down the left, events positioned by time
          within their day's column — the Todoist-style layout requested,
          for Google events specifically (tasks have no time-of-day field
          in this app's schema, so they stay in the all-day-style lane
          above rather than being force-fit into an hour slot). */}
      <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {/* Hour labels and day columns share this single scroll container
            (rather than each having their own) so scrolling can never
            desync them — two independent overflow:auto regions here
            would let the labels and grid drift apart the moment either
            one was scrolled. */}
        <div style={{ display: "flex", flex: 1, maxHeight: 480, overflowY: "auto" }}>
          <div style={{ width: WEEK_GUTTER_WIDTH, flexShrink: 0, borderRight: "1px solid var(--border)" }}>
            <div style={{ position: "relative", height: gridHeight }}>
              {hours.map((h, i) => (
                <div key={h} style={{ position: "absolute", top: i * HOUR_HEIGHT - 6, right: 8, fontSize: 10, color: "var(--text-muted)" }}>
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {days.map((d, dayIndex) => {
              const key = dateToKey(d);
              const timedEvents = (eventsByDay.get(key) ?? []).filter((e) => !e.allDay);
              return (
                <div
                  key={key}
                  style={{
                    position: "relative",
                    height: gridHeight,
                    borderLeft: dayIndex > 0 ? "1px solid var(--border)" : "none",
                    background: key === tkey ? "var(--accent-today-bg)" : "transparent",
                  }}
                >
                  {hours.map((h, i) => (
                    <div key={h} style={{ position: "absolute", top: i * HOUR_HEIGHT, left: 0, right: 0, borderTop: "1px solid var(--border)" }} />
                  ))}
                  {timedEvents.map((ev) => {
                    const pos = eventPosition(ev);
                    if (!pos) return null;
                    return (
                      <div
                        key={ev.id}
                        title={`${ev.title} — ${formatEventTime(ev)}`}
                        style={{
                          position: "absolute",
                          top: pos.top,
                          height: pos.height,
                          left: 3,
                          right: 3,
                          borderRadius: 5,
                          padding: "2px 5px",
                          fontSize: 10,
                          lineHeight: 1.3,
                          color: "#fff",
                          background: ev.color || "var(--accent)",
                          opacity: isEventPast(ev) ? 0.55 : 1,
                          overflow: "hidden",
                          cursor: "default",
                        }}
                      >
                        <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatEventTime(ev)}</div>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

// Pixel top/height for a timed event within the hour grid, clamped to the
// grid's visible GRID_START_HOUR–GRID_END_HOUR range — an event partly or
// fully outside that window is clipped to the nearest edge rather than
// dropped, so nothing near the boundary silently disappears.
function eventPosition(event: GoogleEvent): { top: number; height: number } | null {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startMinutes = Math.max(0, (start.getHours() - GRID_START_HOUR) * 60 + start.getMinutes());
  const totalMinutes = (GRID_END_HOUR - GRID_START_HOUR + 1) * 60;
  const endMinutes = Math.min(totalMinutes, (end.getHours() - GRID_START_HOUR) * 60 + end.getMinutes());
  if (endMinutes <= 0 || startMinutes >= totalMinutes) return null;
  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max(18, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT);
  return { top, height };
}

function DayList({
  day,
  todosByDay,
  events,
  lists,
  subtasks,
  onOpenTodo,
  onToggleComplete,
  onAddTodo,
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onUpdateDueDate,
  onUpdateRecurrence,
}: {
  day: Date;
  todosByDay: Map<string, Todo[]>;
  events: GoogleEvent[];
  lists: TodoList[];
  subtasks: TodoSubtask[];
  onOpenTodo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onAddTodo: (
    listId: string,
    title: string,
    dueDate: string | null,
    extra?: { description?: string; recurrence?: Recurrence }
  ) => Promise<Todo | undefined> | void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onEditSubtask: (id: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onUpdateRecurrence: (id: string, recurrence: Recurrence) => void;
}) {
  const dayKey = dateToKey(day);
  const dayTodos = todosByDay.get(dayKey) ?? [];
  const inbox = lists.find((l) => l.is_inbox);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(dayKey);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [composerListId, setComposerListId] = useState(inbox?.id ?? lists[0]?.id ?? "");
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([]);

  function openComposer() {
    setComposerListId(inbox?.id ?? lists[0]?.id ?? "");
    setTitle("");
    setDescription("");
    setDueDate(dayKey);
    setRecurrence("none");
    setSubtaskTitles([]);
    setAdding(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawTitle = title.trim();
    if (!rawTitle || !composerListId) return;

    let finalTitle = rawTitle;
    let finalDueDate = dueDate;
    if (!finalDueDate) {
      const parsed = parseSmartDueDate(rawTitle);
      if (parsed) {
        finalDueDate = parsed.dueDate;
        finalTitle = parsed.title || rawTitle;
      }
    }

    const newTodo = await onAddTodo(composerListId, finalTitle, finalDueDate, { description: description.trim(), recurrence });
    if (newTodo) {
      for (const subtaskTitle of subtaskTitles) onAddSubtask(newTodo.id, subtaskTitle);
    }
    setAdding(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {events.length > 0 && <EventsHeader events={events} />}

      <div>
        {adding ? (
          <TaskComposer
            lists={lists}
            listId={composerListId}
            onListChange={setComposerListId}
            title={title}
            onTitleChange={setTitle}
            description={description}
            onDescriptionChange={setDescription}
            dueDate={dueDate}
            onDueDateChange={setDueDate}
            recurrence={recurrence}
            onRecurrenceChange={setRecurrence}
            subtaskTitles={subtaskTitles}
            onAddSubtaskTitle={(t) => setSubtaskTitles((prev) => [...prev, t])}
            onRemoveSubtaskTitle={(i) => setSubtaskTitles((prev) => prev.filter((_, idx) => idx !== i))}
            onCancel={() => setAdding(false)}
            onSubmit={handleSubmit}
            autoFocus
          />
        ) : (
          <button type="button" onClick={openComposer} style={addTaskButtonStyle}>
            <PlusIcon />
            Add task
          </button>
        )}
      </div>

      {dayTodos.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>Nothing due this day.</div>
      ) : (
        dayTodos.map((t) => (
          <TaskRow
            key={t.id}
            todo={t}
            list={lists.find((l) => l.id === t.list_id)}
            subtasks={subtasks.filter((s) => s.todo_id === t.id)}
            onToggleComplete={onToggleComplete}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onEditSubtask={onEditSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onUpdateDueDate={onUpdateDueDate}
            onUpdateRecurrence={onUpdateRecurrence}
            onOpen={onOpenTodo}
          />
        ))
      )}
    </div>
  );
}

// Shared by CalendarView's Day sub-tab and TaskListView's Today view — a
// plain time-then-title list, sorted with all-day events first (their
// formatEventTime already reads "All day" so they sort naturally to the
// top alongside a genuine time comparison for the rest).
export function EventsHeader({ events }: { events: GoogleEvent[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 4 }}>
      {events.map((ev) => (
        <a
          key={ev.id}
          href={ev.htmlLink ?? undefined}
          target={ev.htmlLink ? "_blank" : undefined}
          rel={ev.htmlLink ? "noreferrer" : undefined}
          title={ev.calendarSummary}
          style={{ ...eventRowStyle, opacity: isEventPast(ev) ? 0.55 : 1 }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 99, background: ev.color || "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0, minWidth: 64 }}>{formatEventTime(ev)}</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
        </a>
      ))}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MiniCheckbox({
  todo,
  list,
  onToggleComplete,
}: {
  todo: Todo;
  list: TodoList | undefined;
  onToggleComplete: (id: string) => void;
}) {
  const color = list ? LIST_COLOR_HEX[list.color] : "var(--border-strong)";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleComplete(todo.id);
      }}
      aria-label="Mark complete"
      style={{
        width: 20,
        height: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span aria-hidden style={{ width: 12, height: 12, borderRadius: 99, border: `2px solid ${color}` }} />
    </button>
  );
}

const addTaskButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: 14,
  fontWeight: 600,
  padding: "8px 4px",
  cursor: "pointer",
};

const miniChipStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: "var(--text-body)",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 99,
  padding: "2px 7px",
  cursor: "pointer",
  overflow: "hidden",
};

const miniChipLabelStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function eventChipStyle(color: string | null, past = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: "#fff",
    background: color || "var(--accent)",
    border: "none",
    borderRadius: 99,
    padding: "2px 7px",
    cursor: "default",
    overflow: "hidden",
    opacity: past ? 0.55 : 1,
  };
}

const eventChipTimeStyle: CSSProperties = {
  fontWeight: 700,
  flexShrink: 0,
};

const eventRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "2px 8px",
  borderRadius: 8,
  textDecoration: "none",
  cursor: "pointer",
};

const tabButtonStyle = (active: boolean): CSSProperties => ({
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
