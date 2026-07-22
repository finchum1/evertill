import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Todo, TodoList, TodoSubtask, View } from "../types";
import { LIST_COLOR_HEX } from "../types";
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
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onEditSubtask: (id: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
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
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onUpdateDueDate,
  onOpenTodo,
}: TaskListViewProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const inbox = lists.find((l) => l.is_inbox);
  const list = view === "today" || view === "upcoming" ? undefined : lists.find((l) => l.id === view);
  const tkey = todayKey();
  // Today/Upcoming group tasks under per-list headers instead (see
  // restGroups below), so the per-row list badge is only needed on
  // Completed, which stays a flat list mixing every list together.
  const showListBadge = view === "completed";

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

  // Today/Upcoming further group the non-overdue tasks by which list they
  // belong to — in `lists`' own order (already sort_order-sorted), skipping
  // any list with nothing shown in it.
  const canGroupByList = view === "today" || view === "upcoming";
  const restGroups = canGroupByList
    ? lists.map((l) => ({ list: l, todos: restShown.filter((t) => t.list_id === l.id) })).filter((g) => g.todos.length > 0)
    : null;
  const restMarginTop = overdueShown.length > 0 ? 12 : 0;

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

  function renderRow(t: Todo, withListBadge: boolean) {
    return (
      <TaskRow
        key={t.id}
        todo={t}
        list={withListBadge ? lists.find((l) => l.id === t.list_id) : undefined}
        subtasks={subtasks.filter((s) => s.todo_id === t.id)}
        onToggleComplete={onToggleComplete}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onEditSubtask={onEditSubtask}
        onDeleteSubtask={onDeleteSubtask}
        onUpdateDueDate={onUpdateDueDate}
        onOpen={onOpenTodo}
      />
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>{heading}</h1>

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
          <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            {view === "completed" ? "No completed tasks." : "Nothing here yet."}
          </div>
        )}
        {overdueShown.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={sectionLabelStyle}>Overdue</div>
            {overdueShown.map((t) => renderRow(t, showListBadge))}
          </div>
        )}
        {restGroups ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: restMarginTop }}>
            {restGroups.map(({ list: l, todos: groupTodos }) => (
              <div key={l.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={listGroupHeaderStyle}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: LIST_COLOR_HEX[l.color] }} />
                  {l.is_inbox ? "Inbox" : l.name}
                </div>
                {groupTodos.map((t) => renderRow(t, false))}
              </div>
            ))}
          </div>
        ) : (
          restShown.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: restMarginTop }}>
              {restShown.map((t) => renderRow(t, showListBadge))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  padding: "9px 12px",
  outline: "none",
  fontFamily: "inherit",
};

const primaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
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
  color: "var(--danger)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: "4px 0 -2px",
};

const listGroupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: "4px 0 -2px",
};
