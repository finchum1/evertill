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
            {list.is_inbox ? (
              <InboxNavIcon />
            ) : (
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
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <TodayNavIcon />
          <span>Today</span>
        </span>
        {todayCount > 0 && <span style={{ fontSize: 11, color: view === "today" ? "#fff" : "var(--text-muted)" }}>{todayCount}</span>}
      </button>
      <button onClick={() => onSetView("upcoming")} style={navButtonStyle(view === "upcoming")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <UpcomingNavIcon />
          <span>Upcoming</span>
        </span>
        {upcomingCount > 0 && <span style={{ fontSize: 11, color: view === "upcoming" ? "#fff" : "var(--text-muted)" }}>{upcomingCount}</span>}
      </button>
      <button onClick={() => onSetView("calendar")} style={navButtonStyle(view === "calendar")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <CalendarNavIcon />
          <span>Calendar</span>
        </span>
      </button>

      {inbox && (
        <div style={{ marginTop: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
          {listRow(inbox)}
          <button onClick={() => onSetView("completed")} style={navButtonStyle(view === "completed")}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <CompletedNavIcon />
              <span>Completed</span>
            </span>
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

// Today's icon shows the live date number (matching the reference: a
// "24"-style icon) — outlined rather than filled, same plain-icon visual
// weight as Upcoming/Calendar/Inbox below, just tinted its own fixed red
// instead of currentColor so it still reads as "Today" at a glance
// regardless of the row's active state. Recomputed on every render, so it
// stays correct across a day boundary without a timer.
function TodayNavIcon() {
  const day = new Date().getDate();
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: "1.4px solid var(--danger)",
        color: "var(--danger)",
        fontSize: 10,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {day}
    </span>
  );
}

// A calendar frame with a couple of thick agenda lines inside — reads as
// "a list of upcoming days," distinct from Calendar's own dot-grid icon
// below. Plain currentColor line icon (no fixed chip), so it recolors with
// the row's own active/inactive state same as the label text.
function UpcomingNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8H17" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 2.5V5.5M13 2.5V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.5 11H10.5M6.5 13.5H13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// A calendar frame with a small dot grid — reads as "a month view," distinct
// from Upcoming's list-style icon above. Same plain currentColor treatment.
function CalendarNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8H17" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 2.5V5.5M13 2.5V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="11.5" r="1" fill="currentColor" />
      <circle cx="10" cy="11.5" r="1" fill="currentColor" />
      <circle cx="13" cy="11.5" r="1" fill="currentColor" />
      <circle cx="7" cy="14.5" r="1" fill="currentColor" />
      <circle cx="10" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

// Inbox tray glyph (slanted funnel sides + a notched lip), matching the
// reference screenshot — plain currentColor, no fixed chip, same as Upcoming
// and Calendar's icons.
function InboxNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M3.5 9.5L5.3 4.3C5.45 3.85 5.87 3.5 6.35 3.5H13.65C14.13 3.5 14.55 3.85 14.7 4.3L16.5 9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 9.5V14.5C3.5 15.6 4.4 16.5 5.5 16.5H14.5C15.6 16.5 16.5 15.6 16.5 14.5V9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 9.5H7.3L8.1 11.2H11.9L12.7 9.5H16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Outlined rather than filled — same plain-icon treatment as the others —
// with the same checkmark glyph already used for a completed task's own
// checkbox (TaskRow's AnimatedCheckbox), tinted fixed green so it still
// reads as "Completed" regardless of the row's active state.
function CompletedNavIcon() {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: "1.4px solid var(--success)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5.2L4 7.7L8.5 2.3" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
