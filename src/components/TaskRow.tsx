import { useState } from "react";
import type { Todo, TodoSubtask } from "../types";
import { formatDueDate, isOverdue } from "../lib/dates";
import { TODO_DRAG_MIME } from "../lib/dragTypes";

interface TaskRowProps {
  todo: Todo;
  subtasks: TodoSubtask[];
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (id: string) => void;
  onOpen: (id: string) => void;
}

export function TaskRow({ todo, subtasks, onToggleComplete, onToggleSubtask, onOpen }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const open = subtasks.filter((s) => !s.checked).length;
  const overdue = !!todo.due_date && !todo.completed && isOverdue(todo.due_date);

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
          {(todo.description || subtasks.length > 0) && (
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#64748b" }}>
              {!!todo.description && <DescriptionIcon />}
              {subtasks.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <SubtaskIcon />
                  {open}
                </span>
              )}
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
        {subtasks.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
            aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 12,
              cursor: "pointer",
              padding: 4,
              flexShrink: 0,
            }}
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}
      </div>
      {expanded && subtasks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 34 }}>
          {subtasks.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 8,
                background: "#0b1220",
                border: "1px solid #1e293b",
              }}
            >
              <button
                onClick={() => onToggleSubtask(s.id)}
                aria-label={s.checked ? "Mark subtask incomplete" : "Mark subtask complete"}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  border: `2px solid ${s.checked ? "#22c55e" : "#334155"}`,
                  background: s.checked ? "#22c55e" : "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: s.checked ? "#475569" : "#cbd5e1",
                  textDecoration: s.checked ? "line-through" : "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
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
