import { useState } from "react";
import type { CSSProperties } from "react";
import type { Note, NoteFolder } from "../types";

interface NoteModalProps {
  note: Note;
  folders: NoteFolder[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

// Same overlay/card shell as TaskModal — title input + body textarea both
// save on blur (not a submit button), matching the established convention
// for text fields across this app.
export function NoteModal({ note, folders, onClose, onUpdate, onDelete }: NoteModalProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

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
          maxWidth: 520,
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
          onBlur={() => title.trim() && title !== note.title && onUpdate(note.id, { title: title.trim() })}
          style={titleInputStyle}
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => body !== note.body && onUpdate(note.id, { body })}
          rows={12}
          placeholder="Write a note…"
          style={bodyInputStyle}
        />

        <div style={dividerStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative" }}>
            <div style={folderPillStyle}>
              <FolderIcon />
              {folders.find((f) => f.id === note.folder_id)?.name ?? "No folder"}
              <ChevronIcon />
            </div>
            <select
              value={note.folder_id ?? ""}
              onChange={(e) => onUpdate(note.id, { folder_id: e.target.value || null })}
              style={folderSelectOverlayStyle}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
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
                if (window.confirm(`Delete "${note.title}"? This can't be undone.`)) {
                  onDelete(note.id);
                  onClose();
                }
              }}
              style={dangerButtonStyle}
            >
              Delete Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3H6.5L8 4.5H12.5C13.33 4.5 14 5.17 14 6V11.5C14 12.33 13.33 13 12.5 13H3.5C2.67 13 2 12.33 2 11.5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
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
  fontSize: 18,
  fontWeight: 700,
  padding: "4px 0",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const bodyInputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  lineHeight: 1.5,
  padding: "10px 12px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
  resize: "vertical" as const,
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: "var(--border)",
  margin: "2px 0",
};

const folderPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 700,
  padding: "6px 2px",
  cursor: "pointer",
};

const folderSelectOverlayStyle: CSSProperties = {
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
