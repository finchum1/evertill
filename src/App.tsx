import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTasks } from "./hooks/useTasks";
import { useLeads } from "./hooks/useLeads";
import { Header } from "./components/Header";
import { AuthModal } from "./components/AuthModal";
import { Sidebar } from "./components/Sidebar";
import { TaskListView } from "./components/TaskListView";
import { TaskModal } from "./components/TaskModal";
import { LeadsBoard } from "./components/LeadsBoard";
import { LeadCardModal } from "./components/LeadCardModal";
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
      />
      <TaskListView
        view={view}
        lists={lists}
        todos={todos}
        subtasks={subtasks}
        onAddTodo={addTodo}
        onToggleComplete={toggleTodoComplete}
        onOpenTodo={setOpenTodoId}
      />
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
        page === "tasks" ? (
          <TasksDashboard userId={session.user.id} />
        ) : (
          <LeadsDashboard userId={session.user.id} />
        )
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
