import type { CSSProperties } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { Note, NoteFolder } from "../types";

interface NotesListViewProps {
  view: "all" | string;
  folders: NoteFolder[];
  notes: Note[];
  onAddNote: () => void;
  onOpenNote: (id: string) => void;
}

// Mirrors TaskListView's visual shell (centered maxWidth column, ghost
// "+ Add" link, folder-badge-on-the-right-when-mixed pattern) — "+ Add
// note" creates a blank note and opens it directly in NoteModal rather
// than an inline composer, since a note has nothing worth prefilling
// (unlike a task's due date).
export function NotesListView({ view, folders, notes, onAddNote, onOpenNote }: NotesListViewProps) {
  const folder = view === "all" ? undefined : folders.find((f) => f.id === view);
  const heading = view === "all" ? "All Notes" : (folder?.name ?? "Folder");
  const shown = (view === "all" ? notes : notes.filter((n) => n.folder_id === view))
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 24px", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "min(1100px, 92%)", margin: "0 auto" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>{heading}</h1>

        <div style={{ marginBottom: 16 }}>
          <button type="button" onClick={onAddNote} style={addNoteButtonStyle}>
            <PlusIcon />
            Add note
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>No notes yet.</div>
          )}
          {shown.map((n) => (
            <NoteRow key={n.id} note={n} folder={view === "all" ? folders.find((f) => f.id === n.folder_id) : undefined} onOpen={onOpenNote} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteRow({ note, folder, onOpen }: { note: Note; folder?: NoteFolder; onOpen: (id: string) => void }) {
  const preview = note.body.trim().split("\n")[0]?.slice(0, 140) ?? "";
  return (
    <div
      onClick={() => onOpen(note.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg-panel)",
        cursor: "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {note.title || "Untitled note"}
        </span>
        {preview && (
          <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {preview}
          </span>
        )}
      </div>
      {folder && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            flexShrink: 0,
            maxWidth: 100,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 99, background: LIST_COLOR_HEX[folder.color], flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
        </span>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const addNoteButtonStyle: CSSProperties = {
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
