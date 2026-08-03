import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { useLeads } from "./hooks/useLeads";
import { usePipeline } from "./hooks/usePipeline";
import { useNotes } from "./hooks/useNotes";
import { Header } from "./components/Header";
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
import { ViewTabs } from "./components/ViewTabs";
import type { BoardSubView } from "./components/ViewTabs";
import { BoardListView } from "./components/BoardListView";
import { BoardValueView } from "./components/BoardValueView";
import { BoardCalendarView } from "./components/BoardCalendarView";
import { useDeals } from "./hooks/useDeals";
import { useDealTemplates } from "./hooks/useDealTemplates";
import { useTheme } from "./hooks/useTheme";
import { useProfile } from "./hooks/useProfile";
import type { Session } from "@supabase/supabase-js";
import { DealsBoard } from "./components/DealsBoard";
import { DealsListView } from "./components/DealsListView";
import { DealsStatCards } from "./components/DealsStatCards";
import { NewDealModal } from "./components/NewDealModal";
import { DealModal } from "./components/DealModal";
import { QuickAddTaskModal } from "./components/QuickAddTaskModal";
import { SettingsPage } from "./components/SettingsPage";
import type { CreateType } from "./components/CreateMenu";
import { DEAL_STATUSES, DEAL_STATUS_LIST_COLOR, HIDEABLE_MODULES } from "./types";
import type { CompletionToast, Deal, Page, View } from "./types";

const DEALS_VIEW_ORDER: BoardSubView[] = ["list", "board", "calendar", "value"];

// Stable reference (not a fresh `[]` literal per render) so the redirect
// effect below can safely depend on `hiddenModules` without re-running on
// every render when no hidden_modules value has loaded yet.
const NO_HIDDEN_MODULES: string[] = [];

type TasksData = ReturnType<typeof useTasks>;
type LeadsData = ReturnType<typeof useLeads>;
type PipelineData = ReturnType<typeof usePipeline>;
type DealsData = ReturnType<typeof useDeals>;
type DealTemplatesData = ReturnType<typeof useDealTemplates>;
type NotesData = ReturnType<typeof useNotes>;

function TasksDashboard({ tasks, onNewTask }: { tasks: TasksData; onNewTask: () => void }) {
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

  const [view, setView] = useState<View>("today");
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<CompletionToast[]>([]);

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
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  const openTodo = openTodoId ? todos.find((t) => t.id === openTodoId) : undefined;

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 61px)" }}>
      <Sidebar
        folders={folders}
        lists={lists}
        todos={todos}
        view={view}
        onSetView={setView}
        onAddFolder={() => {
          const name = window.prompt("Folder name:");
          if (name?.trim()) addFolder(name.trim());
        }}
        onAddList={(folderId) => {
          const name = window.prompt("List name:");
          if (name?.trim()) addList(name.trim(), folderId);
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
      />
      {view === "calendar" ? (
        <CalendarView
          todos={todos}
          lists={lists}
          subtasks={subtasks}
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

  const [view, setView] = useState<"all" | "pinned" | string>("all");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
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

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 61px)" }}>
      <NotesSidebar
        folders={folders}
        notes={allNotes}
        view={view}
        onSetView={setView}
        onAddNote={handleAddNote}
        onAddFolder={() => {
          const name = window.prompt("Folder name:");
          if (name?.trim()) addFolder(name.trim());
        }}
        onRenameFolder={renameFolder}
        onSetFolderColor={setFolderColor}
        onDeleteFolder={(id) => {
          if (view === id) setView("all");
          deleteFolder(id);
        }}
      />
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

function LeadsDashboard({ leads }: { leads: LeadsData }) {
  const {
    columns,
    cards,
    notes,
    loading,
    addColumn,
    renameColumn,
    setColumnColor,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    addNote,
    deleteNote,
  } = leads;

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("board");

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
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
    <div style={{ minHeight: "calc(100vh - 61px)" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <ViewTabs active={subView} onChange={setSubView} />
      </div>
      {subView === "board" && (
        <LeadsBoard
          columns={columns}
          cards={cards}
          onAddColumn={() => {
            const label = window.prompt("Column name:");
            if (label?.trim()) addColumn(label.trim());
          }}
          onRenameColumn={renameColumn}
          onSetColumnColor={setColumnColor}
          onDeleteColumn={deleteColumn}
          onAddCard={async (columnId) => {
            const card = await addCard(columnId);
            if (card) setOpenCardId(card.id);
          }}
          onOpenCard={setOpenCardId}
        />
      )}
      {subView === "list" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardListView columns={columns} cards={cards} itemNoun="lead" renderCard={(card) => (
            <LeadCardMini key={card.id} card={card} onOpen={setOpenCardId} />
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

function PipelineDashboard({ pipeline }: { pipeline: PipelineData }) {
  const {
    columns,
    cards,
    notes,
    loading,
    addColumn,
    renameColumn,
    setColumnColor,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    addNote,
    deleteNote,
  } = pipeline;

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("board");

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
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
    <div style={{ minHeight: "calc(100vh - 61px)" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <ViewTabs active={subView} onChange={setSubView} />
      </div>
      {subView === "board" && (
        <PipelineBoard
          columns={columns}
          cards={cards}
          onAddColumn={() => {
            const label = window.prompt("Column name:");
            if (label?.trim()) addColumn(label.trim());
          }}
          onRenameColumn={renameColumn}
          onSetColumnColor={setColumnColor}
          onDeleteColumn={deleteColumn}
          onAddCard={async (columnId) => {
            const card = await addCard(columnId);
            if (card) setOpenCardId(card.id);
          }}
          onOpenCard={setOpenCardId}
        />
      )}
      {subView === "list" && (
        <div style={{ padding: "0 24px 20px" }}>
          <BoardListView columns={columns} cards={cards} itemNoun="client" renderCard={(card) => (
            <PipelineCardMini key={card.id} card={card} onOpen={setOpenCardId} />
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
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
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
    <div style={{ minHeight: "calc(100vh - 61px)" }}>
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
        <ViewTabs active={subView} onChange={setSubView} order={DEALS_VIEW_ORDER} />
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

function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 61px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        color: "var(--text-primary)",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
          TC Dashboard
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          Tasks, leads, and deals in one place
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, margin: "0 0 28px" }}>
          Sign up for your own private workspace — folders, lists, due dates, and subtasks, synced across
          every device.
        </p>
        <button onClick={onGetStarted} style={ctaButtonStyle}>
          Get started
        </button>
      </div>
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
  notesData,
  profileData,
  theme,
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
  notesData: NotesData;
  profileData: ReturnType<typeof useProfile>;
  theme: ReturnType<typeof useTheme>;
  onNewTask: () => void;
  onMoveDealToPipeline: (deal: Deal) => void;
}) {
  switch (page) {
    case "tasks":
      return <TasksDashboard tasks={tasksData} onNewTask={onNewTask} />;
    case "leads":
      return <LeadsDashboard leads={leadsData} />;
    case "pipeline":
      return <PipelineDashboard pipeline={pipelineData} />;
    case "deals":
      return <DealsDashboard dealsData={dealsData} dealTemplatesData={dealTemplatesData} onMoveDealToPipeline={onMoveDealToPipeline} />;
    case "notes":
      return <NotesDashboard notes={notesData} />;
    case "settings":
      return <SettingsPage session={session} profileData={profileData} theme={theme} dealTemplatesData={dealTemplatesData} />;
  }
}

function App() {
  const { session, loading } = useAuth();
  const [authModal, setAuthModal] = useState<"signin" | "signup" | null>(null);
  const [page, setPage] = useState<Page>("tasks");

  // Lifted above any single page so the header's global "+ Create" menu can
  // create a Task/Lead/Pipeline/Deal — and pop its modal open in place, with
  // no navigation — regardless of which page is currently showing.
  const tasks = useTasks(session?.user.id);
  const leads = useLeads(session?.user.id);
  const pipeline = usePipeline(session?.user.id);
  const deals = useDeals(session?.user.id);
  const dealTemplates = useDealTemplates(session?.user.id);
  const notes = useNotes(session?.user.id);
  const profile = useProfile(session?.user.id);
  const theme = useTheme();
  const hiddenModules = profile.profile?.hidden_modules ?? NO_HIDDEN_MODULES;

  // If the currently-open module gets hidden (its nav tab just vanished),
  // don't leave a dead page up with no way back — jump to the first module
  // still visible, or Settings if every module has been hidden.
  useEffect(() => {
    if (page === "settings" || !hiddenModules.includes(page)) return;
    const fallback = HIDEABLE_MODULES.find((m) => !hiddenModules.includes(m.key));
    setPage(fallback?.key ?? "settings");
  }, [page, hiddenModules]);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [createNoteId, setCreateNoteId] = useState<string | null>(null);
  const [createLeadCardId, setCreateLeadCardId] = useState<string | null>(null);
  const [createPipelineCardId, setCreatePipelineCardId] = useState<string | null>(null);
  const [createShowNewDeal, setCreateShowNewDeal] = useState(false);
  const [createDealId, setCreateDealId] = useState<string | null>(null);

  // "Bust" a deal: convert it into a Pipeline card (first column) carrying
  // over address/value/type-as-tags plus its note history, then remove it
  // from Deals — same conversion invariant as the other module-to-module
  // moves (a card lives in exactly one of the four modules at a time).
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
      tagBuyer: deal.type === "Buyer",
      tagListing: deal.type === "Listing",
      lastActivityText: "Moved back from Deals (deal busted)",
    });
    if (newCard) {
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
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <Header
        session={session}
        profile={profile.profile}
        page={page}
        onSetPage={setPage}
        onLogin={() => setAuthModal("signin")}
        onSignup={() => setAuthModal("signup")}
        onCreate={handleCreate}
        hiddenModules={hiddenModules}
      />
      {session ? (
        <PageContent
          page={page}
          session={session}
          tasksData={tasks}
          leadsData={leads}
          pipelineData={pipeline}
          dealsData={deals}
          dealTemplatesData={dealTemplates}
          notesData={notes}
          profileData={profile}
          theme={theme}
          onNewTask={() => setQuickAddOpen(true)}
          onMoveDealToPipeline={handleMoveDealToPipeline}
        />
      ) : (
        <Landing onGetStarted={() => setAuthModal("signup")} />
      )}
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}

      {quickAddOpen && (
        <QuickAddTaskModal
          lists={tasks.lists}
          onClose={() => setQuickAddOpen(false)}
          onCreate={async (listId, title, description, dueDate, recurrence, subtaskTitles) => {
            const newTodo = await tasks.addTodo(listId, title, dueDate, { description, recurrence });
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

const ctaButtonStyle = {
  background: "var(--accent)",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  padding: "12px 28px",
  cursor: "pointer",
};
