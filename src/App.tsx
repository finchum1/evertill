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
import { PipelineBoard } from "./components/PipelineBoard";
import { PipelineCardModal } from "./components/PipelineCardModal";
import { useDeals } from "./hooks/useDeals";
import { DealsBoard } from "./components/DealsBoard";
import { NewDealModal } from "./components/NewDealModal";
import { DealModal } from "./components/DealModal";
import { QuickAddTaskModal } from "./components/QuickAddTaskModal";
import type { Page, View } from "./types";

function TasksDashboard({ userId }: { userId: string }) {
  const {
    folders,
    lists,
    todos,
    subtasks,
    loading,
    addFolder,
    renameFolder,
    deleteFolder,
    addList,
    renameList,
    deleteList,
    addTodo,
    updateTodo,
    toggleTodoComplete,
    deleteTodo,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useTasks(userId);

  const [view, setView] = useState<View>("today");
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
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
        onDeleteList={(id) => {
          if (view === id) setView("today");
          deleteList(id);
        }}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onDropTodoOnList={(todoId, listId) => updateTodo(todoId, { list_id: listId })}
        onNewTask={() => setQuickAddOpen(true)}
      />
      {view === "calendar" ? (
        <CalendarView
          todos={todos}
          subtasks={subtasks}
          onOpenTodo={setOpenTodoId}
          onToggleComplete={toggleTodoComplete}
          onToggleSubtask={toggleSubtask}
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
      {quickAddOpen && (
        <QuickAddTaskModal
          lists={lists}
          onClose={() => setQuickAddOpen(false)}
          onCreate={(listId, title, dueDate) => {
            addTodo(listId, title, dueDate);
            setQuickAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

function LeadsDashboard({ userId }: { userId: string }) {
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
  } = useLeads(userId);

  const [openCardId, setOpenCardId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading…
      </div>
    );
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined;

  return (
    <div style={{ minHeight: "calc(100vh - 61px)" }}>
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

function PipelineDashboard({ userId }: { userId: string }) {
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
  } = usePipeline(userId);

  const [openCardId, setOpenCardId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading…
      </div>
    );
  }

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : undefined;

  return (
    <div style={{ minHeight: "calc(100vh - 61px)" }}>
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

function DealsDashboard({ userId }: { userId: string }) {
  const { deals, notes, loading, addDeal, updateDeal, deleteDeal, addNote, deleteNote } = useDeals(userId);

  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 61px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading…
      </div>
    );
  }

  const openDeal = openDealId ? deals.find((d) => d.id === openDealId) : undefined;

  return (
    <div style={{ minHeight: "calc(100vh - 61px)" }}>
      <DealsBoard deals={deals} onAddDeal={() => setShowNewDeal(true)} onOpenDeal={setOpenDealId} />
      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreate={async (address, type, acceptanceDate) => {
            const deal = await addDeal(address, type, acceptanceDate);
            setShowNewDeal(false);
            if (deal) setOpenDealId(deal.id);
          }}
        />
      )}
      {openDeal && (
        <DealModal
          deal={openDeal}
          notes={notes.filter((n) => n.deal_id === openDeal.id)}
          onClose={() => setOpenDealId(null)}
          onUpdate={updateDeal}
          onDelete={deleteDeal}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
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
        color: "#f1f5f9",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 11, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
          TC Dashboard
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em", margin: "0 0 12px" }}>
          Tasks, leads, and deals in one place
        </h1>
        <p style={{ color: "#475569", fontSize: 15, margin: "0 0 28px" }}>
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

function PageContent({ page, userId }: { page: Page; userId: string }) {
  switch (page) {
    case "tasks":
      return <TasksDashboard userId={userId} />;
    case "leads":
      return <LeadsDashboard userId={userId} />;
    case "pipeline":
      return <PipelineDashboard userId={userId} />;
    case "deals":
      return <DealsDashboard userId={userId} />;
  }
}

function App() {
  const { session, loading } = useAuth();
  const [authModal, setAuthModal] = useState<"signin" | "signup" | null>(null);
  const [page, setPage] = useState<Page>("tasks");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020817", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020817" }}>
      <Header
        session={session}
        page={page}
        onSetPage={setPage}
        onLogin={() => setAuthModal("signin")}
        onSignup={() => setAuthModal("signup")}
      />
      {session ? (
        <PageContent page={page} userId={session.user.id} />
      ) : (
        <Landing onGetStarted={() => setAuthModal("signup")} />
      )}
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  );
}

export default App;

const ctaButtonStyle = {
  background: "#6366f1",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  padding: "12px 28px",
  cursor: "pointer",
};
