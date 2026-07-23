import { useState } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { ListColor, Todo, TodoFolder, TodoList, View } from "../types";
import { todayKey } from "../lib/dates";
import { TODO_DRAG_MIME, TODO_FOLDER_DRAG_MIME, TODO_LIST_DRAG_MIME } from "../lib/dragTypes";
import { ListMenu } from "./ListMenu";

interface SidebarProps {
  folders: TodoFolder[];
  lists: TodoList[];
  todos: Todo[];
  view: View;
  onSetView: (view: View) => void;
  onAddFolder: () => void;
  onAddList: (folderId: string | null) => void;
  onRenameList: (id: string, name: string) => void;
  onSetListColor: (id: string, color: ListColor) => void;
  onDeleteList: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDropTodoOnList: (todoId: string, listId: string) => void;
  onMoveListToFolder: (id: string, folderId: string | null) => void;
  onReorderLists: (orderedIds: string[]) => void;
  onReorderFolders: (orderedIds: string[]) => void;
  onNewTask: () => void;
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
  onSetListColor,
  onDeleteList,
  onRenameFolder,
  onDeleteFolder,
  onDropTodoOnList,
  onMoveListToFolder,
  onReorderLists,
  onReorderFolders,
  onNewTask,
}: SidebarProps) {
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const tkey = todayKey();
  const todayCount = todos.filter((t) => !t.completed && t.due_date && t.due_date <= tkey).length;
  const upcomingCount = todos.filter((t) => !t.completed && t.due_date && t.due_date > tkey).length;

  const inbox = lists.find((l) => l.is_inbox);
  const unfiledLists = lists.filter((l) => !l.folder_id && !l.is_inbox);

  // Dropping a list onto another list reorders within the same bucket
  // (folder, or unfiled) if they share it, or moves the dragged list into
  // the target's bucket otherwise — appended in whatever position the
  // target list currently sits, not a precise insert-before/after.
  function handleReorderList(draggedId: string, targetId: string) {
    const dragged = lists.find((l) => l.id === draggedId);
    const target = lists.find((l) => l.id === targetId);
    if (!dragged || !target || draggedId === targetId) return;
    if (dragged.folder_id !== target.folder_id) {
      onMoveListToFolder(draggedId, target.folder_id);
      return;
    }
    const bucket = lists.filter((l) => l.folder_id === dragged.folder_id && !l.is_inbox);
    const withoutDragged = bucket.filter((l) => l.id !== draggedId);
    const targetIndex = withoutDragged.findIndex((l) => l.id === targetId);
    withoutDragged.splice(targetIndex, 0, dragged);
    onReorderLists(withoutDragged.map((l) => l.id));
  }

  function handleReorderFolder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const dragged = folders.find((f) => f.id === draggedId);
    if (!dragged) return;
    const withoutDragged = folders.filter((f) => f.id !== draggedId);
    const targetIndex = withoutDragged.findIndex((f) => f.id === targetId);
    if (targetIndex < 0) return;
    withoutDragged.splice(targetIndex, 0, dragged);
    onReorderFolders(withoutDragged.map((f) => f.id));
  }

  function listRow(list: TodoList) {
    const isActive = view === list.id;
    const isDragOver = dragOverListId === list.id;
    const count = todos.filter((t) => t.list_id === list.id && !t.completed).length;
    return (
      <div key={list.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          draggable={!list.is_inbox}
          onDragStart={(e) => {
            e.dataTransfer.setData(TODO_LIST_DRAG_MIME, list.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onSetView(list.id)}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(TODO_DRAG_MIME) || e.dataTransfer.types.includes(TODO_LIST_DRAG_MIME)) {
              e.preventDefault();
            }
          }}
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes(TODO_DRAG_MIME) || e.dataTransfer.types.includes(TODO_LIST_DRAG_MIME)) {
              setDragOverListId(list.id);
            }
          }}
          onDragLeave={() => setDragOverListId((cur) => (cur === list.id ? null : cur))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverListId(null);
            const todoId = e.dataTransfer.getData(TODO_DRAG_MIME);
            if (todoId) {
              onDropTodoOnList(todoId, list.id);
              return;
            }
            const draggedListId = e.dataTransfer.getData(TODO_LIST_DRAG_MIME);
            if (draggedListId) handleReorderList(draggedListId, list.id);
          }}
          style={{
            ...navButtonStyle(isActive),
            cursor: list.is_inbox ? "pointer" : "grab",
            ...(isDragOver ? { boxShadow: "inset 0 2px 0 0 var(--accent)" } : {}),
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {!list.is_inbox && (
              <span style={{ width: 8, height: 8, borderRadius: 99, background: LIST_COLOR_HEX[list.color], flexShrink: 0 }} />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{list.name}</span>
          </span>
          {count > 0 && <span style={{ fontSize: 11, color: isActive ? "#fff" : "var(--text-muted)" }}>{count}</span>}
        </button>
        {!list.is_inbox && (
          <ListMenu
            name={list.name}
            color={list.color}
            onRename={(name) => onRenameList(list.id, name)}
            onSetColor={(color) => onSetListColor(list.id, color)}
            onDelete={() => onDeleteList(list.id)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <button onClick={onNewTask} style={newTaskButtonStyle}>
        + New Task
      </button>
      <button onClick={() => onSetView("today")} style={navButtonStyle(view === "today")}>
        <span>Today</span>
        {todayCount > 0 && <span style={{ fontSize: 11, color: view === "today" ? "#fff" : "var(--text-muted)" }}>{todayCount}</span>}
      </button>
      <button onClick={() => onSetView("upcoming")} style={navButtonStyle(view === "upcoming")}>
        <span>Upcoming</span>
        {upcomingCount > 0 && <span style={{ fontSize: 11, color: view === "upcoming" ? "#fff" : "var(--text-muted)" }}>{upcomingCount}</span>}
      </button>
      <button onClick={() => onSetView("calendar")} style={navButtonStyle(view === "calendar")}>
        <span>Calendar</span>
      </button>

      {inbox && (
        <div style={{ marginTop: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
          {listRow(inbox)}
          <button onClick={() => onSetView("completed")} style={navButtonStyle(view === "completed")}>
            <span>Completed</span>
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TODO_FOLDER_DRAG_MIME, folder.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(TODO_LIST_DRAG_MIME) || e.dataTransfer.types.includes(TODO_FOLDER_DRAG_MIME)) {
                e.preventDefault();
              }
            }}
            onDragEnter={(e) => {
              if (e.dataTransfer.types.includes(TODO_LIST_DRAG_MIME) || e.dataTransfer.types.includes(TODO_FOLDER_DRAG_MIME)) {
                setDragOverFolderId(folder.id);
              }
            }}
            onDragLeave={() => setDragOverFolderId((cur) => (cur === folder.id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverFolderId(null);
              const draggedListId = e.dataTransfer.getData(TODO_LIST_DRAG_MIME);
              if (draggedListId) {
                onMoveListToFolder(draggedListId, folder.id);
                return;
              }
              const draggedFolderId = e.dataTransfer.getData(TODO_FOLDER_DRAG_MIME);
              if (draggedFolderId) handleReorderFolder(draggedFolderId, folder.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 8,
              cursor: "grab",
              ...(dragOverFolderId === folder.id ? { boxShadow: "inset 0 2px 0 0 var(--accent)" } : {}),
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

const newTaskButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: "8px 10px",
  marginBottom: 10,
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

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
    background: active ? "var(--accent-strong)" : "transparent",
    color: active ? "#fff" : "var(--text-body)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left" as const,
  };
}

const menuButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 14,
  cursor: "pointer",
  padding: "4px 6px",
  flexShrink: 0,
};

const smallIconButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 13,
  cursor: "pointer",
  padding: "2px 4px",
};
