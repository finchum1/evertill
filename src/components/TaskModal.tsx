import { useState } from "react";
import type { CSSProperties } from "react";
import type { Recurrence, Todo, TodoList, TodoSubtask } from "../types";
import { DatePickerField } from "./DatePickerField";

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
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
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
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

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <DatePickerField
            value={todo.due_date}
            onChange={(due_date) => onUpdate(todo.id, { due_date })}
            recurrence={todo.recurrence}
            onRecurrenceChange={(recurrence: Recurrence) => onUpdate(todo.id, { recurrence })}
          />
        </div>

        <label style={labelStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            Description
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              title={descriptionExpanded ? "Collapse" : "Expand"}
              style={expandButtonStyle}
            >
              <ExpandIcon expanded={descriptionExpanded} />
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (todo.description ?? "") && onUpdate(todo.id, { description })}
            rows={descriptionExpanded ? 10 : 3}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </label>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Subtasks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {openSubtasks.map((s) => (
              <SubtaskRow key={s.id} subtask={s} onToggle={onToggleSubtask} onDelete={onDeleteSubtask} />
            ))}
            {doneSubtasks.length > 0 && (
              <>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", textAlign: "left", padding: "4px 0" }}
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

        <div style={dividerStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative" }}>
            <div style={listPillStyle}>
              <ListIcon />
              {lists.find((l) => l.id === todo.list_id)?.name ?? "List"}
              <ChevronIcon />
            </div>
            <select
              value={todo.list_id}
              onChange={(e) => onUpdate(todo.id, { list_id: e.target.value })}
              style={listSelectOverlayStyle}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
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
          border: `2px solid ${subtask.checked ? "var(--success)" : "var(--border-strong)"}`,
          background: subtask.checked ? "var(--success)" : "transparent",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: subtask.checked ? "var(--text-muted)" : "var(--text-body)",
          textDecoration: subtask.checked ? "line-through" : "none",
        }}
      >
        {subtask.title}
      </span>
      <button onClick={() => onDelete(subtask.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
        ×
      </button>
    </div>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? "rotate(180deg)" : "none" }}>
      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const expandButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 2,
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  padding: "8px 10px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const ghostButtonStyle: CSSProperties = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "var(--danger)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5H12M2 7H12M2 10.5H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const dividerStyle: CSSProperties = {
  height: 1,
  background: "var(--border)",
  margin: "2px 0",
};

const listPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 700,
  padding: "6px 2px",
  cursor: "pointer",
};

const listSelectOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0,
  cursor: "pointer",
  border: "none",
};

const smallPrimaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
};
