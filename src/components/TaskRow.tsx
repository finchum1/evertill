import type { Todo, TodoSubtask } from "../types";
import { formatDueDate, isOverdue } from "../lib/dates";
import { TODO_DRAG_MIME } from "../lib/dragTypes";

interface TaskRowProps {
  todo: Todo;
  subtasks: TodoSubtask[];
  onToggleComplete: (id: string) => void;
  onOpen: (id: string) => void;
}

export function TaskRow({ todo, subtasks, onToggleComplete, onOpen }: TaskRowProps) {
  const open = subtasks.filter((s) => !s.checked).length;
  const overdue = !!todo.due_date && !todo.completed && isOverdue(todo.due_date);

  return (
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
        border: "1px solid #1e293b",
        background: "#0f172a",
        cursor: "grab",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(todo.id);
        }}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        style={{
          width: 18,
          height: 18,
          borderRadius: 99,
          border: `2px solid ${todo.completed ? "#22c55e" : "#334155"}`,
          background: todo.completed ? "#22c55e" : "transparent",
          cursor: "pointer",
          flexShrink: 0,
          padding: 0,
        }}
      />
      <div
        onClick={() => onOpen(todo.id)}
        style={{ flex: 1, minWidth: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
      >
        <span
          style={{
            fontSize: 14,
            color: todo.completed ? "#475569" : "#f1f5f9",
            textDecoration: todo.completed ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {todo.title}
        </span>
        {(todo.description || open > 0) && (
          <span style={{ display: "flex", gap: 10, fontSize: 11, color: "#475569" }}>
            {!!todo.description && <span>📝</span>}
            {open > 0 && <span>☑ {open}</span>}
          </span>
        )}
      </div>
      {todo.due_date && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: overdue ? "#ef4444" : "#64748b",
            flexShrink: 0,
          }}
        >
          {formatDueDate(todo.due_date)}
        </span>
      )}
    </div>
  );
}
