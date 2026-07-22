import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    setProfile(data as Profile);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  async function updateProfile(patch: Partial<Pick<Profile, "full_name" | "company_name">>) {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
    await refresh();
  }

  return { profile, loading, updateProfile };
}
