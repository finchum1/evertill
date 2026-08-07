import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ListColor, PipelineCard, PipelineCardTagRow, PipelineColumn, PipelineNote } from "../types";

export function usePipeline(userId: string | undefined) {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [notes, setNotes] = useState<PipelineNote[]>([]);
  const [cardTagRows, setCardTagRows] = useState<PipelineCardTagRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [columnsRes, cardsRes, notesRes, cardTagsRes] = await Promise.all([
      supabase.from("pipeline_columns").select("*").order("sort_order", { ascending: true }),
      supabase.from("pipeline_cards").select("*").order("sort_order", { ascending: true }),
      supabase.from("pipeline_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("pipeline_card_tags").select("*"),
    ]);
    if (columnsRes.error) throw columnsRes.error;
    if (cardsRes.error) throw cardsRes.error;
    if (notesRes.error) throw notesRes.error;
    if (cardTagsRes.error) throw cardTagsRes.error;

    setColumns((columnsRes.data ?? []) as PipelineColumn[]);
    setCards((cardsRes.data ?? []) as PipelineCard[]);
    setNotes((notesRes.data ?? []) as PipelineNote[]);
    setCardTagRows((cardTagsRes.data ?? []) as PipelineCardTagRow[]);
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
      .channel("pipeline-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_columns" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_cards" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_notes" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_card_tags" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // -- Columns ----------------------------------------------------------------
  async function addColumn(label: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("pipeline_columns")
      .insert({ user_id: userId, label, sort_order: columns.length });
    if (error) throw error;
    await refresh();
  }

  async function renameColumn(id: string, label: string) {
    const { error } = await supabase.from("pipeline_columns").update({ label }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function setColumnColor(id: string, color: ListColor) {
    const { error } = await supabase.from("pipeline_columns").update({ color }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteColumn(id: string) {
    // Cascades its cards (and their notes) via ON DELETE CASCADE.
    const { error } = await supabase.from("pipeline_columns").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // -- Cards --------------------------------------------------------------------
  async function addCard(columnId: string) {
    if (!userId) return;
    const existing = cards.filter((c) => c.column_id === columnId);
    const { data, error } = await supabase
      .from("pipeline_cards")
      .insert({ user_id: userId, column_id: columnId, sort_order: existing.length })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as PipelineCard;
  }

  async function updateCard(id: string, patch: Partial<PipelineCard>) {
    const { error } = await supabase.from("pipeline_cards").update(patch).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // Inserts a fully-populated card in one go (rather than the usual blank
  // addCard + edit-in-place flow) — used to convert a busted Deal back into
  // Pipeline, where the fields are already known up front. Tag assignment
  // happens separately via setCardTags (junction rows need a real card_id),
  // which the caller does right after this resolves.
  async function addCardFromDeal(
    columnId: string,
    fields: { title: string; address: string | null; value: number; lastActivityText: string }
  ) {
    if (!userId) return;
    const existing = cards.filter((c) => c.column_id === columnId);
    const { data, error } = await supabase
      .from("pipeline_cards")
      .insert({
        user_id: userId,
        column_id: columnId,
        title: fields.title,
        address: fields.address,
        value: fields.value,
        last_activity_at: new Date().toISOString(),
        last_activity_text: fields.lastActivityText,
        sort_order: existing.length,
      })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as PipelineCard;
  }

  async function moveCardToColumn(id: string, columnId: string) {
    const existing = cards.filter((c) => c.column_id === columnId);
    await updateCard(id, { column_id: columnId, sort_order: existing.length });
  }

  async function deleteCard(id: string) {
    const { error } = await supabase.from("pipeline_cards").delete().eq("id", id);
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
        .from("pipeline_card_tags")
        .insert(toAdd.map((tag_id) => ({ user_id: userId, card_id: cardId, tag_id })));
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await supabase.from("pipeline_card_tags").delete().eq("card_id", cardId).in("tag_id", toRemove);
      if (error) throw error;
    }
    if (toAdd.length || toRemove.length) await refresh();
  }

  // -- Notes ------------------------------------------------------------------
  async function addNote(cardId: string, body: string) {
    if (!userId) return;
    const { error } = await supabase.from("pipeline_notes").insert({ user_id: userId, card_id: cardId, body });
    if (error) throw error;
    await refresh();
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("pipeline_notes").delete().eq("id", id);
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
    addCardFromDeal,
    updateCard,
    moveCardToColumn,
    deleteCard,
    setCardTags,
    addNote,
    deleteNote,
  };
}
