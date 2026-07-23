import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Recurrence, TodoList } from "../types";
import { parseSmartDueDate } from "../lib/smartDate";
import { SmartDateInput } from "./SmartDateInput";
import { DatePickerField } from "./DatePickerField";

interface QuickAddTaskModalProps {
  lists: TodoList[];
  onClose: () => void;
  onCreate: (listId: string, title: string, description: string, dueDate: string | null, recurrence: Recurrence) => void;
}

export function QuickAddTaskModal({ lists, onClose, onCreate }: QuickAddTaskModalProps) {
  const inbox = lists.find((l) => l.is_inbox);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState(inbox?.id ?? lists[0]?.id ?? "");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rawTitle = title.trim();
    if (!rawTitle || !listId) return;
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
    onCreate(listId, finalTitle, description.trim(), finalDueDate, recurrence);
  }

  const selectedList = lists.find((l) => l.id === listId);

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
          maxWidth: 480,
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "20px 20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <SmartDateInput
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task name"
          style={titleInputStyle}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
          style={descriptionInputStyle}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <DatePickerField value={dueDate} onChange={setDueDate} recurrence={recurrence} onRecurrenceChange={setRecurrence} />
        </div>

        <div style={dividerStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative" }}>
            <div style={listPillStyle}>
              <ListIcon />
              {selectedList?.is_inbox ? "Inbox" : selectedList?.name ?? "List"}
              <ChevronIcon />
            </div>
            <select value={listId} onChange={(e) => setListId(e.target.value)} style={listSelectOverlayStyle}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.is_inbox ? "Inbox" : l.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={ghostButtonStyle}>
              Cancel
            </button>
            <button type="submit" style={primaryButtonStyle}>
              Add task
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

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

const titleInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "none",
  color: "var(--text-primary)",
  fontSize: 17,
  fontWeight: 700,
  padding: "4px 0",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const descriptionInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "none",
  color: "var(--text-body)",
  fontSize: 14,
  padding: "0",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  resize: "none" as const,
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: "var(--border)",
  margin: "4px 0",
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

const primaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};
