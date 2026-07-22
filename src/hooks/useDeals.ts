import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Deal, DealChecklistItem, DealChecklistKind, DealNote, DealType } from "../types";

export function useDeals(userId: string | undefined) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [checklistItems, setChecklistItems] = useState<DealChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [dealsRes, notesRes, checklistRes] = await Promise.all([
      supabase.from("deals").select("*").order("sort_order", { ascending: true }),
      supabase.from("deal_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("deal_checklist_items").select("*").order("sort_order", { ascending: true }),
    ]);
    if (dealsRes.error) throw dealsRes.error;
    if (notesRes.error) throw notesRes.error;
    // deal_checklist_items is a newer table that may not exist yet on a
    // database that hasn't had the latest schema.sql migration applied —
    // degrade to an empty checklist rather than blocking the whole Deals
    // page (deals/notes) from loading over an optional feature's table.
    if (checklistRes.error) console.warn("deal_checklist_items unavailable:", checklistRes.error.message);

    setDeals((dealsRes.data ?? []) as Deal[]);
    setNotes((notesRes.data ?? []) as DealNote[]);
    setChecklistItems((checklistRes.error ? [] : checklistRes.data ?? []) as DealChecklistItem[]);
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
      .channel("deals-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_notes" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_checklist_items" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  async function addDeal(address: string, type: DealType, acceptanceDate: string | null) {
    if (!userId) return;
    const existing = deals.filter((d) => d.status === "Active");
    const { data, error } = await supabase
      .from("deals")
      .insert({
        user_id: userId,
        address,
        type,
        acceptance_date: acceptanceDate,
        sort_order: existing.length,
      })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as Deal;
  }

  async function updateDeal(id: string, patch: Partial<Deal>) {
    const { error } = await supabase
      .from("deals")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteDeal(id: string) {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function addNote(dealId: string, body: string) {
    if (!userId) return;
    const { error } = await supabase.from("deal_notes").insert({ user_id: userId, deal_id: dealId, body });
    if (error) throw error;
    await refresh();
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("deal_notes").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function addChecklistItem(dealId: string, kind: DealChecklistKind, title: string) {
    if (!userId) return;
    const existing = checklistItems.filter((i) => i.deal_id === dealId && i.kind === kind);
    const { error } = await supabase
      .from("deal_checklist_items")
      .insert({ user_id: userId, deal_id: dealId, kind, title, group_label: "", sort_order: existing.length });
    if (error) throw error;
    await refresh();
  }

  async function toggleChecklistItem(id: string) {
    const item = checklistItems.find((i) => i.id === id);
    if (!item) return;
    const { error } = await supabase.from("deal_checklist_items").update({ done: !item.done }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteChecklistItem(id: string) {
    const { error } = await supabase.from("deal_checklist_items").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  return {
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
  };
}
