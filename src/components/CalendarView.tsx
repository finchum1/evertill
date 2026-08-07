import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Recurrence, Todo, TodoList, TodoSubtask } from "../types";
import { LIST_COLOR_HEX } from "../types";
import { addDays, addMonths, dateToKey, startOfWeek, todayKey } from "../lib/dates";
import { TODO_DRAG_MIME } from "../lib/dragTypes";
import { TaskRow } from "./TaskRow";
import { TaskComposer } from "./TaskComposer";
import { QuickAddTaskModal } from "./QuickAddTaskModal";
import { parseSmartDueDate } from "../lib/smartDate";

type SubView = "month" | "week" | "day";

interface CalendarViewProps {
  todos: Todo[];
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
  onDropTodoOnDate: (todoId: string, dateKey: string) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  todos,
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
  onDropTodoOnDate,
}: CalendarViewProps) {
  const [subView, setSubView] = useState<SubView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

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
  lists,
  onOpenDay,
  onOpenTodo,
  onToggleComplete,
  onQuickAddDate,
  onDropTodoOnDate,
}: {
  anchor: Date;
  todosByDay: Map<string, Todo[]>;
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
          const isDragOver = dragOverKey === key;
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
                  <MiniCheckbox todo={t} list={lists.find((l) => l.id === t.list_id)} onToggleComplete={onToggleComplete} />
                  <span style={miniChipLabelStyle}>{t.title}</span>
                </span>
              ))}
              {dayTodos.length > 3 && <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>+{dayTodos.length - 3} more</span>}
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
  lists,
  onOpenDay,
  onOpenTodo,
  onToggleComplete,
  onQuickAddDate,
  onDropTodoOnDate,
}: {
  anchor: Date;
  todosByDay: Map<string, Todo[]>;
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
                height: 120,
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
