import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Deal, DealNote, DealType } from "../types";

export function useDeals(userId: string | undefined) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [dealsRes, notesRes] = await Promise.all([
      supabase.from("deals").select("*").order("sort_order", { ascending: true }),
      supabase.from("deal_notes").select("*").order("created_at", { ascending: false }),
    ]);
    if (dealsRes.error) throw dealsRes.error;
    if (notesRes.error) throw notesRes.error;

    setDeals((dealsRes.data ?? []) as Deal[]);
    setNotes((notesRes.data ?? []) as DealNote[]);
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

  return { deals, notes, loading, addDeal, updateDeal, deleteDeal, addNote, deleteNote };
}
