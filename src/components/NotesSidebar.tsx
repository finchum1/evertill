import type { CSSProperties } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { ListColor, Note, NoteFolder } from "../types";
import { ListMenu } from "./ListMenu";

interface NotesSidebarProps {
  folders: NoteFolder[];
  notes: Note[];
  view: "all" | "pinned" | string;
  onSetView: (view: "all" | "pinned" | string) => void;
  onAddNote: () => void;
  onAddFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onSetFolderColor: (id: string, color: ListColor) => void;
  onDeleteFolder: (id: string) => void;
  // When true, renders a narrow icon-only rail instead of the full nav —
  // driven by CollapsibleSidebar in App.tsx, same pattern as Sidebar.tsx.
  collapsed?: boolean;
  // Drag-resized width in px (expanded state only) — same pattern as
  // Sidebar.tsx, falls back to 240 if omitted. "100%" is for
  // ListsSlotButton's phone-width Lists sheet (App.tsx).
  width?: number | "100%";
}

// Far simpler than Tasks' Sidebar.tsx — no lists tier, no drag-and-drop
// reordering (deferred, same as every other module's first pass). "All
// Notes" is the pinned default view, analogous to Today, showing every
// note including unfiled ones.
export function NotesSidebar({ folders, notes, view, onSetView, onAddNote, onAddFolder, onRenameFolder, onSetFolderColor, onDeleteFolder, collapsed, width }: NotesSidebarProps) {
  if (collapsed) {
    return (
      <nav
        aria-label="Notes sidebar"
        style={{
          width: 52,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          padding: "12px 8px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        }}
      >
        <button onClick={onAddNote} title="Add Note" aria-label="Add Note" style={iconRailButtonStyle(false)}>
          <AddNotePlusIcon />
        </button>
        <button onClick={() => onSetView("all")} title="All Notes" aria-label="All Notes" style={iconRailButtonStyle(view === "all")}>
          <AllNotesIcon />
        </button>
        <button onClick={() => onSetView("pinned")} title="Pinned" aria-label="Pinned" style={iconRailButtonStyle(view === "pinned")}>
          <PinnedIcon />
        </button>
        {folders.length > 0 && <div style={railDividerStyle} />}
        {folders.map((folder) => (
          <button key={folder.id} onClick={() => onSetView(folder.id)} title={folder.name} aria-label={folder.name} style={iconRailButtonStyle(view === folder.id)}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: LIST_COLOR_HEX[folder.color], flexShrink: 0 }} />
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Notes sidebar"
      style={{
        width: width ?? 240,
        flexShrink: 0,
        // A divider against the sheet's own edge (rather than against
        // sibling page content, which is what this line exists to
        // separate from everywhere else) would just be a stray line.
        borderRight: width === "100%" ? "none" : "1px solid var(--border)",
        padding: "12px 12px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <button onClick={onAddNote} style={newNoteButtonStyle}>
        <AddNotePlusIcon />
        Add Note
      </button>
      <button onClick={() => onSetView("all")} style={navButtonStyle(view === "all")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <AllNotesIcon />
          <span>All Notes</span>
        </span>
        {notes.length > 0 && <span style={{ fontSize: 11, color: view === "all" ? "#fff" : "var(--text-muted)" }}>{notes.length}</span>}
      </button>

      <button onClick={() => onSetView("pinned")} style={navButtonStyle(view === "pinned")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <PinnedIcon />
          <span>Pinned</span>
        </span>
        {(() => {
          const pinnedCount = notes.filter((n) => n.pinned).length;
          return pinnedCount > 0 && <span style={{ fontSize: 11, color: view === "pinned" ? "#fff" : "var(--text-muted)" }}>{pinnedCount}</span>;
        })()}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 10px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Folders
        </span>
        <button title="New folder" aria-label="New folder" onClick={onAddFolder} style={smallIconButtonStyle}>
          +
        </button>
      </div>

      {folders.map((folder) => {
        const count = notes.filter((n) => n.folder_id === folder.id).length;
        const isActive = view === folder.id;
        return (
          <div key={folder.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => onSetView(folder.id)} style={navButtonStyle(isActive)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: LIST_COLOR_HEX[folder.color], flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
              </span>
              {count > 0 && <span style={{ fontSize: 11, color: isActive ? "#fff" : "var(--text-muted)" }}>{count}</span>}
            </button>
            <ListMenu
              name={folder.name}
              color={folder.color}
              itemNoun="notes"
              onRename={(name) => onRenameFolder(folder.id, name)}
              onSetColor={(color) => onSetFolderColor(folder.id, color)}
              onDelete={() => onDeleteFolder(folder.id)}
            />
          </div>
        );
      })}
    </nav>
  );
}

// A boxed "+" (border + glyph both currentColor) instead of a plain
// plus-sign character — matches Tasks' Sidebar.tsx "Add Task" button
// exactly (same style, same icon shape), just relabeled for Notes.
function AddNotePlusIcon() {
  return (
    <span style={iconSlotStyle}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: "1.4px solid currentColor",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

function PinnedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M8 4H12M8.5 4L8.8 9.2L6.5 11.5H13.5L11.2 9.2L11.5 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11.5V16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AllNotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M5.5 3.5H12.5L15.5 6.5V16.5H5.5C4.67 16.5 4 15.83 4 15V5C4 4.17 4.67 3.5 5.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.5 8H12.5M7.5 11H12.5M7.5 14H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function navButtonStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    background: active ? "var(--accent-strong)" : "transparent",
    color: active ? "#fff" : "var(--text-body)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  };
}

function iconRailButtonStyle(active: boolean): CSSProperties {
  return {
    width: 36,
    height: 36,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "none",
    background: active ? "var(--accent-strong)" : "transparent",
    color: active ? "#fff" : "var(--text-body)",
    cursor: "pointer",
  };
}

const railDividerStyle: CSSProperties = {
  width: 24,
  height: 1,
  background: "var(--border)",
  margin: "8px 0",
};

const smallIconButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 13,
  cursor: "pointer",
  padding: "4px 6px",
  minWidth: 24,
  minHeight: 24,
};

const iconSlotStyle: CSSProperties = {
  width: 18,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

// Same ghost/accent-colored style as Tasks' Sidebar.tsx "Add Task" button.
const newNoteButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  marginBottom: 10,
  borderRadius: 8,
  border: "none",
  background: "none",
  color: "var(--accent)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
