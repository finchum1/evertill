import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ListColor, Note, NoteFolder } from "../types";

export function useNotes(userId: string | undefined) {
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [foldersRes, notesRes] = await Promise.all([
      supabase.from("note_folders").select("*").order("sort_order", { ascending: true }),
      supabase.from("notes").select("*").order("sort_order", { ascending: true }),
    ]);
    if (foldersRes.error) throw foldersRes.error;
    if (notesRes.error) throw notesRes.error;

    setFolders((foldersRes.data ?? []) as NoteFolder[]);
    setNotes((notesRes.data ?? []) as Note[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Cross-device sync: re-fetch whenever another session changes the data.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notes-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "note_folders" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // -- Folders ------------------------------------------------------------
  async function addFolder(name: string) {
    if (!userId) return;
    const { error } = await supabase.from("note_folders").insert({ user_id: userId, name, sort_order: folders.length });
    if (error) throw error;
    await refresh();
  }

  async function renameFolder(id: string, name: string) {
    const { error } = await supabase.from("note_folders").update({ name }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function setFolderColor(id: string, color: ListColor) {
    const { error } = await supabase.from("note_folders").update({ color }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteFolder(id: string) {
    // Notes in this folder become unfiled (folder_id -> null via ON DELETE
    // SET NULL), not deleted — same "delete the container, keep the
    // contents" semantics as Tasks' deleteFolder.
    const { error } = await supabase.from("note_folders").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // -- Notes ----------------------------------------------------------------
  async function addNote(folderId: string | null, title = "Untitled note", body = "") {
    if (!userId) return;
    const existing = notes.filter((n) => n.folder_id === folderId);
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: userId, folder_id: folderId, title, body, sort_order: existing.length })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as Note;
  }

  async function updateNote(id: string, patch: Partial<Note>) {
    const { error } = await supabase
      .from("notes")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function moveNoteToFolder(id: string, folderId: string | null) {
    const existing = notes.filter((n) => n.folder_id === folderId);
    await updateNote(id, { folder_id: folderId, sort_order: existing.length });
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  return {
    folders,
    notes,
    loading,
    addFolder,
    renameFolder,
    setFolderColor,
    deleteFolder,
    addNote,
    updateNote,
    moveNoteToFolder,
    deleteNote,
  };
}
