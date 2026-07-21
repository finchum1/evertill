import { useState } from "react";
import type { CSSProperties } from "react";
import type { Recurrence, Todo, TodoList, TodoSubtask } from "../types";

interface TaskModalProps {
  todo: Todo;
  lists: TodoList[];
  subtasks: TodoSubtask[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Todo>) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
}

export function TaskModal({
  todo,
  lists,
  subtasks,
  onClose,
  onUpdate,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskModalProps) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [newSubtask, setNewSubtask] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const openSubtasks = subtasks.filter((s) => !s.checked);
  const doneSubtasks = subtasks.filter((s) => s.checked);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 8, 23, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== todo.title && onUpdate(todo.id, { title: title.trim() })}
          style={{ ...inputStyle, fontSize: 18, fontWeight: 700, border: "none", padding: "4px 0" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            List
            <select
              value={todo.list_id}
              onChange={(e) => onUpdate(todo.id, { list_id: e.target.value })}
              style={inputStyle}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Due date
            <input
              type="date"
              value={todo.due_date ?? ""}
              onChange={(e) => onUpdate(todo.id, { due_date: e.target.value || null })}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Repeat
          <select
            value={todo.recurrence}
            onChange={(e) => onUpdate(todo.id, { recurrence: e.target.value as Recurrence })}
            style={inputStyle}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label style={labelStyle}>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (todo.description ?? "") && onUpdate(todo.id, { description })}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </label>

        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Subtasks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {openSubtasks.map((s) => (
              <SubtaskRow key={s.id} subtask={s} onToggle={onToggleSubtask} onDelete={onDeleteSubtask} />
            ))}
            {doneSubtasks.length > 0 && (
              <>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", textAlign: "left", padding: "4px 0" }}
                >
                  {showCompleted ? "Hide" : "Show"} {doneSubtasks.length} completed
                </button>
                {showCompleted && doneSubtasks.map((s) => (
                  <SubtaskRow key={s.id} subtask={s} onToggle={onToggleSubtask} onDelete={onDeleteSubtask} />
                ))}
              </>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSubtask.trim()) return;
              onAddSubtask(todo.id, newSubtask.trim());
              setNewSubtask("");
            }}
            style={{ display: "flex", gap: 8, marginTop: 8 }}
          >
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a subtask…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" style={smallPrimaryButtonStyle}>
              Add
            </button>
          </form>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={ghostButtonStyle}>
            Close
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${todo.title}"? This can't be undone.`)) {
                onDelete(todo.id);
                onClose();
              }
            }}
            style={dangerButtonStyle}
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
}

function SubtaskRow({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: TodoSubtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => onToggle(subtask.id)}
        style={{
          width: 15,
          height: 15,
          borderRadius: 99,
          border: `2px solid ${subtask.checked ? "#22c55e" : "#334155"}`,
          background: subtask.checked ? "#22c55e" : "transparent",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: subtask.checked ? "#475569" : "#cbd5e1",
          textDecoration: subtask.checked ? "line-through" : "none",
        }}
      >
        {subtask.title}
      </span>
      <button onClick={() => onDelete(subtask.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13 }}>
        ×
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  padding: "8px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const ghostButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "#ef4444",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
  flex: 1,
};

const smallPrimaryButtonStyle: CSSProperties = {
  background: "#4f46e5",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
};
