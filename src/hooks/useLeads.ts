import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { LeadCard, LeadCardTagRow, LeadColumn, LeadNote, ListColor } from "../types";

export function useLeads(userId: string | undefined) {
  const [columns, setColumns] = useState<LeadColumn[]>([]);
  const [cards, setCards] = useState<LeadCard[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [cardTagRows, setCardTagRows] = useState<LeadCardTagRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [columnsRes, cardsRes, notesRes, cardTagsRes] = await Promise.all([
      supabase.from("lead_columns").select("*").order("sort_order", { ascending: true }),
      supabase.from("lead_cards").select("*").order("sort_order", { ascending: true }),
      supabase.from("lead_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("lead_card_tags").select("*"),
    ]);
    if (columnsRes.error) throw columnsRes.error;
    if (cardsRes.error) throw cardsRes.error;
    if (notesRes.error) throw notesRes.error;
    if (cardTagsRes.error) throw cardTagsRes.error;

    setColumns((columnsRes.data ?? []) as LeadColumn[]);
    setCards((cardsRes.data ?? []) as LeadCard[]);
    setNotes((notesRes.data ?? []) as LeadNote[]);
    setCardTagRows((cardTagsRes.data ?? []) as LeadCardTagRow[]);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_card_tags" }, () => refresh())
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

  // -- Tags -------------------------------------------------------------------
  // Diffs the card's current tag links against the desired set rather than
  // clearing and re-inserting everything, so an unrelated tag on the same
  // card assigned from another open tab isn't clobbered mid-edit.
  async function setCardTags(cardId: string, tagIds: string[]) {
    if (!userId) return;
    const current = cardTagRows.filter((r) => r.card_id === cardId).map((r) => r.tag_id);
    const toAdd = tagIds.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !tagIds.includes(id));

    if (toAdd.length) {
      const { error } = await supabase
        .from("lead_card_tags")
        .insert(toAdd.map((tag_id) => ({ user_id: userId, card_id: cardId, tag_id })));
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await supabase.from("lead_card_tags").delete().eq("card_id", cardId).in("tag_id", toRemove);
      if (error) throw error;
    }
    if (toAdd.length || toRemove.length) await refresh();
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

  const cardTagIds: Record<string, string[]> = {};
  for (const row of cardTagRows) {
    (cardTagIds[row.card_id] ??= []).push(row.tag_id);
  }

  return {
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
    moveCardToColumn,
    deleteCard,
    setCardTags,
    addNote,
    deleteNote,
  };
}
