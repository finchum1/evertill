import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent, ReactNode } from "react";
import type { Recurrence, Todo, TodoList, TodoSubtask } from "../types";
import { LIST_COLOR_HEX } from "../types";
import { formatDueDate, isOverdue } from "../lib/dates";
import { TODO_DRAG_MIME } from "../lib/dragTypes";
import { DatePickerField } from "./DatePickerField";

interface TaskRowProps {
  todo: Todo;
  list?: TodoList;
  subtasks: TodoSubtask[];
  onToggleComplete: (id: string) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onEditSubtask: (id: string, title: string) => void;
  onDeleteSubtask: (id: string) => void;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onUpdateRecurrence: (id: string, recurrence: Recurrence) => void;
  onOpen: (id: string) => void;
}

export function TaskRow({
  todo,
  list,
  subtasks,
  onToggleComplete,
  onAddSubtask,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onUpdateDueDate,
  onUpdateRecurrence,
  onOpen,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const open = subtasks.filter((s) => !s.checked).length;
  const overdue = !!todo.due_date && !todo.completed && isOverdue(todo.due_date);

  // Local, instantly-flipped mirror of todo.completed so the check/strike
  // animation plays immediately on click rather than waiting on this app's
  // refetch-not-optimistic data layer — synced back in sync with the prop
  // once the real update lands (a no-op in the common case).
  const [checked, setChecked] = useState(todo.completed);
  useEffect(() => setChecked(todo.completed), [todo.completed]);

  function handleAddSubtask(e: FormEvent) {
    e.preventDefault();
    const title = newSubtask.trim();
    if (!title) return;
    onAddSubtask(todo.id, title);
    setNewSubtask("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(TODO_DRAG_MIME, todo.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        title="Drag to move to another list or day"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-panel)",
          cursor: "grab",
        }}
      >
        <AnimatedCheckbox
          checked={checked}
          onToggle={(e) => {
            e.stopPropagation();
            setChecked((c) => !c);
            onToggleComplete(todo.id);
          }}
          size={18}
          ariaLabel={checked ? "Mark incomplete" : "Mark complete"}
        />
        <div
          onClick={() => onOpen(todo.id)}
          style={{ flex: 1, minWidth: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
        >
          <StrikeThroughText checked={checked} fontSize={14} color="var(--text-primary)">
            {todo.title}
          </StrikeThroughText>
          {(list || todo.description || subtasks.length > 0) && (
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text-secondary)" }}>
              {list && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: LIST_COLOR_HEX[list.color], flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {list.is_inbox ? "Inbox" : list.name}
                  </span>
                </span>
              )}
              {!!todo.description && <DescriptionIcon />}
              {subtasks.length > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((x) => !x);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                  title={expanded ? "Collapse subtasks" : "Expand subtasks"}
                >
                  <SubtaskIcon />
                  {open}
                </span>
              )}
            </span>
          )}
        </div>
        <DueDateBadge
          todo={todo}
          overdue={overdue}
          onUpdateDueDate={onUpdateDueDate}
          onUpdateRecurrence={onUpdateRecurrence}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
          title={expanded ? "Collapse subtasks" : "Add or view subtasks"}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            padding: 4,
            flexShrink: 0,
          }}
        >
          {expanded ? "▾" : "▸"}
        </button>
      </div>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 34 }} onClick={(e) => e.stopPropagation()}>
          {subtasks.map((s) => (
            <SubtaskRow key={s.id} subtask={s} onToggle={onToggleSubtask} onEdit={onEditSubtask} onDelete={onDeleteSubtask} />
          ))}
          <form onSubmit={handleAddSubtask} style={{ display: "flex", gap: 6, marginTop: subtasks.length > 0 ? 2 : 0 }}>
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a subtask…"
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--border)",
                border: "1px solid var(--border-strong)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 12,
                padding: "6px 8px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              style={{
                background: "none",
                border: "1px solid var(--border-strong)",
                borderRadius: 6,
                color: "var(--text-body)",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 10px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SubtaskRow({
  subtask,
  onToggle,
  onEdit,
  onDelete,
}: {
  subtask: TodoSubtask;
  onToggle: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [checked, setChecked] = useState(subtask.checked);
  useEffect(() => setChecked(subtask.checked), [subtask.checked]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 8,
        background: "var(--bg-panel-nested)",
        border: "1px solid var(--border)",
      }}
    >
      <AnimatedCheckbox
        checked={checked}
        onToggle={() => {
          setChecked((c) => !c);
          onToggle(subtask.id);
        }}
        size={14}
        ariaLabel={checked ? "Mark subtask incomplete" : "Mark subtask complete"}
      />
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const trimmed = title.trim();
            if (trimmed && trimmed !== subtask.title) onEdit(subtask.id, trimmed);
            else setTitle(subtask.title);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          style={{
            flex: 1,
            minWidth: 0,
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            fontSize: 13,
            padding: 0,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <StrikeThroughText
          checked={checked}
          fontSize={13}
          color="var(--text-body)"
          onClick={() => setEditing(true)}
          title="Click to edit"
          cursor="text"
          flex
        >
          {subtask.title}
        </StrikeThroughText>
      )}
      <button
        onClick={() => onDelete(subtask.id)}
        aria-label="Delete subtask"
        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, flexShrink: 0, padding: 0 }}
      >
        ×
      </button>
    </div>
  );
}

function DueDateBadge({
  todo,
  overdue,
  onUpdateDueDate,
  onUpdateRecurrence,
}: {
  todo: Todo;
  overdue: boolean;
  onUpdateDueDate: (id: string, date: string | null) => void;
  onUpdateRecurrence: (id: string, recurrence: Recurrence) => void;
}) {
  return (
    <DatePickerField
      value={todo.due_date}
      onChange={(date) => onUpdateDueDate(todo.id, date)}
      recurrence={todo.recurrence}
      onRecurrenceChange={(r) => onUpdateRecurrence(todo.id, r)}
      renderTrigger={({ onClick, triggerRef }) => (
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          title="Click to change due date"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 12,
            fontWeight: 600,
            color: todo.due_date ? (overdue ? "var(--danger)" : "var(--text-secondary)") : "var(--border-strong)",
            flexShrink: 0,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {todo.due_date ? formatDueDate(todo.due_date) : "Set date"}
        </button>
      )}
    />
  );
}

function DescriptionIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SubtaskIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 8L7 10.5L11.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Shared by TaskRow's main checkbox and SubtaskRow's: fills to the theme
// success color and draws in a checkmark on check, matching the reverse on
// uncheck for free since these are CSS transitions, not one-shot keyframes.
function AnimatedCheckbox({
  checked,
  onToggle,
  size,
  ariaLabel,
}: {
  checked: boolean;
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
  size: number;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        border: `2px solid ${checked ? "var(--success)" : "var(--border-strong)"}`,
        background: checked ? "var(--success)" : "transparent",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 160ms ease, border-color 160ms ease",
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 10 10"
        fill="none"
        style={{
          opacity: checked ? 1 : 0,
          transform: checked ? "scale(1)" : "scale(0.4)",
          transition: checked
            ? "opacity 140ms ease 90ms, transform 140ms cubic-bezier(0.34,1.56,0.64,1) 90ms"
            : "opacity 100ms ease, transform 100ms ease",
        }}
      >
        <path d="M1.5 5.2L4 7.7L8.5 2.3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// Shared by TaskRow's title and SubtaskRow's: instead of a plain CSS
// text-decoration flip (which can't animate smoothly across browsers), a
// separate line overlay scales in from the left over the text, timed to
// start just after the checkbox's own fill/checkmark animation finishes.
function StrikeThroughText({
  checked,
  children,
  fontSize,
  color,
  mutedColor = "var(--text-muted)",
  onClick,
  title,
  cursor,
  flex,
}: {
  checked: boolean;
  children: ReactNode;
  fontSize: number;
  color: string;
  mutedColor?: string;
  onClick?: () => void;
  title?: string;
  cursor?: CSSProperties["cursor"];
  flex?: boolean;
}) {
  return (
    <span
      onClick={onClick}
      title={title}
      style={{ position: "relative", display: "block", minWidth: 0, flex: flex ? 1 : undefined, cursor }}
    >
      <span
        style={{
          display: "block",
          fontSize,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: checked ? mutedColor : color,
          transition: "color 180ms ease 200ms",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: mutedColor,
          transform: checked ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
          transition: "transform 220ms ease 190ms",
          pointerEvents: "none",
        }}
      />
    </span>
  );
}
