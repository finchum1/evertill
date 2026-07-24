import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Recurrence, Todo, TodoList, TodoSubtask } from "../types";
import { TaskRow } from "./TaskRow";
import { TaskComposer } from "./TaskComposer";
import { addDays, dateToKey, parseDateKey, todayKey } from "../lib/dates";
import { parseSmartDueDate } from "../lib/smartDate";

interface UpcomingViewProps {
  lists: TodoList[];
  todos: Todo[];
  subtasks: TodoSubtask[];
  onAddTodo: (
    listId: string,
    title: string,
    dueDate: string | null,
    extra?: { description?: string; recurrence?: Recurrence }
  ) => Promise<Todo | undefined> | void;
  onToggleComplete: (id: string) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onEditSubtask: (id: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onUpdateRecurrence: (id: string, recurrence: Recurrence) => void;
  onOpenTodo: (id: string) => void;
}

// Todoist-style agenda: grouped by calendar day (not by list, unlike Today/
// List views) with today always shown first even when empty — every day
// group gets its own inline "+ Add task" composer defaulted to that day's
// date, and a separate, collapsible Overdue section sits above all of it.
export function UpcomingView({
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
  onUpdateRecurrence,
  onOpenTodo,
}: UpcomingViewProps) {
  const [overdueCollapsed, setOverdueCollapsed] = useState(false);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [composerListId, setComposerListId] = useState("");
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([]);

  const inbox = lists.find((l) => l.is_inbox);
  const tkey = todayKey();

  const active = todos.filter((t) => !t.completed && t.due_date);
  const overdueTodos = active.filter((t) => t.due_date! < tkey).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const upcomingTodos = active.filter((t) => t.due_date! >= tkey);

  const groups: { key: string; todos: Todo[] }[] = [];
  for (const t of upcomingTodos) {
    const key = t.due_date!;
    const existing = groups.find((g) => g.key === key);
    if (existing) existing.todos.push(t);
    else groups.push({ key, todos: [t] });
  }
  // The agenda always shows at least 10 consecutive days starting today —
  // even the empty ones — so there's a full scrollable week-and-a-half of
  // "+ Add task" slots, not just whichever days happen to already have a
  // task. Any real task due further out still gets its own group beyond
  // that minimum (nothing is ever truncated, only guaranteed padded out).
  const minDays = 10;
  for (let i = 0; i < minDays; i++) {
    const key = dateToKey(addDays(new Date(), i));
    if (!groups.some((g) => g.key === key)) groups.push({ key, todos: [] });
  }
  groups.sort((a, b) => a.key.localeCompare(b.key));

  function dayLabel(key: string): string {
    const d = parseDateKey(key);
    const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (key === tkey) return `Today · ${datePart}`;
    if (key === dateToKey(addDays(new Date(), 1))) return `Tomorrow · ${datePart}`;
    return `${d.toLocaleDateString(undefined, { weekday: "long" })} · ${datePart}`;
  }

  function openComposer(dateKey: string) {
    setComposerListId(inbox?.id ?? lists[0]?.id ?? "");
    setTitle("");
    setDescription("");
    setDueDate(dateKey);
    setRecurrence("none");
    setSubtaskTitles([]);
    setAddingDate(dateKey);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawTitle = title.trim();
    if (!rawTitle || !composerListId) return;

    let finalTitle = rawTitle;
    let finalDueDate = dueDate;
    // An explicitly-picked date wins; only smart-parse the title for a date
    // phrase ("tomorrow", "next Thursday"...) when the date field was left
    // blank, so this never overrides the day section it was opened from.
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
    setAddingDate(null);
  }

  function renderRow(t: Todo) {
    return (
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
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "min(1100px, 92%)", margin: "0 auto" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Upcoming</h1>

        {overdueTodos.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div
              onClick={() => setOverdueCollapsed((c) => !c)}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: overdueCollapsed ? 0 : 8 }}
            >
              <span style={{ fontSize: 11, color: "var(--danger)", width: 12, flexShrink: 0 }}>{overdueCollapsed ? "▸" : "▾"}</span>
              <span style={sectionLabelStyle}>Overdue</span>
            </div>
            {!overdueCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{overdueTodos.map((t) => renderRow(t))}</div>
            )}
          </div>
        )}

        {groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 24 }}>
            <div style={{ ...dateHeaderStyle, ...(g.key === tkey ? dateHeaderTodayStyle : {}) }}>{dayLabel(g.key)}</div>
            <div style={dateHeaderRuleStyle} />
            {g.todos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>{g.todos.map((t) => renderRow(t))}</div>
            )}
            {addingDate === g.key ? (
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
                onCancel={() => setAddingDate(null)}
                onSubmit={handleSubmit}
                autoFocus
              />
            ) : (
              <button type="button" onClick={() => openComposer(g.key)} style={addTaskButtonStyle}>
                <PlusIcon />
                Add task
              </button>
            )}
          </div>
        ))}
      </div>
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

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--danger)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const dateHeaderStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "var(--text-secondary)",
  marginBottom: 8,
};

const dateHeaderTodayStyle: CSSProperties = {
  color: "var(--text-primary)",
};

const dateHeaderRuleStyle: CSSProperties = {
  height: 1,
  background: "var(--border)",
  marginBottom: 12,
};
