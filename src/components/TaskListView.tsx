import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Todo, TodoList, TodoSubtask, View } from "../types";
import { TaskRow } from "./TaskRow";
import { todayKey } from "../lib/dates";

interface TaskListViewProps {
  view: View;
  lists: TodoList[];
  todos: Todo[];
  subtasks: TodoSubtask[];
  onAddTodo: (listId: string, title: string, dueDate: string | null) => void;
  onToggleComplete: (id: string) => void;
  onOpenTodo: (id: string) => void;
}

export function TaskListView({ view, lists, todos, subtasks, onAddTodo, onToggleComplete, onOpenTodo }: TaskListViewProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const inbox = lists.find((l) => l.is_inbox);
  const list = view === "today" || view === "upcoming" ? undefined : lists.find((l) => l.id === view);
  const tkey = todayKey();

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const targetListId = view === "today" || view === "upcoming" ? inbox?.id : view;
    if (!targetListId) return;
    const effectiveDueDate = view === "today" ? tkey : dueDate || null;
    onAddTodo(targetListId, title.trim(), effectiveDueDate);
    setTitle("");
    setDueDate("");
  }

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 16px" }}>{heading}</h1>

      {view !== "completed" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={view === "today" ? "Add a task for today…" : "Add a task…"}
            style={{ ...inputStyle, flex: 1 }}
          />
          {view !== "today" && view !== "upcoming" && (
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
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
        {shown.map((t) => (
          <TaskRow
            key={t.id}
            todo={t}
            subtasks={subtasks.filter((s) => s.todo_id === t.id)}
            onToggleComplete={onToggleComplete}
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
