import type { CSSProperties } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { ListColor, Note, NoteFolder } from "../types";
import { ListMenu } from "./ListMenu";

interface NotesSidebarProps {
  folders: NoteFolder[];
  notes: Note[];
  view: "all" | string;
  onSetView: (view: "all" | string) => void;
  onAddFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onSetFolderColor: (id: string, color: ListColor) => void;
  onDeleteFolder: (id: string) => void;
}

// Far simpler than Tasks' Sidebar.tsx — no lists tier, no drag-and-drop
// reordering (deferred, same as every other module's first pass). "All
// Notes" is the pinned default view, analogous to Today, showing every
// note including unfiled ones.
export function NotesSidebar({ folders, notes, view, onSetView, onAddFolder, onRenameFolder, onSetFolderColor, onDeleteFolder }: NotesSidebarProps) {
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        padding: "12px 12px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <button onClick={() => onSetView("all")} style={navButtonStyle(view === "all")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <AllNotesIcon />
          <span>All Notes</span>
        </span>
        {notes.length > 0 && <span style={{ fontSize: 11, color: view === "all" ? "#fff" : "var(--text-muted)" }}>{notes.length}</span>}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 10px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Folders
        </span>
        <button title="New folder" onClick={onAddFolder} style={smallIconButtonStyle}>
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
    </div>
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

const smallIconButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 13,
  cursor: "pointer",
  padding: "2px 4px",
};
