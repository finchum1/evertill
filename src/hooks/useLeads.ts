import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { LeadCard, LeadColumn, LeadNote, ListColor } from "../types";

export function useLeads(userId: string | undefined) {
  const [columns, setColumns] = useState<LeadColumn[]>([]);
  const [cards, setCards] = useState<LeadCard[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [columnsRes, cardsRes, notesRes] = await Promise.all([
      supabase.from("lead_columns").select("*").order("sort_order", { ascending: true }),
      supabase.from("lead_cards").select("*").order("sort_order", { ascending: true }),
      supabase.from("lead_notes").select("*").order("created_at", { ascending: false }),
    ]);
    if (columnsRes.error) throw columnsRes.error;
    if (cardsRes.error) throw cardsRes.error;
    if (notesRes.error) throw notesRes.error;

    setColumns((columnsRes.data ?? []) as LeadColumn[]);
    setCards((cardsRes.data ?? []) as LeadCard[]);
    setNotes((notesRes.data ?? []) as LeadNote[]);
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
      .channel("leads-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_columns" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_cards" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_notes" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // -- Columns ----------------------------------------------------------------
  async function addColumn(label: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("lead_columns")
      .insert({ user_id: userId, label, sort_order: columns.length });
    if (error) throw error;
    await refresh();
  }

  async function renameColumn(id: string, label: string) {
    const { error } = await supabase.from("lead_columns").update({ label }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function setColumnColor(id: string, color: ListColor) {
    const { error } = await supabase.from("lead_columns").update({ color }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteColumn(id: string) {
    // Cascades its cards (and their notes) via ON DELETE CASCADE.
    const { error } = await supabase.from("lead_columns").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // -- Cards --------------------------------------------------------------------
  async function addCard(columnId: string) {
    if (!userId) return;
    const existing = cards.filter((c) => c.column_id === columnId);
    const { data, error } = await supabase
      .from("lead_cards")
      .insert({ user_id: userId, column_id: columnId, sort_order: existing.length })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as LeadCard;
  }

  async function updateCard(id: string, patch: Partial<LeadCard>) {
    const { error } = await supabase.from("lead_cards").update(patch).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function moveCardToColumn(id: string, columnId: string) {
    const existing = cards.filter((c) => c.column_id === columnId);
    await updateCard(id, { column_id: columnId, sort_order: existing.length });
  }

  async function deleteCard(id: string) {
    const { error } = await supabase.from("lead_cards").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // -- Notes ------------------------------------------------------------------
  async function addNote(cardId: string, body: string) {
    if (!userId) return;
    const { error } = await supabase.from("lead_notes").insert({ user_id: userId, card_id: cardId, body });
    if (error) throw error;
    await refresh();
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("lead_notes").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  return {
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
    moveCardToColumn,
    deleteCard,
    addNote,
    deleteNote,
  };
}
