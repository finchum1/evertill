import { useEffect, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { useLeads } from "./hooks/useLeads";
import { usePipeline } from "./hooks/usePipeline";
import { useNotes } from "./hooks/useNotes";
import { Header } from "./components/Header";
import { TopNav } from "./components/TopNav";
import { Landing } from "./components/LandingPage";
import { AuthModal } from "./components/AuthModal";
import { Sidebar } from "./components/Sidebar";
import { TaskListView } from "./components/TaskListView";
import { TaskModal } from "./components/TaskModal";
import { CalendarView } from "./components/CalendarView";
import { NotesSidebar } from "./components/NotesSidebar";
import { NotesListView } from "./components/NotesListView";
import { NoteModal } from "./components/NoteModal";
import { LeadsBoard } from "./components/LeadsBoard";
import { LeadCardModal } from "./components/LeadCardModal";
import { LeadCardMini } from "./components/LeadCardMini";
import { PipelineBoard } from "./components/PipelineBoard";
import { PipelineCardModal } from "./components/PipelineCardModal";
import { PipelineCardMini } from "./components/PipelineCardMini";
import { ViewTabs, BOARD_VIEW_LABELS, DEFAULT_BOARD_VIEW_ORDER } from "./components/ViewTabs";
import type { BoardSubView } from "./components/ViewTabs";
import { todayKey } from "./lib/dates";
import { BoardListView } from "./components/BoardListView";
import { BoardValueView } from "./components/BoardValueView";
import { BoardCalendarView } from "./components/BoardCalendarView";
import { useDeals } from "./hooks/useDeals";
import { useDealTemplates } from "./hooks/useDealTemplates";
import { useTags } from "./hooks/useTags";
import { useTheme } from "./hooks/useTheme";
import { useProfile } from "./hooks/useProfile";
import { useGoogleCalendar } from "./hooks/useGoogleCalendar";
import type { Session } from "@supabase/supabase-js";
import { DealsBoard } from "./components/DealsBoard";
import { DealsListView } from "./components/DealsListView";
import { DealsStatCards } from "./components/DealsStatCards";
import { NewDealModal } from "./components/NewDealModal";
import { DealModal } from "./components/DealModal";
import { QuickAddTaskModal } from "./components/QuickAddTaskModal";
import { SettingsPage } from "./components/SettingsPage";
import { DialogsProvider, useDialogs } from "./components/DialogHost";
import { useIsMobile } from "./hooks/useMediaQuery";
import type { CreateType } from "./components/CreateMenu";
import { DEAL_STATUSES, DEAL_STATUS_LIST_COLOR } from "./types";
import type { CompletionToast, Deal, ListColor, Page, Tag, View } from "./types";

const DEALS_VIEW_ORDER: BoardSubView[] = ["list", "board", "calendar", "value"];

// Stable reference (not a fresh `[]` literal per render) so the redirect
// effect below can safely depend on `hiddenModules` without re-running on
// every render when no hidden_modules value has loaded yet.
const NO_HIDDEN_MODULES: string[] = [];

// Stable reference for a card with no tags — same reasoning as
// NO_HIDDEN_MODULES above, avoids a fresh `[]` literal on every render.
const EMPTY_TAG_IDS: string[] = [];

// Evertill is really two separate apps sharing one login and one
// database: a Tasks+Notes app and a Leads/Pipeline/Deals CRM app. Each
// gets its own URL (/ for Tasks, /crm for the CRM app) and its own
// TopNav scoped to only its own modules — no client-side router library,
// just reading/writing window.location directly, same hand-rolled
// approach this app already uses for Google's OAuth redirect (see
// useGoogleCalendar.ts's redirectUri/handleOAuthCallback). vercel.json's
// catch-all rewrite is what lets a direct visit or refresh on /crm serve
// this same index.html instead of 404ing.
type AppId = "tasks" | "crm";

function appIdFromPath(pathname: string): AppId {
  return pathname.startsWith("/crm") ? "crm" : "tasks";
}

const APP_CONFIG: Record<
  AppId,
  { path: string; otherAppLabel: string; navItems: { key: Page; label: string }[]; createTypes: CreateType[]; defaultPage: Page }
> = {
  tasks: {
    path: "/",
    otherAppLabel: "CRM",
    navItems: [
      { key: "tasks", label: "Tasks" },
      { key: "notes", label: "Notes" },
    ],
    createTypes: ["task", "note"],
    defaultPage: "tasks",
  },
  crm: {
    path: "/crm",
    otherAppLabel: "Tasks",
    navItems: [
      { key: "leads", label: "Leads" },
      { key: "pipeline", label: "Pipeline" },
      { key: "deals", label: "Deals" },
    ],
    createTypes: ["lead", "pipeline", "deal"],
    defaultPage: "leads",
  },
};

// The app has no responsive layout at all below desktop widths — Sidebar/
// NotesSidebar are a fixed 240px sitting in a flex row with the content,
// which just gets crushed on a narrow viewport. Below the breakpoint, this
// swaps that always-visible column for a hamburger toggle + an off-canvas
// drawer instead — the sidebar itself (Sidebar.tsx/NotesSidebar.tsx) is
// completely unchanged, just relocated into an overlay when isMobile is
// true. Shared by both TasksDashboard and NotesDashboard below.
function SidebarDrawer({ isMobile, label, children }: { isMobile: boolean; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  if (!isMobile) return <>{children}</>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Open ${label}`}
        style={{
          // sticky (not fixed) so it renders in normal flow right after
          // TopNav — no guessing TopNav's rendered height, which varies
          // since it wraps to 2-3 rows on narrow viewports (see
          // TopNav.tsx's flexWrap). It then sticks 12px from the viewport
          // top once the page scrolls past its natural position, keeping
          // it reachable without a hardcoded top offset that could overlap
          // whatever TopNav happens to render above it.
          position: "sticky",
          top: 12,
          alignSelf: "flex-start",
          margin: "12px 0 0 12px",
          zIndex: 20,
          width: 36,
          height: 36,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          color: "var(--text-body)",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}
      >
        <MenuIcon />
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
          <div
            onClick={() => setOpen(false)}
            aria-hidden
            style={{ position: "absolute", inset: 0, background: "rgba(2, 8, 23, 0.6)" }}
          />
          <div style={{ position: "relative", height: "100%", display: "flex", background: "var(--bg-app)", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
            {/* Still-visible trigger sitting behind this overlay (only the
                overlay itself is conditionally rendered — the trigger
                isn't hidden while open) would otherwise bleed through:
                neither Sidebar.tsx nor NotesSidebar.tsx sets its own
                opaque background, since normally the page's own root
                background already shows through correctly there. This one
                spot (the drawer panel) is the one place that assumption
                doesn't hold, so it gets its own explicit background
                instead of pushing that fix onto every current and future
                SidebarDrawer consumer individually. */}
            {children}
            <button
              onClick={() => setOpen(false)}
              aria-label={`Close ${label}`}
              style={{
                position: "absolute",
                top: 8,
                right: -44,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-panel)",
                border: "1px solid var(--border-strong)",
                borderRadius: 10,
                color: "var(--text-body)",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Desktop-only collapse for the Tasks/Notes sidebars — mobile already
// collapses by default behind SidebarDrawer's hamburger/overlay, a
// different pattern that doesn't need this too. `children` is expected to
// already be the icon-rail rendering when collapsed (Sidebar.tsx and
// NotesSidebar.tsx each take their own `collapsed` prop and switch their
// own layout, since a bare blank rail loses the nav icons entirely) — this
// wrapper's only job is floating the same reopen/collapse toggle button on
// the sidebar's right edge in both states, so the control itself never
// moves or disappears.
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 320;

// Adds a draggable resize handle to the sidebar's right edge, in addition
// to the existing collapse toggle — only rendered while expanded (the
// collapsed icon rail is a fixed 52px with nothing worth resizing). Drag
// state itself is plain closured locals inside the mousedown handler,
// same pattern as the Week view's hour-grid drag-to-create: no React
// state needed for the drag itself, since every mousemove just calls
// onWidthChange directly for live feedback and the caller (TasksDashboard/
// NotesDashboard) owns the actual persisted width.
function CollapsibleSidebar({
  collapsed,
  onToggle,
  label,
  width,
  onWidthChange,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
  width: number;
  onWidthChange: (width: number) => void;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const handleActive = dragging || hovering;

  function handleResizeStart(e: ReactMouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    setDragging(true);
    function onMove(ev: MouseEvent) {
      const next = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, startWidth + (ev.clientX - startX)));
      onWidthChange(next);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div style={{ position: "relative", display: "flex", flexShrink: 0 }}>
      {children}
      {!collapsed && (
        <div
          onMouseDown={handleResizeStart}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          title="Drag to resize"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: -3,
            width: 6,
            cursor: "col-resize",
            zIndex: 4,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 2,
              alignSelf: "stretch",
              borderRadius: 2,
              background: handleActive ? "var(--accent)" : "transparent",
              transition: dragging ? "none" : "background 120ms ease",
            }}
          />
        </div>
      )}
      <button
        onClick={onToggle}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        style={{ ...collapseToggleButtonStyle, position: "absolute", top: 12, right: -12 }}
      >
        <ChevronIcon direction={collapsed ? "right" : "left"} />
      </button>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d={direction === "left" ? "M7.5 2.5L3.5 6L7.5 9.5" : "M4.5 2.5L8.5 6L4.5 9.5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const collapseToggleButtonStyle = {
  width: 24,
  height: 24,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-strong)",
  borderRadius: 99,
  color: "var(--text-body)",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  zIndex: 5,
} as const;

type TasksData = ReturnType<typeof useTasks>;
type LeadsData = ReturnType<typeof useLeads>;
type PipelineData = ReturnType<typeof usePipeline>;
type DealsData = ReturnType<typeof useDeals>;
type DealTemplatesData = ReturnType<typeof useDealTemplates>;
type NotesData = ReturnType<typeof useNotes>;

// Tasks' own "smart view" switcher — Today/Upcoming/Calendar/Completed —
// used to live as four rows stacked inside Sidebar.tsx, directly below the
// app-level module switcher of the day (first a horizontal top nav, then
// a vertical rail, now a horizontal top nav again). Whatever shape that
// switcher took, stacking a *second* nav column of near-identical-looking
// rows directly beneath it read as one overlong, redundant nav — and,
// more importantly given this app's eventual iOS port, a persistent
// second sidebar has no real iPhone equivalent at all (iOS doesn't stack
// sidebars; even iPad only ever shows one). Moving these four into the
// same horizontal pill-tab pattern
// Leads/Pipeline/Deals' own ViewTabs already uses maps directly onto a
// segmented control, which iOS does have, and leaves Sidebar.tsx holding
// only what's genuinely sidebar-shaped: Lists (folders + custom lists,
// analogous to Mail.app's mailbox list) — Inbox included, since it's a
// real list like any other, not a smart filter.
type TasksView = "today" | "upcoming" | "calendar" | "completed";
const TASKS_VIEW_TABS: { key: TasksView; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "calendar", label: "Calendar" },
  { key: "completed", label: "Completed" },
];

function TasksViewTabs({
  view,
  onSetView,
  todayCount,
  upcomingCount,
}: {
  view: View;
  onSetView: (view: View) => void;
  todayCount: number;
  upcomingCount: number;
}) {
  const badges: Partial<Record<TasksView, number>> = { today: todayCount, upcoming: upcomingCount };
  return (
    <div style={{ padding: "20px 24px 0" }}>
      <ViewTabs tabs={TASKS_VIEW_TABS.map((t) => ({ ...t, badge: badges[t.key] }))} active={view} onChange={onSetView} />
    </div>
  );
}

function TasksDashboard({
  tasks,
  googleCalendarData,
  onNewTask,
}: {
  tasks: TasksData;
  googleCalendarData: ReturnType<typeof useGoogleCalendar>;
  onNewTask: () => void;
}) {
  const {
    folders,
    lists,
    todos,
    subtasks,
    loading,
    addFolder,
    renameFolder,
    deleteFolder,
    reorderFolders,
    addList,
    renameList,
    setListColor,
    reorderLists,
    moveListToFolder,
    deleteList,
    addTodo,
    updateTodo,
    toggleTodoComplete,
    deleteTodo,
    addSubtask,
    toggleSubtask,
    updateSubtask,
    deleteSubtask,
  } = tasks;

  const dialogs = useDialogs();
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("today");
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<CompletionToast[]>([]);
  // Badge counts for TasksViewTabs — moved up from Sidebar.tsx along with
  // Today/Upcoming themselves.
  const tkey = todayKey();
  const todayCount = todos.filter((t) => !t.completed && t.due_date && t.due_date <= tkey).length;
  const upcomingCount = todos.filter((t) => !t.completed && t.due_date && t.due_date > tkey).length;
  // Per-browser layout preference, not synced data — same lightweight
  // localStorage pattern as theme/accent in useTheme.ts.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("tasks-sidebar-collapsed") === "1"
  );
  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("tasks-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }
  // Draggable width, same per-browser localStorage pattern as the collapse
  // preference above, under its own key so it survives independently of
  // whether the sidebar happens to be collapsed.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 240;
    const stored = Number(localStorage.getItem("tasks-sidebar-width"));
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : 240;
  });
  function handleSidebarWidthChange(next: number) {
    setSidebarWidth(next);
    localStorage.setItem("tasks-sidebar-width", String(next));
  }

  // Clears any still-pending auto-dismiss timers if this dashboard unmounts
  // (e.g. navigating off the Tasks page) while a toast is showing.
  useEffect(() => {
    return () => {
      setToasts((prev) => {
        prev.forEach((t) => window.clearTimeout(t.timeoutId));
        return prev;
      });
    };
  }, []);

  function dismissToast(toastId: string) {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }

  // Only one wrapper needed: TaskListView (-> TaskRow) and CalendarView
  // (-> MiniCheckbox) are the only two places a top-level task gets marked
  // complete, and both already just call whatever onToggleComplete they're
  // given — so this single wrapper covers both with no changes needed in
  // either component.
  function handleToggleComplete(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (todo && !todo.completed) {
      // About to complete it (this also covers a recurring task's
      // roll-forward, which never actually sets completed=true — it just
      // advances due_date, so !todo.completed stays true every time).
      const toastId = `${id}-${Date.now()}`;
      const timeoutId = window.setTimeout(() => dismissToast(toastId), 4000);
      setToasts((prev) => [
        ...prev,
        { id: toastId, title: todo.title, todoId: id, prevCompleted: todo.completed, prevDueDate: todo.due_date, timeoutId },
      ]);
    }
    toggleTodoComplete(id);
  }

  // Snapshot-and-restore rather than "toggle again": toggleTodoComplete is
  // asymmetric for recurring tasks (checking one off advances due_date and
  // never sets completed), so calling it a second time wouldn't undo the
  // first click — it would advance the date again. Restoring the exact
  // prior completed/due_date directly handles both task kinds uniformly.
  function handleUndoComplete(toastId: string) {
    const toast = toasts.find((t) => t.id === toastId);
    if (!toast) return;
    window.clearTimeout(toast.timeoutId);
    updateTodo(toast.todoId, { completed: toast.prevCompleted, due_date: toast.prevDueDate });
    dismissToast(toastId);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openTodo = openTodoId ? todos.find((t) => t.id === openTodoId) : undefined;

  const sidebarElement = (
    <Sidebar
      folders={folders}
      lists={lists}
      todos={todos}
      view={view}
      onSetView={setView}
      onAddFolder={async () => {
        const name = await dialogs.prompt({ message: "Folder name:" });
        if (name) addFolder(name);
      }}
      onAddList={async (folderId) => {
        const name = await dialogs.prompt({ message: "List name:" });
        if (name) addList(name, folderId);
      }}
      onRenameList={renameList}
      onSetListColor={setListColor}
      onDeleteList={(id) => {
        if (view === id) setView("today");
        deleteList(id);
      }}
      onRenameFolder={renameFolder}
      onDeleteFolder={deleteFolder}
      onDropTodoOnList={(todoId, listId) => updateTodo(todoId, { list_id: listId })}
      onMoveListToFolder={moveListToFolder}
      onReorderLists={reorderLists}
      onReorderFolders={reorderFolders}
      onNewTask={onNewTask}
      toasts={toasts}
      onUndoComplete={handleUndoComplete}
      collapsed={!isMobile && sidebarCollapsed}
      width={sidebarWidth}
    />
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {isMobile ? (
        <SidebarDrawer isMobile={isMobile} label="Tasks sidebar">
          {sidebarElement}
        </SidebarDrawer>
      ) : (
        <CollapsibleSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebarCollapsed}
          label="Tasks sidebar"
          width={sidebarWidth}
          onWidthChange={handleSidebarWidthChange}
        >
          {sidebarElement}
        </CollapsibleSidebar>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TasksViewTabs view={view} onSetView={setView} todayCount={todayCount} upcomingCount={upcomingCount} />
        {view === "calendar" ? (
          <CalendarView
            todos={todos}
            lists={lists}
            subtasks={subtasks}
            googleCalendarData={googleCalendarData}
            onOpenTodo={setOpenTodoId}
            onToggleComplete={handleToggleComplete}
            onAddTodo={addTodo}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onEditSubtask={updateSubtask}
            onDeleteSubtask={deleteSubtask}
            onUpdateDueDate={(id, date) => updateTodo(id, { due_date: date })}
            onUpdateRecurrence={(id, recurrence) => updateTodo(id, { recurrence })}
            onDropTodoOnDate={(todoId, dateKey) => updateTodo(todoId, { due_date: dateKey })}
          />
        ) : (
          <TaskListView
            view={view}
            lists={lists}
            todos={todos}
            subtasks={subtasks}
            googleCalendarData={googleCalendarData}
            onAddTodo={addTodo}
            onToggleComplete={handleToggleComplete}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onEditSubtask={updateSubtask}
            onDeleteSubtask={deleteSubtask}
            onUpdateDueDate={(id, date) => updateTodo(id, { due_date: date })}
            onUpdateRecurrence={(id, recurrence) => updateTodo(id, { recurrence })}
            onOpenTodo={setOpenTodoId}
          />
        )}
      </div>
      {openTodo && (
        <TaskModal
          todo={openTodo}
          lists={lists}
          subtasks={subtasks.filter((s) => s.todo_id === openTodo.id)}
          onClose={() => setOpenTodoId(null)}
          onUpdate={updateTodo}
          onDelete={deleteTodo}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
        />
      )}
    </div>
  );
}

function NotesDashboard({ notes }: { notes: NotesData }) {
  const { folders, notes: allNotes, loading, addFolder, renameFolder, setFolderColor, deleteFolder, addNote, updateNote, deleteNote, togglePinned } = notes;

  const dialogs = useDialogs();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"all" | "pinned" | string>("all");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  // Same per-browser persisted collapse preference as Tasks' sidebar, kept
  // under its own storage key so the two modules' sidebars can be
  // collapsed independently.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("notes-sidebar-collapsed") === "1"
  );
  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("notes-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }
  // Same draggable-width pattern as Tasks' sidebar, own storage key.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 240;
    const stored = Number(localStorage.getItem("notes-sidebar-width"));
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : 240;
  });
  function handleSidebarWidthChange(next: number) {
    setSidebarWidth(next);
    localStorage.setItem("notes-sidebar-width", String(next));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openNote = openNoteId ? allNotes.find((n) => n.id === openNoteId) : undefined;

  const handleAddNote = async () => {
    const folderId = view === "all" || view === "pinned" ? null : view;
    const note = await addNote(folderId);
    if (note) setOpenNoteId(note.id);
  };

  const sidebarElement = (
    <NotesSidebar
      folders={folders}
      notes={allNotes}
      view={view}
      onSetView={setView}
      onAddNote={handleAddNote}
      onAddFolder={async () => {
        const name = await dialogs.prompt({ message: "Folder name:" });
        if (name) addFolder(name);
      }}
      onRenameFolder={renameFolder}
      onSetFolderColor={setFolderColor}
      onDeleteFolder={(id) => {
        if (view === id) setView("all");
        deleteFolder(id);
      }}
      collapsed={!isMobile && sidebarCollapsed}
      width={sidebarWidth}
    />
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {isMobile ? (
        <SidebarDrawer isMobile={isMobile} label="Notes sidebar">
          {sidebarElement}
        </SidebarDrawer>
      ) : (
        <CollapsibleSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebarCollapsed}
          label="Notes sidebar"
          width={sidebarWidth}
          onWidthChange={handleSidebarWidthChange}
        >
          {sidebarElement}
        </CollapsibleSidebar>
      )}
      <NotesListView
        view={view}
        folders={folders}
        notes={allNotes}
        onAddNote={handleAddNote}
        onOpenNote={setOpenNoteId}
        onTogglePinned={togglePinned}
      />
      {openNote && (
        <NoteModal
          note={openNote}
          folders={folders}
          onClose={() => setOpenNoteId(null)}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onTogglePinned={togglePinned}
        />
      )}
    </div>
  );
}

function LeadsDashboard({
  leads,
  tags,
  onCreateTag,
}: {
  leads: LeadsData;
  tags: Tag[];
  onCreateTag: (label: string, color: ListColor) => Promise<Tag | undefined>;
}) {
  const {
    columns,
    cards,
    notes,
    cardTagIds,
    loading,
    addColumn,
    renameColumn,
    setColumnColor,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    setCardTags,
    addNote,
    deleteNote,
  } = leads;

  const dialogs = useDialogs();
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("board");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined;
  const openCardSiblings = openCard ? cards.filter((c) => c.column_id === openCard.column_id) : [];
  const openCardIndex = openCard ? openCardSiblings.findIndex((c) => c.id === openCard.id) : -1;
  const prevCard = openCardIndex > 0 ? openCardSiblings[openCardIndex - 1] : undefined;
  const nextCard = openCardIndex >= 0 && openCardIndex < openCardSiblings.length - 1 ? openCardSiblings[openCardIndex + 1] : undefined;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <ViewTabs tabs={DEFAULT_BOARD_VIEW_ORDER.map((key) => ({ key, label: BOARD_VIEW_LABELS[key] }))} active={subView} onChange={setSubView} />
      </div>
      {subView === "board" && (
        <LeadsBoard
          columns={columns}
          cards={cards}
          tags={tags}
          cardTagIds={cardTagIds}
          onAddColumn={async () => {
            const label = await dialogs.prompt({ message: "Column name:" });
            if (label) addColumn(label);
          }}
          onRenameColumn={renameColumn}
          onSetColumnColor={setColumnColor}
          onDeleteColumn={deleteColumn}
          onAddCard={async (columnId) => {
            const card = await addCard(columnId);
            if (card) setOpenCardId(card.id);
          }}
          onOpenCard={setOpenCardId}
          onMoveCard={(cardId, columnId) => updateCard(cardId, { column_id: columnId })}
        />
      )}
      {subView === "list" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardListView columns={columns} cards={cards} itemNoun="lead" renderCard={(card) => (
            <LeadCardMini key={card.id} card={card} tags={tags} tagIds={cardTagIds[card.id] ?? EMPTY_TAG_IDS} onOpen={setOpenCardId} />
          )} />
        </div>
      )}
      {subView === "calendar" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardCalendarView cards={cards} onOpenCard={setOpenCardId} />
        </div>
      )}
      {subView === "value" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardValueView columns={columns} cards={cards} itemNoun="lead" />
        </div>
      )}
      {openCard && (
        <LeadCardModal
          key={openCard.id}
          card={openCard}
          columns={columns}
          notes={notes.filter((n) => n.card_id === openCard.id)}
          tags={tags}
          cardTagIds={cardTagIds[openCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={setCardTags}
          onCreateTag={onCreateTag}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onPrev={prevCard ? () => setOpenCardId(prevCard.id) : undefined}
          onNext={nextCard ? () => setOpenCardId(nextCard.id) : undefined}
        />
      )}
    </div>
  );
}

function PipelineDashboard({
  pipeline,
  tags,
  onCreateTag,
}: {
  pipeline: PipelineData;
  tags: Tag[];
  onCreateTag: (label: string, color: ListColor) => Promise<Tag | undefined>;
}) {
  const {
    columns,
    cards,
    notes,
    cardTagIds,
    loading,
    addColumn,
    renameColumn,
    setColumnColor,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    setCardTags,
    addNote,
    deleteNote,
  } = pipeline;

  const dialogs = useDialogs();

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("board");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined;
  const openCardSiblings = openCard ? cards.filter((c) => c.column_id === openCard.column_id) : [];
  const openCardIndex = openCard ? openCardSiblings.findIndex((c) => c.id === openCard.id) : -1;
  const prevCard = openCardIndex > 0 ? openCardSiblings[openCardIndex - 1] : undefined;
  const nextCard = openCardIndex >= 0 && openCardIndex < openCardSiblings.length - 1 ? openCardSiblings[openCardIndex + 1] : undefined;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <ViewTabs tabs={DEFAULT_BOARD_VIEW_ORDER.map((key) => ({ key, label: BOARD_VIEW_LABELS[key] }))} active={subView} onChange={setSubView} />
      </div>
      {subView === "board" && (
        <PipelineBoard
          columns={columns}
          cards={cards}
          tags={tags}
          cardTagIds={cardTagIds}
          onAddColumn={async () => {
            const label = await dialogs.prompt({ message: "Column name:" });
            if (label) addColumn(label);
          }}
          onRenameColumn={renameColumn}
          onSetColumnColor={setColumnColor}
          onDeleteColumn={deleteColumn}
          onAddCard={async (columnId) => {
            const card = await addCard(columnId);
            if (card) setOpenCardId(card.id);
          }}
          onOpenCard={setOpenCardId}
          onMoveCard={(cardId, columnId) => updateCard(cardId, { column_id: columnId })}
        />
      )}
      {subView === "list" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardListView columns={columns} cards={cards} itemNoun="client" renderCard={(card) => (
            <PipelineCardMini key={card.id} card={card} tags={tags} tagIds={cardTagIds[card.id] ?? EMPTY_TAG_IDS} onOpen={setOpenCardId} />
          )} />
        </div>
      )}
      {subView === "calendar" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardCalendarView cards={cards} onOpenCard={setOpenCardId} />
        </div>
      )}
      {subView === "value" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardValueView columns={columns} cards={cards} itemNoun="client" />
        </div>
      )}
      {openCard && (
        <PipelineCardModal
          key={openCard.id}
          card={openCard}
          columns={columns}
          notes={notes.filter((n) => n.card_id === openCard.id)}
          tags={tags}
          cardTagIds={cardTagIds[openCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={setCardTags}
          onCreateTag={onCreateTag}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onPrev={prevCard ? () => setOpenCardId(prevCard.id) : undefined}
          onNext={nextCard ? () => setOpenCardId(nextCard.id) : undefined}
        />
      )}
    </div>
  );
}

function DealsDashboard({
  dealsData,
  dealTemplatesData,
  onMoveDealToPipeline,
}: {
  dealsData: DealsData;
  dealTemplatesData: DealTemplatesData;
  onMoveDealToPipeline: (deal: Deal) => void;
}) {
  const {
    deals,
    notes,
    checklistItems,
    contactFields,
    loading,
    addDeal,
    updateDeal,
    deleteDeal,
    addNote,
    deleteNote,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    seedContactFields,
    ensureContactFields,
    addContactField,
    updateContactField,
    deleteContactField,
  } = dealsData;
  const { seedDealChecklist } = dealTemplatesData;

  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [subView, setSubView] = useState<BoardSubView>("list");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openDeal = openDealId ? deals.find((d) => d.id === openDealId) : undefined;

  // Flatten each deal's 4 milestone dates into synthetic calendar items so
  // the shared BoardCalendarView (built for one-due-date-per-item) can be
  // reused as-is instead of writing a bespoke Deals calendar.
  const milestoneItems = deals.flatMap((d) => {
    const milestones: { key: string; label: string; date: string | null }[] = [
      { key: "acceptance", label: "Acceptance", date: d.acceptance_date },
      { key: "inspection", label: "Inspection", date: d.inspection_date },
      { key: "appraisal", label: "Appraisal", date: d.appraisal_date },
      { key: "closing", label: "Closing", date: d.closing_date },
    ];
    return milestones
      .filter((m): m is { key: string; label: string; date: string } => !!m.date)
      .map((m) => ({ id: `${d.id}:${m.key}`, title: `${m.label}: ${d.address}`, due_date: m.date, dealId: d.id }));
  });

  // Statuses treated as pseudo-columns so the shared BoardValueView (built
  // for user-defined Lead/Pipeline columns) works for Deals' fixed statuses too.
  const statusColumns = DEAL_STATUSES.map((status) => ({ id: status, label: status, color: DEAL_STATUS_LIST_COLOR[status] }));
  const statusValueCards = deals.map((d) => ({ column_id: d.status, value: d.value }));

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Deals</h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>Every transaction you have access to.</p>
        </div>
        <button onClick={() => setShowNewDeal(true)} style={newDealButtonStyle}>
          + New Deal
        </button>
      </div>
      <DealsStatCards deals={deals} />
      <div style={{ padding: "0 24px" }}>
        <ViewTabs tabs={DEALS_VIEW_ORDER.map((key) => ({ key, label: BOARD_VIEW_LABELS[key] }))} active={subView} onChange={setSubView} />
      </div>
      {subView === "list" && <DealsListView deals={deals} checklistItems={checklistItems} onOpenDeal={setOpenDealId} />}
      {subView === "board" && <DealsBoard deals={deals} checklistItems={checklistItems} onOpenDeal={setOpenDealId} />}
      {subView === "calendar" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardCalendarView
            cards={milestoneItems}
            onOpenCard={(syntheticId) => {
              const item = milestoneItems.find((i) => i.id === syntheticId);
              if (item) setOpenDealId(item.dealId);
            }}
          />
        </div>
      )}
      {subView === "value" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardValueView columns={statusColumns} cards={statusValueCards} itemNoun="deal" />
        </div>
      )}
      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreate={async (address, type, acceptanceDate) => {
            const deal = await addDeal(address, type, acceptanceDate);
            setShowNewDeal(false);
            if (deal) {
              await Promise.all([seedDealChecklist(deal.id, deal.type), seedContactFields(deal.id)]);
              setOpenDealId(deal.id);
            }
          }}
        />
      )}
      {openDeal && (
        <DealModal
          deal={openDeal}
          notes={notes.filter((n) => n.deal_id === openDeal.id)}
          checklistItems={checklistItems.filter((i) => i.deal_id === openDeal.id)}
          contactFields={contactFields.filter((f) => f.deal_id === openDeal.id)}
          onClose={() => setOpenDealId(null)}
          onUpdate={updateDeal}
          onDelete={deleteDeal}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onAddChecklistItem={addChecklistItem}
          onToggleChecklistItem={toggleChecklistItem}
          onDeleteChecklistItem={deleteChecklistItem}
          onEnsureContactFields={ensureContactFields}
          onAddContactField={addContactField}
          onUpdateContactField={updateContactField}
          onDeleteContactField={deleteContactField}
          onMoveToPipeline={onMoveDealToPipeline}
        />
      )}
    </div>
  );
}

function PageContent({
  page,
  session,
  tasksData,
  leadsData,
  pipelineData,
  dealsData,
  dealTemplatesData,
  tagsData,
  notesData,
  profileData,
  theme,
  googleCalendarData,
  onNewTask,
  onMoveDealToPipeline,
}: {
  page: Page;
  session: Session;
  tasksData: TasksData;
  leadsData: LeadsData;
  pipelineData: PipelineData;
  dealsData: DealsData;
  dealTemplatesData: DealTemplatesData;
  tagsData: ReturnType<typeof useTags>;
  notesData: NotesData;
  profileData: ReturnType<typeof useProfile>;
  theme: ReturnType<typeof useTheme>;
  googleCalendarData: ReturnType<typeof useGoogleCalendar>;
  onNewTask: () => void;
  onMoveDealToPipeline: (deal: Deal) => void;
}) {
  switch (page) {
    case "tasks":
      return <TasksDashboard tasks={tasksData} googleCalendarData={googleCalendarData} onNewTask={onNewTask} />;
    case "leads":
      return <LeadsDashboard leads={leadsData} tags={tagsData.tags} onCreateTag={tagsData.addTag} />;
    case "pipeline":
      return <PipelineDashboard pipeline={pipelineData} tags={tagsData.tags} onCreateTag={tagsData.addTag} />;
    case "deals":
      return <DealsDashboard dealsData={dealsData} dealTemplatesData={dealTemplatesData} onMoveDealToPipeline={onMoveDealToPipeline} />;
    case "notes":
      return <NotesDashboard notes={notesData} />;
    case "settings":
      return (
        <SettingsPage
          session={session}
          profileData={profileData}
          theme={theme}
          dealTemplatesData={dealTemplatesData}
          tagsData={tagsData}
          googleCalendarData={googleCalendarData}
        />
      );
  }
}

function App() {
  const { session, loading } = useAuth();
  const [authModal, setAuthModal] = useState<"signin" | "signup" | null>(null);
  const [page, setPage] = useState<Page>("tasks");
  // Which of the two apps (Tasks+Notes vs Leads/Pipeline/Deals) is open —
  // derived from the URL at load, kept in sync with browser back/forward
  // via popstate, and pushed via switchApp below on an explicit switch (no
  // full page reload, same in-memory session/data either way).
  const [appId, setAppId] = useState<AppId>(() => (typeof window !== "undefined" ? appIdFromPath(window.location.pathname) : "tasks"));

  useEffect(() => {
    function onPopState() {
      setAppId(appIdFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function switchApp(next: AppId) {
    window.history.pushState({}, "", APP_CONFIG[next].path);
    setAppId(next);
    setPage(APP_CONFIG[next].defaultPage);
  }

  // Lifted above any single page so the header's global "+ Create" menu can
  // create a Task/Lead/Pipeline/Deal — and pop its modal open in place, with
  // no navigation — regardless of which page is currently showing.
  const tasks = useTasks(session?.user.id);
  const leads = useLeads(session?.user.id);
  const pipeline = usePipeline(session?.user.id);
  const deals = useDeals(session?.user.id);
  const dealTemplates = useDealTemplates(session?.user.id);
  const tags = useTags(session?.user.id);
  const notes = useNotes(session?.user.id);
  const profile = useProfile(session?.user.id);
  const theme = useTheme();
  const googleCalendar = useGoogleCalendar(session?.user.id);
  const hiddenModules = profile.profile?.hidden_modules ?? NO_HIDDEN_MODULES;

  // Runs once a real session exists so supabase.functions.invoke already
  // has a valid Authorization header to send — Google's redirect back
  // (?code=...&state=...) can land here before useAuth finishes resolving
  // the session on a cold load, and the exchange would otherwise fire
  // unauthenticated and fail.
  useEffect(() => {
    if (session) googleCalendar.handleOAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Two things keep `page` valid: (1) if it belongs to the *other* app
  // (e.g. the URL was edited by hand, or a stale page carried over from
  // before a switch) jump to this app's own default page — Settings is
  // shared across both apps, so it's exempt; (2) if the currently-open
  // module gets hidden (its nav tab just vanished), don't leave a dead
  // page up with no way back — jump to the first module in *this app*
  // that's still visible, or Settings if every one of this app's modules
  // has been hidden.
  useEffect(() => {
    if (page === "settings") return;
    const belongsToThisApp = APP_CONFIG[appId].navItems.some((m) => m.key === page);
    if (!belongsToThisApp) {
      setPage(APP_CONFIG[appId].defaultPage);
      return;
    }
    if (!hiddenModules.includes(page)) return;
    const fallback = APP_CONFIG[appId].navItems.find((m) => !hiddenModules.includes(m.key));
    setPage(fallback?.key ?? "settings");
  }, [page, hiddenModules, appId]);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [createNoteId, setCreateNoteId] = useState<string | null>(null);
  const [createLeadCardId, setCreateLeadCardId] = useState<string | null>(null);
  const [createPipelineCardId, setCreatePipelineCardId] = useState<string | null>(null);
  const [createShowNewDeal, setCreateShowNewDeal] = useState(false);
  const [createDealId, setCreateDealId] = useState<string | null>(null);

  // "Bust" a deal: convert it into a Pipeline card (first column) carrying
  // over address/value/type-as-tag plus its note history, then remove it
  // from Deals — same conversion invariant as the other module-to-module
  // moves (a card lives in exactly one of the four modules at a time).
  // Tags are attached in a second step (setCardTags needs a real card_id),
  // matched by label against the shared tag list rather than assuming a
  // "Buyer"/"Listing" tag still exists — the user can freely rename or
  // delete those starter tags, so if neither is found the card is simply
  // created untagged rather than silently recreating one.
  async function handleMoveDealToPipeline(deal: Deal) {
    const column = pipeline.columns[0];
    if (!column) {
      setPage("pipeline");
      return;
    }
    const newCard = await pipeline.addCardFromDeal(column.id, {
      title: deal.address,
      address: deal.address,
      value: deal.value,
      lastActivityText: "Moved back from Deals (deal busted)",
    });
    if (newCard) {
      const matchingTag = tags.tags.find((t) => t.label.toLowerCase() === deal.type.toLowerCase());
      if (matchingTag) await pipeline.setCardTags(newCard.id, [matchingTag.id]);
      const dealNotes = deals.notes.filter((n) => n.deal_id === deal.id);
      for (const note of dealNotes) {
        await pipeline.addNote(newCard.id, note.body);
      }
    }
    await deals.deleteDeal(deal.id);
    setPage("pipeline");
    if (newCard) setCreatePipelineCardId(newCard.id);
  }

  async function handleCreate(type: CreateType) {
    if (type === "task") {
      setQuickAddOpen(true);
    } else if (type === "lead") {
      const column = leads.columns[0];
      if (!column) {
        setPage("leads");
        return;
      }
      const card = await leads.addCard(column.id);
      if (card) setCreateLeadCardId(card.id);
    } else if (type === "pipeline") {
      const column = pipeline.columns[0];
      if (!column) {
        setPage("pipeline");
        return;
      }
      const card = await pipeline.addCard(column.id);
      if (card) setCreatePipelineCardId(card.id);
    } else if (type === "deal") {
      setCreateShowNewDeal(true);
    } else {
      // Unlike Lead/Pipeline cards, a note doesn't need a column to exist
      // first — it's created unfiled (folder_id null) and opened directly.
      const note = await notes.addNote(null);
      if (note) setCreateNoteId(note.id);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  const createLeadCard = createLeadCardId ? leads.cards.find((c) => c.id === createLeadCardId) : undefined;
  const createPipelineCard = createPipelineCardId ? pipeline.cards.find((c) => c.id === createPipelineCardId) : undefined;
  const createDeal = createDealId ? deals.deals.find((d) => d.id === createDealId) : undefined;
  const createNote = createNoteId ? notes.notes.find((n) => n.id === createNoteId) : undefined;

  return (
    <DialogsProvider>
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {session ? (
        // Signed-in app shell: a horizontal TopNav scoped to whichever app
        // is currently open, stacked above that app's content — two
        // distinct apps rather than one five-module nav (that was
        // LeftNav.tsx, since removed).
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <TopNav
            session={session}
            profile={profile.profile}
            page={page}
            onSetPage={setPage}
            onCreate={handleCreate}
            hiddenModules={hiddenModules}
            themeEffective={theme.effective}
            onToggleTheme={theme.toggleEffective}
            navItems={APP_CONFIG[appId].navItems}
            createTypes={APP_CONFIG[appId].createTypes}
            otherAppLabel={APP_CONFIG[appId].otherAppLabel}
            onSwitchApp={() => switchApp(appId === "tasks" ? "crm" : "tasks")}
          />
          <main style={{ flex: 1, minWidth: 0 }}>
            <PageContent
              page={page}
              session={session}
              tasksData={tasks}
              leadsData={leads}
              pipelineData={pipeline}
              dealsData={deals}
              dealTemplatesData={dealTemplates}
              tagsData={tags}
              notesData={notes}
              profileData={profile}
              theme={theme}
              googleCalendarData={googleCalendar}
              onNewTask={() => setQuickAddOpen(true)}
              onMoveDealToPipeline={handleMoveDealToPipeline}
            />
          </main>
        </div>
      ) : (
        <>
          <Header
            onLogin={() => setAuthModal("signin")}
            onSignup={() => setAuthModal("signup")}
            themeEffective={theme.effective}
            onToggleTheme={theme.toggleEffective}
          />
          <Landing onGetStarted={() => setAuthModal("signup")} />
        </>
      )}
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}

      {quickAddOpen && (
        <QuickAddTaskModal
          lists={tasks.lists}
          onClose={() => setQuickAddOpen(false)}
          onCreate={async (listId, title, description, dueDate, recurrence, subtaskTitles, dueTime, durationMinutes) => {
            const newTodo = await tasks.addTodo(listId, title, dueDate, { description, recurrence, dueTime, durationMinutes });
            if (newTodo) {
              for (const subtaskTitle of subtaskTitles) await tasks.addSubtask(newTodo.id, subtaskTitle);
            }
            setQuickAddOpen(false);
          }}
        />
      )}

      {createLeadCard && (
        <LeadCardModal
          card={createLeadCard}
          columns={leads.columns}
          notes={leads.notes.filter((n) => n.card_id === createLeadCard.id)}
          tags={tags.tags}
          cardTagIds={leads.cardTagIds[createLeadCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={leads.setCardTags}
          onCreateTag={tags.addTag}
          onClose={() => setCreateLeadCardId(null)}
          onUpdate={leads.updateCard}
          onDelete={leads.deleteCard}
          onAddNote={leads.addNote}
          onDeleteNote={leads.deleteNote}
        />
      )}

      {createPipelineCard && (
        <PipelineCardModal
          card={createPipelineCard}
          columns={pipeline.columns}
          notes={pipeline.notes.filter((n) => n.card_id === createPipelineCard.id)}
          tags={tags.tags}
          cardTagIds={pipeline.cardTagIds[createPipelineCard.id] ?? EMPTY_TAG_IDS}
          onSetCardTags={pipeline.setCardTags}
          onCreateTag={tags.addTag}
          onClose={() => setCreatePipelineCardId(null)}
          onUpdate={pipeline.updateCard}
          onDelete={pipeline.deleteCard}
          onAddNote={pipeline.addNote}
          onDeleteNote={pipeline.deleteNote}
        />
      )}

      {createShowNewDeal && (
        <NewDealModal
          onClose={() => setCreateShowNewDeal(false)}
          onCreate={async (address, type, acceptanceDate) => {
            const deal = await deals.addDeal(address, type, acceptanceDate);
            setCreateShowNewDeal(false);
            if (deal) {
              await Promise.all([dealTemplates.seedDealChecklist(deal.id, deal.type), deals.seedContactFields(deal.id)]);
              setCreateDealId(deal.id);
            }
          }}
        />
      )}

      {createDeal && (
        <DealModal
          deal={createDeal}
          notes={deals.notes.filter((n) => n.deal_id === createDeal.id)}
          checklistItems={deals.checklistItems.filter((i) => i.deal_id === createDeal.id)}
          contactFields={deals.contactFields.filter((f) => f.deal_id === createDeal.id)}
          onClose={() => setCreateDealId(null)}
          onUpdate={deals.updateDeal}
          onDelete={deals.deleteDeal}
          onAddNote={deals.addNote}
          onDeleteNote={deals.deleteNote}
          onAddChecklistItem={deals.addChecklistItem}
          onToggleChecklistItem={deals.toggleChecklistItem}
          onDeleteChecklistItem={deals.deleteChecklistItem}
          onEnsureContactFields={deals.ensureContactFields}
          onAddContactField={deals.addContactField}
          onUpdateContactField={deals.updateContactField}
          onDeleteContactField={deals.deleteContactField}
          onMoveToPipeline={handleMoveDealToPipeline}
        />
      )}

      {createNote && (
        <NoteModal
          note={createNote}
          folders={notes.folders}
          onClose={() => setCreateNoteId(null)}
          onUpdate={notes.updateNote}
          onDelete={notes.deleteNote}
          onTogglePinned={notes.togglePinned}
        />
      )}
    </div>
    </DialogsProvider>
  );
}

export default App;

const newDealButtonStyle = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

