import { useState } from "react";
import type { CSSProperties } from "react";
import type { Todo, TodoList, TodoSubtask } from "../types";
import { addDays, addMonths, dateToKey, startOfWeek, todayKey } from "../lib/dates";
import { TODO_DRAG_MIME } from "../lib/dragTypes";
import { TaskRow } from "./TaskRow";

type SubView = "month" | "week" | "day";

interface CalendarViewProps {
  todos: Todo[];
  lists: TodoList[];
  subtasks: TodoSubtask[];
  onOpenTodo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onDropTodoOnDate: (todoId: string, dateKey: string) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  todos,
  lists,
  subtasks,
  onOpenTodo,
  onToggleComplete,
  onToggleSubtask,
  onUpdateDueDate,
  onDropTodoOnDate,
}: CalendarViewProps) {
  const [subView, setSubView] = useState<SubView>("month");
  const [anchor, setAnchor] = useState(() => new Date());

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
        <MonthGrid anchor={anchor} todosByDay={todosByDay} onOpenDay={openDay} onOpenTodo={onOpenTodo} onDropTodoOnDate={onDropTodoOnDate} />
      )}
      {subView === "week" && (
        <WeekGrid anchor={anchor} todosByDay={todosByDay} onOpenDay={openDay} onOpenTodo={onOpenTodo} onDropTodoOnDate={onDropTodoOnDate} />
      )}
      {subView === "day" && (
        <DayList
          day={anchor}
          todosByDay={todosByDay}
          lists={lists}
          subtasks={subtasks}
          onOpenTodo={onOpenTodo}
          onToggleComplete={onToggleComplete}
          onToggleSubtask={onToggleSubtask}
          onUpdateDueDate={onUpdateDueDate}
        />
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
  onOpenDay,
  onOpenTodo,
  onDropTodoOnDate,
}: {
  anchor: Date;
  todosByDay: Map<string, Todo[]>;
  onOpenDay: (d: Date) => void;
  onOpenTodo: (id: string) => void;
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
          const isDragOver = dragOverKey === key;
          return (
            <div
              key={key}
              onClick={() => onOpenDay(d)}
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
                minHeight: 84,
                borderRadius: 8,
                border: isDragOver ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: isDragOver ? "var(--accent-subtle-bg)" : key === tkey ? "var(--accent-today-bg)" : "var(--bg-panel)",
                padding: 6,
                cursor: "pointer",
                opacity: inMonth ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: key === tkey ? "var(--accent-light)" : "var(--text-secondary)" }}>{d.getDate()}</span>
              {dayTodos.slice(0, 3).map((t) => (
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
                  {t.title}
                </span>
              ))}
              {dayTodos.length > 3 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{dayTodos.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor,
  todosByDay,
  onOpenDay,
  onOpenTodo,
  onDropTodoOnDate,
}: {
  anchor: Date;
  todosByDay: Map<string, Todo[]>;
  onOpenDay: (d: Date) => void;
  onOpenTodo: (id: string) => void;
  onDropTodoOnDate: (todoId: string, dateKey: string) => void;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const tkey = todayKey();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
      {days.map((d) => {
        const key = dateToKey(d);
        const dayTodos = todosByDay.get(key) ?? [];
        const isDragOver = dragOverKey === key;
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                minHeight: 120,
                border: isDragOver ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: isDragOver ? "var(--accent-subtle-bg)" : "transparent",
                borderRadius: 8,
                padding: 6,
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
                  onClick={() => onOpenTodo(t.id)}
                  style={{ ...miniChipStyle, padding: "4px 6px", cursor: "grab" }}
                >
                  {t.title}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  day,
  todosByDay,
  lists,
  subtasks,
  onOpenTodo,
  onToggleComplete,
  onToggleSubtask,
  onUpdateDueDate,
}: {
  day: Date;
  todosByDay: Map<string, Todo[]>;
  lists: TodoList[];
  subtasks: TodoSubtask[];
  onOpenTodo: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
}) {
  const dayTodos = todosByDay.get(dateToKey(day)) ?? [];

  if (dayTodos.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>Nothing due this day.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dayTodos.map((t) => (
        <TaskRow
          key={t.id}
          todo={t}
          list={lists.find((l) => l.id === t.list_id)}
          subtasks={subtasks.filter((s) => s.todo_id === t.id)}
          onToggleComplete={onToggleComplete}
          onToggleSubtask={onToggleSubtask}
          onUpdateDueDate={onUpdateDueDate}
          onOpen={onOpenTodo}
        />
      ))}
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
