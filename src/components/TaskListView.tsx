import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Recurrence, Todo, TodoList, TodoSubtask, View } from "../types";
import { LIST_COLOR_HEX } from "../types";
import { TaskRow } from "./TaskRow";
import { TaskComposer } from "./TaskComposer";
import { UpcomingView } from "./UpcomingView";
import { EventsHeader } from "./CalendarView";
import { addDays, dateToKey, formatDueDate, isOverdue, todayKey } from "../lib/dates";
import { parseSmartDueDate } from "../lib/smartDate";
import type { useGoogleCalendar } from "../hooks/useGoogleCalendar";

interface TaskListViewProps {
  view: View;
  lists: TodoList[];
  todos: Todo[];
  subtasks: TodoSubtask[];
  googleCalendarData: ReturnType<typeof useGoogleCalendar>;
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

export function TaskListView({
  view,
  lists,
  todos,
  subtasks,
  googleCalendarData,
  onAddTodo,
  onToggleComplete,
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onUpdateDueDate,
  onUpdateRecurrence,
  onOpenTodo,
}: TaskListViewProps) {
  // Upcoming's day-grouped agenda layout (today always first, per-day
  // composers, a collapsible Overdue section) is different enough from
  // every other view's per-list grouping that it's its own component
  // rather than another branch threaded through the logic below.
  if (view === "upcoming") {
    return (
      <UpcomingView
        lists={lists}
        todos={todos}
        subtasks={subtasks}
        onAddTodo={onAddTodo}
        onToggleComplete={onToggleComplete}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onEditSubtask={onEditSubtask}
        onDeleteSubtask={onDeleteSubtask}
        onUpdateDueDate={onUpdateDueDate}
        onUpdateRecurrence={onUpdateRecurrence}
        onOpenTodo={onOpenTodo}
      />
    );
  }

  return <TaskListViewInner
    view={view}
    lists={lists}
    todos={todos}
    subtasks={subtasks}
    googleCalendarData={googleCalendarData}
    onAddTodo={onAddTodo}
    onToggleComplete={onToggleComplete}
    onAddSubtask={onAddSubtask}
    onToggleSubtask={onToggleSubtask}
    onEditSubtask={onEditSubtask}
    onDeleteSubtask={onDeleteSubtask}
    onUpdateDueDate={onUpdateDueDate}
    onUpdateRecurrence={onUpdateRecurrence}
    onOpenTodo={onOpenTodo}
  />;
}

// Today's own events — reads useGoogleCalendar's own cached todayEvents
// rather than fetching here, so switching away from Today and back
// (which unmounts/remounts this component, since it's only conditionally
// rendered) is instant instead of re-fetching every single visit. The
// hook itself lives for the whole session and only refetches when
// `calendars` actually changes (connect/disconnect/visibility toggle).
function TodayEvents({ googleCalendarData }: { googleCalendarData: ReturnType<typeof useGoogleCalendar> }) {
  const { todayEvents } = googleCalendarData;
  if (todayEvents.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <EventsHeader events={todayEvents} />
    </div>
  );
}

function TaskListViewInner({
  view,
  lists,
  todos,
  subtasks,
  googleCalendarData,
  onAddTodo,
  onToggleComplete,
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onUpdateDueDate,
  onUpdateRecurrence,
  onOpenTodo,
}: TaskListViewProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [composerListId, setComposerListId] = useState("");
  const [subtaskTitles, setSubtaskTitles] = useState<string[]>([]);

  // Switching pages/views while the inline composer is open would otherwise
  // leave a stale, still-open form behind (this component instance persists
  // across view changes — no `key` forces a remount) — auto-cancel instead.
  useEffect(() => {
    setAdding(false);
  }, [view]);

  const inbox = lists.find((l) => l.is_inbox);
  const list = view === "today" ? undefined : lists.find((l) => l.id === view);
  const tkey = todayKey();

  let shown: Todo[];
  let heading: string;
  if (view === "today") {
    shown = todos.filter((t) => !t.completed && t.due_date && t.due_date <= tkey);
    heading = "Today";
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
  // overdue with non-overdue tasks is possible — Completed doesn't apply
  // (Upcoming has its own collapsible Overdue section in UpcomingView).
  const canGroupOverdue = view !== "completed";
  const overdueShown = canGroupOverdue ? shown.filter((t) => t.due_date && isOverdue(t.due_date)) : [];
  const restShown = canGroupOverdue ? shown.filter((t) => !(t.due_date && isOverdue(t.due_date))) : shown;

  // Today further groups the non-overdue tasks by which list they belong
  // to — in `lists`' own order (already sort_order-sorted), skipping any
  // list with nothing shown in it.
  const canGroupByList = view === "today";
  const restGroups = canGroupByList
    ? lists.map((l) => ({ list: l, todos: restShown.filter((t) => t.list_id === l.id) })).filter((g) => g.todos.length > 0)
    : null;
  const restMarginTop = overdueShown.length > 0 ? 12 : 0;

  // Completed groups by the day each task was actually completed (not due
  // date, which is meaningless once done) — "shown" is already sorted by
  // updated_at descending, so groups come out newest-first for free.
  const completedGroups =
    view === "completed"
      ? shown.reduce<{ key: string; label: string; todos: Todo[] }[]>((groups, t) => {
          if (!t.updated_at) return groups;
          const key = dateToKey(new Date(t.updated_at));
          const existing = groups.find((g) => g.key === key);
          if (existing) existing.todos.push(t);
          else groups.push({ key, label: completionDateLabel(key), todos: [t] });
          return groups;
        }, [])
      : null;

  function openComposer() {
    const defaultListId = view === "today" ? (inbox?.id ?? lists[0]?.id ?? "") : view;
    setComposerListId(defaultListId);
    setTitle("");
    setDescription("");
    setDueDate(view === "today" ? tkey : null);
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
    // An explicitly-picked date wins; only smart-parse the title for a date
    // phrase ("tomorrow", "next Thursday"...) when the date field was left
    // blank, so this never overrides an explicit user choice.
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
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>{heading}</h1>

      {view === "today" && <TodayEvents googleCalendarData={googleCalendarData} />}

      {view !== "completed" && (
        <div style={{ marginBottom: 16 }}>
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
            {overdueShown.map((t) => renderRow(t))}
          </div>
        )}
        {completedGroups ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {completedGroups.map((g) => (
              <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={listGroupHeaderStyle}>{g.label}</div>
                {g.todos.map((t) => renderRow(t))}
              </div>
            ))}
          </div>
        ) : restGroups ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: restMarginTop }}>
            {restGroups.map(({ list: l, todos: groupTodos }) => (
              <div key={l.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={listGroupHeaderStyle}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: LIST_COLOR_HEX[l.color] }} />
                  {l.is_inbox ? "Inbox" : l.name}
                </div>
                {groupTodos.map((t) => renderRow(t))}
              </div>
            ))}
          </div>
        ) : (
          restShown.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: restMarginTop }}>
              {restShown.map((t) => renderRow(t))}
            </div>
          )
        )}
      </div>
    </div>
    </div>
  );
}

function completionDateLabel(key: string): string {
  const tkey = todayKey();
  if (key === tkey) return "Today";
  if (key === dateToKey(addDays(new Date(), -1))) return "Yesterday";
  return formatDueDate(key);
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
