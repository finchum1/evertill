import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { TodoList } from "../types";
import { parseSmartDueDate } from "../lib/smartDate";
import { openDatePicker } from "../lib/datePicker";

interface QuickAddTaskModalProps {
  lists: TodoList[];
  onClose: () => void;
  onCreate: (listId: string, title: string, dueDate: string | null) => void;
}

export function QuickAddTaskModal({ lists, onClose, onCreate }: QuickAddTaskModalProps) {
  const inbox = lists.find((l) => l.is_inbox);
  const [title, setTitle] = useState("");
  const [listId, setListId] = useState(inbox?.id ?? lists[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawTitle = title.trim();
    if (!rawTitle || !listId) return;
    let finalTitle = rawTitle;
    let finalDueDate = dueDate || null;
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
    onCreate(listId, finalTitle, finalDueDate);
  }

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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>New Task</h1>

        <label style={labelStyle}>
          Title
          <input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>
            List
            <select value={listId} onChange={(e) => setListId(e.target.value)} style={inputStyle}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.is_inbox ? "Inbox" : l.name}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} onClick={openDatePicker} style={inputStyle} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={ghostButtonStyle}>
            Cancel
          </button>
          <button type="submit" style={primaryButtonStyle}>
            Create task
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
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

const primaryButtonStyle: CSSProperties = {
  background: "#4f46e5",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};
