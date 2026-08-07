import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ListColor, Tag } from "../types";

// One shared tag list (Settings > Tags) used by both Leads and Pipeline —
// same "one hook, both modules read/write the same rows" shape as the
// shared ListColor palette, not two separate tag systems.
export function useTags(userId: string | undefined) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("tags").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    setTags((data ?? []) as Tag[]);
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
      .channel("tags-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  async function addTag(label: string, color: ListColor = "blue") {
    if (!userId) return;
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, label, color, sort_order: tags.length })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as Tag;
  }

  async function renameTag(id: string, label: string) {
    const { error } = await supabase.from("tags").update({ label }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function setTagColor(id: string, color: ListColor) {
    const { error } = await supabase.from("tags").update({ color }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteTag(id: string) {
    // Cascades its lead_card_tags/pipeline_card_tags links via ON DELETE
    // CASCADE — no separate cleanup call needed.
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  return { tags, loading, addTag, renameTag, setTagColor, deleteTag };
}
