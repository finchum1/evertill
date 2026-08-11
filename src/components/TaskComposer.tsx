import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { Recurrence, TodoList } from "../types";
import { SmartDateInput } from "./SmartDateInput";
import { DatePickerField } from "./DatePickerField";

interface TaskComposerProps {
  lists: TodoList[];
  listId: string;
  onListChange: (id: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  dueDate: string | null;
  onDueDateChange: (v: string | null) => void;
  recurrence: Recurrence;
  onRecurrenceChange: (r: Recurrence) => void;
  // Optional — only Quick Add wires these through. Omitting them (the
  // other TaskComposer call sites: Day view's inline composer, Upcoming,
  // list-view composers) hides the time row entirely rather than showing
  // it with nothing wired up.
  dueTime?: string | null;
  onDueTimeChange?: (v: string | null) => void;
  durationMinutes?: number | null;
  onDurationMinutesChange?: (v: number | null) => void;
  subtaskTitles: string[];
  onAddSubtaskTitle: (title: string) => void;
  onRemoveSubtaskTitle: (index: number) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel?: string;
  autoFocus?: boolean;
  style?: CSSProperties;
}

// The pill-based "Task name / Description / Date pill / list-and-actions
// footer" body shared by the centered QuickAddTaskModal and the inline
// composer that opens in place at the top of a list/Today/Upcoming view —
// only the surrounding wrapper (fixed overlay vs. an ordinary bordered box
// in the page flow) differs between the two call sites.
export function TaskComposer({
  lists,
  listId,
  onListChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  dueDate,
  onDueDateChange,
  recurrence,
  onRecurrenceChange,
  dueTime,
  onDueTimeChange,
  durationMinutes,
  onDurationMinutesChange,
  subtaskTitles,
  onAddSubtaskTitle,
  onRemoveSubtaskTitle,
  onCancel,
  onSubmit,
  submitLabel = "Add task",
  autoFocus,
  style,
}: TaskComposerProps) {
  const selectedList = lists.find((l) => l.id === listId);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState("");

  function submitSubtask() {
    const t = subtaskInput.trim();
    if (t) onAddSubtaskTitle(t);
    setSubtaskInput("");
    setAddingSubtask(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "20px 20px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        ...style,
      }}
    >
      <SmartDateInput
        required
        autoFocus={autoFocus}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Task name"
        style={titleInputStyle}
      />
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Description"
        rows={2}
        style={descriptionInputStyle}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
        <DatePickerField
          value={dueDate}
          onChange={onDueDateChange}
          recurrence={recurrence}
          onRecurrenceChange={onRecurrenceChange}
          dueTime={dueTime}
          onDueTimeChange={onDueTimeChange}
          durationMinutes={durationMinutes}
          onDurationMinutesChange={onDurationMinutesChange}
        />
      </div>

      {subtaskTitles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {subtaskTitles.map((t, i) => (
            <div key={i} style={subtaskRowStyle}>
              <SubtaskCheckIcon />
              <span style={{ flex: 1 }}>{t}</span>
              <button type="button" onClick={() => onRemoveSubtaskTitle(i)} aria-label={`Remove subtask "${t}"`} style={subtaskRemoveButtonStyle}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {addingSubtask ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <SubtaskCheckIcon />
          <input
            autoFocus
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSubtask();
              } else if (e.key === "Escape") {
                setSubtaskInput("");
                setAddingSubtask(false);
              }
            }}
            placeholder="Subtask name"
            style={subtaskInputStyle}
          />
          <button type="button" onClick={submitSubtask} style={subtaskAddButtonStyle}>
            Add
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAddingSubtask(true)} style={addSubtaskButtonStyle}>
          <PlusIcon />
          Add subtask
        </button>
      )}

      <div style={dividerStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ position: "relative" }}>
          <div style={listPillStyle}>
            <ListIcon />
            {selectedList?.is_inbox ? "Inbox" : selectedList?.name ?? "List"}
            <ChevronIcon />
          </div>
          <select value={listId} onChange={(e) => onListChange(e.target.value)} style={listSelectOverlayStyle}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.is_inbox ? "Inbox" : l.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={ghostButtonStyle}>
            Cancel
          </button>
          <button type="submit" style={primaryButtonStyle}>
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
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
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function SubtaskCheckIcon() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 99,
        border: "2px solid var(--border-strong)",
        flexShrink: 0,
      }}
    />
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
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 14,
  padding: "8px 10px",
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

const addSubtaskButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: 13,
  fontWeight: 600,
  padding: "4px 2px",
  cursor: "pointer",
};

const subtaskRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--text-body)",
  padding: "2px 2px",
};

const subtaskRemoveButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
};

const subtaskInputStyle: CSSProperties = {
  flex: 1,
  background: "none",
  border: "none",
  borderBottom: "1px solid var(--border-strong)",
  borderRadius: 0,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "4px 0",
  outline: "none",
  fontFamily: "inherit",
};

const subtaskAddButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 14px",
  cursor: "pointer",
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
