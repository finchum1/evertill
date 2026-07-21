import { LIST_COLOR_HEX } from "../types";
import type { Todo, TodoFolder, TodoList, View } from "../types";
import { todayKey } from "../lib/dates";

interface SidebarProps {
  folders: TodoFolder[];
  lists: TodoList[];
  todos: Todo[];
  view: View;
  onSetView: (view: View) => void;
  onAddFolder: () => void;
  onAddList: (folderId: string | null) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

export function Sidebar({
  folders,
  lists,
  todos,
  view,
  onSetView,
  onAddFolder,
  onAddList,
  onRenameList,
  onDeleteList,
  onRenameFolder,
  onDeleteFolder,
}: SidebarProps) {
  const tkey = todayKey();
  const todayCount = todos.filter((t) => !t.completed && t.due_date && t.due_date <= tkey).length;
  const upcomingCount = todos.filter((t) => !t.completed && t.due_date && t.due_date > tkey).length;

  const inbox = lists.find((l) => l.is_inbox);
  const unfiledLists = lists.filter((l) => !l.folder_id && !l.is_inbox);

  function listRow(list: TodoList) {
    const isActive = view === list.id;
    const count = todos.filter((t) => t.list_id === list.id && !t.completed).length;
    return (
      <div key={list.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => onSetView(list.id)} style={navButtonStyle(isActive)}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {!list.is_inbox && (
              <span style={{ width: 8, height: 8, borderRadius: 99, background: LIST_COLOR_HEX[list.color], flexShrink: 0 }} />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.name}</span>
          </span>
          {count > 0 && <span style={{ fontSize: 11, color: isActive ? "#e0e7ff" : "#475569" }}>{count}</span>}
        </button>
        {!list.is_inbox && (
          <button
            title="Rename or delete list"
            onClick={() => {
              const action = window.prompt(`"${list.name}" — type "delete" to delete, or type a new name to rename:`, list.name);
              if (action === null) return;
              if (action.trim().toLowerCase() === "delete") {
                if (window.confirm(`Delete list "${list.name}" and all its tasks? This can't be undone.`)) {
                  onDeleteList(list.id);
                }
              } else if (action.trim()) {
                onRenameList(list.id, action.trim());
              }
            }}
            style={menuButtonStyle}
          >
            ⋯
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid #1e293b",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <button onClick={() => onSetView("today")} style={navButtonStyle(view === "today")}>
        <span>Today</span>
        {todayCount > 0 && <span style={{ fontSize: 11, color: view === "today" ? "#e0e7ff" : "#475569" }}>{todayCount}</span>}
      </button>
      <button onClick={() => onSetView("upcoming")} style={navButtonStyle(view === "upcoming")}>
        <span>Upcoming</span>
        {upcomingCount > 0 && <span style={{ fontSize: 11, color: view === "upcoming" ? "#e0e7ff" : "#475569" }}>{upcomingCount}</span>}
      </button>

      {inbox && (
        <div style={{ marginTop: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #1e293b" }}>
          {listRow(inbox)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Lists
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button title="New list" onClick={() => onAddList(null)} style={smallIconButtonStyle}>
            +
          </button>
          <button title="New folder" onClick={onAddFolder} style={smallIconButtonStyle}>
            📁
          </button>
        </div>
      </div>

      {folders.map((folder) => (
        <div key={folder.id} style={{ marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {folder.name.toUpperCase()}
            </span>
            <button title="Add list to this folder" onClick={() => onAddList(folder.id)} style={smallIconButtonStyle}>
              +
            </button>
            <button
              title="Rename or delete folder"
              onClick={() => {
                const action = window.prompt(`"${folder.name}" — type "delete" to delete (lists move to Unfiled), or type a new name to rename:`, folder.name);
                if (action === null) return;
                if (action.trim().toLowerCase() === "delete") {
                  if (window.confirm(`Delete folder "${folder.name}"? Its lists will become unfiled, not deleted.`)) {
                    onDeleteFolder(folder.id);
                  }
                } else if (action.trim()) {
                  onRenameFolder(folder.id, action.trim());
                }
              }}
              style={menuButtonStyle}
            >
              ⋯
            </button>
          </div>
          {lists.filter((l) => l.folder_id === folder.id).map(listRow)}
        </div>
      ))}

      {unfiledLists.map(listRow)}
    </div>
  );
}

function navButtonStyle(active: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    background: active ? "#4f46e5" : "transparent",
    color: active ? "#fff" : "#cbd5e1",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left" as const,
  };
}

const menuButtonStyle = {
  background: "none",
  border: "none",
  color: "#475569",
  fontSize: 14,
  cursor: "pointer",
  padding: "4px 6px",
  flexShrink: 0,
};

const smallIconButtonStyle = {
  background: "none",
  border: "none",
  color: "#475569",
  fontSize: 13,
  cursor: "pointer",
  padding: "2px 4px",
};
