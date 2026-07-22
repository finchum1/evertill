import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { useLeads } from "./hooks/useLeads";
import { usePipeline } from "./hooks/usePipeline";
import { Header } from "./components/Header";
import { AuthModal } from "./components/AuthModal";
import { Sidebar } from "./components/Sidebar";
import { TaskListView } from "./components/TaskListView";
import { TaskModal } from "./components/TaskModal";
import { CalendarView } from "./components/CalendarView";
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
import { NewDealModal } from "./components/NewDealModal";
import { DealModal } from "./components/DealModal";
import { QuickAddTaskModal } from "./components/QuickAddTaskModal";
import { SettingsPage } from "./components/SettingsPage";
import type { CreateType } from "./components/CreateMenu";
import { DEAL_STATUSES, DEAL_STATUS_LIST_COLOR } from "./types";
import type { Page, View } from "./types";

const DEALS_VIEW_ORDER: BoardSubView[] = ["list", "board", "calendar", "value"];

type TasksData = ReturnType<typeof useTasks>;
type LeadsData = ReturnType<typeof useLeads>;
type PipelineData = ReturnType<typeof usePipeline>;
type DealsData = ReturnType<typeof useDeals>;
type DealTemplatesData = ReturnType<typeof useDealTemplates>;

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
    deleteSubtask,
  } = tasks;

  const [view, setView] = useState<View>("today");
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);

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
      />
      {view === "calendar" ? (
        <CalendarView
          todos={todos}
          lists={lists}
          subtasks={subtasks}
          onOpenTodo={setOpenTodoId}
          onToggleComplete={toggleTodoComplete}
          onToggleSubtask={toggleSubtask}
          onUpdateDueDate={(id, date) => updateTodo(id, { due_date: date })}
          onDropTodoOnDate={(todoId, dateKey) => updateTodo(todoId, { due_date: dateKey })}
        />
      ) : (
        <TaskListView
          view={view}
          lists={lists}
          todos={todos}
          subtasks={subtasks}
          onAddTodo={addTodo}
          onToggleComplete={toggleTodoComplete}
          onToggleSubtask={toggleSubtask}
          onUpdateDueDate={(id, date) => updateTodo(id, { due_date: date })}
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

function LeadsDashboard({ leads }: { leads: LeadsData }) {
  const {
    columns,
    cards,
    notes,
    loading,
    addColumn,
    renameColumn,
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
          card={openCard}
          columns={columns}
          notes={notes.filter((n) => n.card_id === openCard.id)}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
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
          card={openCard}
          columns={columns}
          notes={notes.filter((n) => n.card_id === openCard.id)}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
        />
      )}
    </div>
  );
}

function DealsDashboard({ dealsData, dealTemplatesData }: { dealsData: DealsData; dealTemplatesData: DealTemplatesData }) {
  const {
    deals,
    notes,
    checklistItems,
    loading,
    addDeal,
    updateDeal,
    deleteDeal,
    addNote,
    deleteNote,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
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
      <div style={{ padding: "0 24px" }}>
        <ViewTabs active={subView} onChange={setSubView} order={DEALS_VIEW_ORDER} />
      </div>
      {subView === "list" && <DealsListView deals={deals} onOpenDeal={setOpenDealId} />}
      {subView === "board" && <DealsBoard deals={deals} onOpenDeal={setOpenDealId} />}
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
              await seedDealChecklist(deal.id);
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
          onClose={() => setOpenDealId(null)}
          onUpdate={updateDeal}
          onDelete={deleteDeal}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onAddChecklistItem={addChecklistItem}
          onToggleChecklistItem={toggleChecklistItem}
          onDeleteChecklistItem={deleteChecklistItem}
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
  profileData,
  theme,
  onNewTask,
}: {
  page: Page;
  session: Session;
  tasksData: TasksData;
  leadsData: LeadsData;
  pipelineData: PipelineData;
  dealsData: DealsData;
  dealTemplatesData: DealTemplatesData;
  profileData: ReturnType<typeof useProfile>;
  theme: ReturnType<typeof useTheme>;
  onNewTask: () => void;
}) {
  switch (page) {
    case "tasks":
      return <TasksDashboard tasks={tasksData} onNewTask={onNewTask} />;
    case "leads":
      return <LeadsDashboard leads={leadsData} />;
    case "pipeline":
      return <PipelineDashboard pipeline={pipelineData} />;
    case "deals":
      return <DealsDashboard dealsData={dealsData} dealTemplatesData={dealTemplatesData} />;
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
  const profile = useProfile(session?.user.id);
  const theme = useTheme();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [createLeadCardId, setCreateLeadCardId] = useState<string | null>(null);
  const [createPipelineCardId, setCreatePipelineCardId] = useState<string | null>(null);
  const [createShowNewDeal, setCreateShowNewDeal] = useState(false);
  const [createDealId, setCreateDealId] = useState<string | null>(null);

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
    } else {
      setCreateShowNewDeal(true);
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <Header
        session={session}
        page={page}
        onSetPage={setPage}
        onLogin={() => setAuthModal("signin")}
        onSignup={() => setAuthModal("signup")}
        onCreate={handleCreate}
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
          profileData={profile}
          theme={theme}
          onNewTask={() => setQuickAddOpen(true)}
        />
      ) : (
        <Landing onGetStarted={() => setAuthModal("signup")} />
      )}
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}

      {quickAddOpen && (
        <QuickAddTaskModal
          lists={tasks.lists}
          onClose={() => setQuickAddOpen(false)}
          onCreate={(listId, title, dueDate) => {
            tasks.addTodo(listId, title, dueDate);
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
              await dealTemplates.seedDealChecklist(deal.id);
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
          onClose={() => setCreateDealId(null)}
          onUpdate={deals.updateDeal}
          onDelete={deals.deleteDeal}
          onAddNote={deals.addNote}
          onDeleteNote={deals.deleteNote}
          onAddChecklistItem={deals.addChecklistItem}
          onToggleChecklistItem={deals.toggleChecklistItem}
          onDeleteChecklistItem={deals.deleteChecklistItem}
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
