import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Todo, TodoList, TodoSubtask, View } from "../types";
import { TaskRow } from "./TaskRow";
import { isOverdue, todayKey } from "../lib/dates";
import { parseSmartDueDate } from "../lib/smartDate";
import { openDatePicker } from "../lib/datePicker";
import { SmartDateInput } from "./SmartDateInput";

interface TaskListViewProps {
  view: View;
  lists: TodoList[];
  todos: Todo[];
  subtasks: TodoSubtask[];
  onAddTodo: (listId: string, title: string, dueDate: string | null) => void;
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onOpenTodo: (id: string) => void;
}

export function TaskListView({
  view,
  lists,
  todos,
  subtasks,
  onAddTodo,
  onToggleComplete,
  onToggleSubtask,
  onUpdateDueDate,
  onOpenTodo,
}: TaskListViewProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const inbox = lists.find((l) => l.is_inbox);
  const list = view === "today" || view === "upcoming" ? undefined : lists.find((l) => l.id === view);
  const tkey = todayKey();
  // Only worth showing which list a task belongs to on views that mix tasks
  // from multiple lists together — redundant on a view already scoped to one list.
  const showListBadge = view === "today" || view === "upcoming" || view === "completed";

  let shown: Todo[];
  let heading: string;
  if (view === "today") {
    shown = todos.filter((t) => !t.completed && t.due_date && t.due_date <= tkey);
    heading = "Today";
  } else if (view === "upcoming") {
    shown = todos.filter((t) => !t.completed && t.due_date && t.due_date > tkey);
    heading = "Upcoming";
  } else if (view === "completed") {
    shown = todos.filter((t) => t.completed);
    heading = "Completed";
  } else {
    shown = todos.filter((t) => t.list_id === view && !t.completed);
    heading = list?.name ?? "List";
  }
  shown =
    view === "completed"
      ? [...shown].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
      : [...shown].sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  // Overdue tasks get their own group above the rest, wherever mixing
  // overdue with non-overdue tasks is possible — Upcoming only ever
  // contains future dates by definition, and Completed doesn't apply.
  const canGroupOverdue = view !== "upcoming" && view !== "completed";
  const overdueShown = canGroupOverdue ? shown.filter((t) => t.due_date && isOverdue(t.due_date)) : [];
  const restShown = canGroupOverdue ? shown.filter((t) => !(t.due_date && isOverdue(t.due_date))) : shown;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawTitle = title.trim();
    if (!rawTitle) return;
    const targetListId = view === "today" || view === "upcoming" ? inbox?.id : view;
    if (!targetListId) return;

    let finalTitle = rawTitle;
    let finalDueDate = dueDate || null;
    // An explicitly-picked date wins; only smart-parse the title for a date
    // phrase ("tomorrow", "next Thursday"...) when the date field was left
    // blank — true whenever a picker is shown but empty, and always true for
    // Today/Upcoming, which have no picker at all.
    if (!finalDueDate) {
      const parsed = parseSmartDueDate(rawTitle);
      if (parsed) {
        finalDueDate = parsed.dueDate;
        finalTitle = parsed.title || rawTitle;
      }
    }
    if (!finalDueDate && view === "today") finalDueDate = tkey;

    onAddTodo(targetListId, finalTitle, finalDueDate);
    setTitle("");
    setDueDate("");
  }

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px" }}>{heading}</h1>

      {view !== "completed" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <SmartDateInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={view === "today" ? "Add a task for today…" : "Add a task…"}
            style={{ ...inputStyle, flex: 1 }}
          />
          {view !== "today" && view !== "upcoming" && (
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} onClick={openDatePicker} style={inputStyle} />
          )}
          <button type="submit" style={primaryButtonStyle}>
            Add
          </button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.length === 0 && (
          <div style={{ color: "#475569", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            {view === "completed" ? "No completed tasks." : "Nothing here yet."}
          </div>
        )}
        {overdueShown.length > 0 && (
          <>
            <div style={sectionLabelStyle}>Overdue</div>
            {overdueShown.map((t) => (
              <TaskRow
                key={t.id}
                todo={t}
                list={showListBadge ? lists.find((l) => l.id === t.list_id) : undefined}
                subtasks={subtasks.filter((s) => s.todo_id === t.id)}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onUpdateDueDate={onUpdateDueDate}
                onOpen={onOpenTodo}
              />
            ))}
          </>
        )}
        {restShown.map((t) => (
          <TaskRow
            key={t.id}
            todo={t}
            list={showListBadge ? lists.find((l) => l.id === t.list_id) : undefined}
            subtasks={subtasks.filter((s) => s.todo_id === t.id)}
            onToggleComplete={onToggleComplete}
            onToggleSubtask={onToggleSubtask}
            onUpdateDueDate={onUpdateDueDate}
            onOpen={onOpenTodo}
          />
        ))}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  background: "#4f46e5",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  padding: "9px 18px",
  cursor: "pointer",
  flexShrink: 0,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#ef4444",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: "4px 0 -2px",
};
