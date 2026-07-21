import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ListColor, Recurrence, Todo, TodoFolder, TodoList, TodoSubtask } from "../types";

function nextRecurrenceDate(dateStr: string, recurrence: Recurrence): string {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function useTasks(userId: string | undefined) {
  const [folders, setFolders] = useState<TodoFolder[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [subtasks, setSubtasks] = useState<TodoSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const ensuringInbox = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [foldersRes, listsRes, todosRes, subtasksRes] = await Promise.all([
      supabase.from("todo_folders").select("*").order("sort_order", { ascending: true }),
      supabase.from("todo_lists").select("*").order("sort_order", { ascending: true }),
      supabase.from("todos").select("*").order("sort_order", { ascending: true }),
      supabase.from("todo_subtasks").select("*").order("sort_order", { ascending: true }),
    ]);
    if (foldersRes.error) throw foldersRes.error;
    if (listsRes.error) throw listsRes.error;
    if (todosRes.error) throw todosRes.error;
    if (subtasksRes.error) throw subtasksRes.error;

    setFolders((foldersRes.data ?? []) as TodoFolder[]);
    setLists((listsRes.data ?? []) as TodoList[]);
    setTodos((todosRes.data ?? []) as Todo[]);
    setSubtasks((subtasksRes.data ?? []) as TodoSubtask[]);
    setLoading(false);
  }, [userId]);

  // Every user gets exactly one fixed "Inbox" list, lazily created the first
  // time their data loads if one doesn't already exist. The in-flight ref
  // guards against duplicate inserts within one mounted hook instance, but
  // React StrictMode's dev-only mount/unmount/remount cycle can still create
  // a second instance fast enough to race past it — a real duplicate row was
  // found and removed from live data because of exactly this. The actual
  // guarantee is the database's own partial unique index (one is_inbox=true
  // row per user_id, see schema.sql); a 23505 violation here just means
  // another call already won the race, so it's swallowed, not surfaced.
  const ensureInboxList = useCallback(async () => {
    if (!userId) return;
    if (lists.some((l) => l.is_inbox)) return;
    if (ensuringInbox.current) return ensuringInbox.current;
    ensuringInbox.current = (async () => {
      try {
        const { error } = await supabase
          .from("todo_lists")
          .insert({ user_id: userId, name: "Inbox", is_inbox: true, sort_order: -1 });
        if (error && error.code !== "23505") throw error;
      } finally {
        await refresh();
        ensuringInbox.current = null;
      }
    })();
    return ensuringInbox.current;
  }, [userId, lists, refresh]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loading && userId) ensureInboxList();
  }, [loading, userId, lists.length, ensureInboxList]);

  // Cross-device sync: re-fetch whenever another session changes the data.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("tasks-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_folders" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_lists" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_subtasks" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // -- Folders --------------------------------------------------------------
  async function addFolder(name: string) {
    if (!userId) return;
    const { error } = await supabase.from("todo_folders").insert({ user_id: userId, name, sort_order: folders.length });
    if (error) throw error;
    await refresh();
  }

  async function renameFolder(id: string, name: string) {
    const { error } = await supabase.from("todo_folders").update({ name }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteFolder(id: string) {
    // Its lists get folder_id = null via ON DELETE SET NULL, not deleted.
    const { error } = await supabase.from("todo_folders").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // Rewrites sort_order to sequential values in the given order. Used for
  // drag-to-reorder — since lists are always filtered to one bucket (a
  // folder, or "unfiled") before being displayed, only the relative order
  // within that bucket's own ids matters, not the absolute values.
  async function reorderFolders(orderedIds: string[]) {
    await Promise.all(orderedIds.map((id, i) => supabase.from("todo_folders").update({ sort_order: i }).eq("id", id)));
    await refresh();
  }

  // -- Lists ------------------------------------------------------------------
  async function addList(name: string, folderId: string | null = null) {
    if (!userId) return;
    const { error } = await supabase
      .from("todo_lists")
      .insert({ user_id: userId, name, folder_id: folderId, sort_order: lists.length });
    if (error) throw error;
    await refresh();
  }

  async function renameList(id: string, name: string) {
    const { error } = await supabase.from("todo_lists").update({ name }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function setListColor(id: string, color: ListColor) {
    const { error } = await supabase.from("todo_lists").update({ color }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function reorderLists(orderedIds: string[]) {
    await Promise.all(orderedIds.map((id, i) => supabase.from("todo_lists").update({ sort_order: i }).eq("id", id)));
    await refresh();
  }

  async function moveListToFolder(id: string, folderId: string | null) {
    const { error } = await supabase.from("todo_lists").update({ folder_id: folderId }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteList(id: string) {
    // Cascades its tasks (and their subtasks) via ON DELETE CASCADE.
    const { error } = await supabase.from("todo_lists").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // -- Todos ------------------------------------------------------------------
  async function addTodo(listId: string, title: string, dueDate: string | null = null) {
    if (!userId) return;
    const existing = todos.filter((t) => t.list_id === listId);
    const { error } = await supabase
      .from("todos")
      .insert({ user_id: userId, list_id: listId, title, due_date: dueDate, sort_order: existing.length });
    if (error) throw error;
    await refresh();
  }

  async function updateTodo(id: string, patch: Partial<Todo>) {
    const { error } = await supabase
      .from("todos")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function moveTodoToList(id: string, listId: string) {
    await updateTodo(id, { list_id: listId });
  }

  // Recurring tasks "roll forward in place": checking one off never marks it
  // completed — it just advances due_date to the next occurrence and stays
  // unchecked, so it reappears in Today/Upcoming instead of disappearing.
  async function toggleTodoComplete(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (todo.recurrence !== "none" && todo.due_date) {
      await updateTodo(id, { due_date: nextRecurrenceDate(todo.due_date, todo.recurrence) });
      return;
    }
    await updateTodo(id, { completed: !todo.completed });
  }

  async function deleteTodo(id: string) {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // -- Subtasks ---------------------------------------------------------------
  async function addSubtask(todoId: string, title: string) {
    if (!userId) return;
    const existing = subtasks.filter((s) => s.todo_id === todoId);
    const { error } = await supabase
      .from("todo_subtasks")
      .insert({ user_id: userId, todo_id: todoId, title, sort_order: existing.length });
    if (error) throw error;
    await refresh();
  }

  async function toggleSubtask(id: string) {
    const subtask = subtasks.find((s) => s.id === id);
    if (!subtask) return;
    const { error } = await supabase.from("todo_subtasks").update({ checked: !subtask.checked }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteSubtask(id: string) {
    const { error } = await supabase.from("todo_subtasks").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  return {
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
    moveTodoToList,
    toggleTodoComplete,
    deleteTodo,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  };
}
