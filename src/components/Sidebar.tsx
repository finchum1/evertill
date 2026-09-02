import { useState } from "react";
import type { CSSProperties } from "react";
import { LIST_COLOR_HEX } from "../types";
import type { CompletionToast, ListColor, Todo, TodoFolder, TodoList, View } from "../types";
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
  toasts: CompletionToast[];
  onUndoComplete: (toastId: string) => void;
  // When true, renders a narrow icon-only rail instead of the full nav —
  // driven by CollapsibleSidebar in App.tsx. Folders/rename/delete/drag
  // aren't available in this mode (no room for them); lists are flattened
  // into plain color-dot buttons since folder grouping needs a text
  // header this width can't show.
  collapsed?: boolean;
  // Drag-resized width in px (only applies while expanded — the collapsed
  // rail above stays a fixed 52px). Falls back to 240 (the original fixed
  // width) if omitted, so this stays optional for any future caller.
  // "100%" is for ListsSlotButton's phone-width Lists sheet (App.tsx),
  // which wants this to fill the sheet rather than render at some
  // persisted desktop drag-width.
  width?: number | "100%";
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
  toasts,
  onUndoComplete,
  collapsed,
  width,
}: SidebarProps) {
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

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

  if (collapsed) {
    const unfiledIcon = lists.filter((l) => !l.is_inbox);
    return (
      <nav
        aria-label="Tasks sidebar"
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
        <button onClick={onNewTask} title="Add Task" aria-label="Add Task" style={iconRailButtonStyle(false)}>
          <AddTaskPlusIcon />
        </button>
        {inbox && (
          <button onClick={() => onSetView(inbox.id)} title="Inbox" aria-label="Inbox" style={iconRailButtonStyle(view === inbox.id)}>
            <InboxNavIcon />
          </button>
        )}
        {unfiledIcon.length > 0 && <div style={railDividerStyle} />}
        {unfiledIcon.map((list) => (
          <button key={list.id} onClick={() => onSetView(list.id)} title={list.name} aria-label={list.name} style={iconRailButtonStyle(view === list.id)}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: LIST_COLOR_HEX[list.color], flexShrink: 0 }} />
          </button>
        ))}
        <CompletionToastStack toasts={toasts} onUndo={onUndoComplete} />
      </nav>
    );
  }

  return (
    <nav
      aria-label="Tasks sidebar"
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
      <button onClick={onNewTask} style={newTaskButtonStyle}>
        <AddTaskPlusIcon />
        Add Task
      </button>
      {inbox && (
        <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>{listRow(inbox)}</div>
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
            <FolderIcon />
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
            <button title="Add list to this folder" aria-label="Add list to this folder" onClick={() => onAddList(folder.id)} style={smallIconButtonStyle}>
              +
            </button>
            <ListMenu
              name={folder.name}
              onRename={(name) => onRenameFolder(folder.id, name)}
              onDelete={() => onDeleteFolder(folder.id)}
              deleteMessage={`Delete folder "${folder.name}"? Its lists will become unfiled, not deleted.`}
            />
          </div>
          {lists.filter((l) => l.folder_id === folder.id).map(listRow)}
        </div>
      ))}

      {unfiledLists.map(listRow)}
      <CompletionToastStack toasts={toasts} onUndo={onUndoComplete} />
    </nav>
  );
}

// Fixed to the bottom-left of the viewport (under the sidebar's own
// horizontal padding) rather than relying on the sidebar's own box being a
// specific height — each completion pushes its own independently-timed
// entry, so completing several tasks quickly stacks several toasts rather
// than one replacing another.
function CompletionToastStack({ toasts, onUndo }: { toasts: CompletionToast[]; onUndo: (toastId: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={toastStackStyle}>
      {toasts.map((toast) => (
        <div key={toast.id} style={toastStyle}>
          <span style={{ flexShrink: 0, color: "var(--accent)", display: "flex" }}>
            <ToastCheckIcon />
          </span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>
            {toast.title || "Untitled task"}
          </span>
          <button onClick={() => onUndo(toast.id)} style={undoButtonStyle}>
            Undo
          </button>
        </div>
      ))}
    </div>
  );
}

function ToastCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8.2L7 10.2L11 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const toastStackStyle: CSSProperties = {
  position: "fixed",
  left: 12,
  bottom: 16,
  width: 216,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  zIndex: 60,
};

const toastStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  background: "var(--bg-panel)",
  border: "1px solid var(--border)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  fontSize: 12,
};

const undoButtonStyle: CSSProperties = {
  flexShrink: 0,
  background: "none",
  border: "none",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

const newTaskButtonStyle: CSSProperties = {
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

// A boxed "+" (border + glyph both currentColor, so it always matches the
// button's own accent-colored text in either theme) instead of a plain
// plus-sign character — same fixed-slot convention as the nav icons above.
function AddTaskPlusIcon() {
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

const smallIconButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 13,
  cursor: "pointer",
  padding: "4px 6px",
  minWidth: 24,
  minHeight: 24,
};

// A fixed 18x18 slot matching Inbox's own <svg width={18} height={18}> — so
// AddTaskPlusIcon's smaller 14x14 chip still reports the same content
// height to its flex row instead of making that one row a few px shorter
// than an Inbox/list row, breaking the sidebar's vertical rhythm.
const iconSlotStyle: CSSProperties = {
  width: 18,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

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

// Same plain currentColor line-icon treatment as the nav icons above,
// replacing the old folder emoji so the "New folder" trigger matches the
// rest of the sidebar's icon language instead of standing out on its own.
function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3H6.5L8 4.5H12.5C13.33 4.5 14 5.17 14 6V11.5C14 12.33 13.33 13 12.5 13H3.5C2.67 13 2 12.33 2 11.5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
