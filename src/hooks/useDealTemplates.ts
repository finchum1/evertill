import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { DealChecklistKind, DealTemplate, DealTemplateItem, DealType } from "../types";
import type { ParsedChecklistItem } from "../lib/checklistImport";

const DEAL_TYPES: DealType[] = ["Buyer", "Listing"];

// A brand-new user (or an existing account with zero templates of a given
// deal type) gets one starter default per type — same ensureX()-on-load
// pattern as ensureInboxList — so a new deal of either type always has
// something reasonable to copy from instead of an empty checklist.
const STARTER_ITEMS: { kind: DealChecklistKind; title: string }[] = [
  { kind: "task", title: "Open escrow" },
  { kind: "task", title: "Schedule inspection" },
  { kind: "task", title: "Order appraisal" },
  { kind: "task", title: "Confirm loan approval" },
  { kind: "task", title: "Schedule closing" },
  { kind: "document", title: "Purchase agreement" },
  { kind: "document", title: "Disclosures" },
  { kind: "document", title: "Inspection report" },
  { kind: "document", title: "Appraisal report" },
  { kind: "document", title: "Closing statement" },
];

export function useDealTemplates(userId: string | undefined) {
  const [templates, setTemplates] = useState<DealTemplate[]>([]);
  const [items, setItems] = useState<DealTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ensuring = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [templatesRes, itemsRes] = await Promise.all([
      supabase.from("deal_templates").select("*").order("sort_order", { ascending: true }),
      supabase.from("deal_template_items").select("*").order("sort_order", { ascending: true }),
    ]);
    // deal_templates/deal_template_items are new tables that may not exist
    // yet on a database that hasn't had the latest schema.sql migration
    // applied — degrade to empty rather than getting stuck loading forever.
    if (templatesRes.error) console.warn("deal_templates unavailable:", templatesRes.error.message);
    if (itemsRes.error) console.warn("deal_template_items unavailable:", itemsRes.error.message);
    setTemplates((templatesRes.error ? [] : templatesRes.data ?? []) as DealTemplate[]);
    setItems((itemsRes.error ? [] : itemsRes.data ?? []) as DealTemplateItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("deal-templates-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_templates" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_template_items" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const ensureDefaultTemplates = useCallback(async () => {
    if (!userId || loading) return;
    const missingTypes = DEAL_TYPES.filter((t) => !templates.some((tpl) => tpl.deal_type === t));
    if (missingTypes.length === 0) return;
    if (ensuring.current) return ensuring.current;
    ensuring.current = (async () => {
      try {
        for (const dealType of missingTypes) {
          const { data: template, error } = await supabase
            .from("deal_templates")
            .insert({ user_id: userId, name: `${dealType} default`, deal_type: dealType, is_default: true, sort_order: 0 })
            .select()
            .single();
          if (error) {
            // 23505 just means another concurrent call already won the race
            // to seed this type's default; any other error (e.g. the table
            // not existing yet pending the latest migration) is non-fatal
            // here too — there's simply no default template until it's fixed.
            if (error.code !== "23505") console.warn("ensureDefaultTemplates insert failed:", error.message);
            continue;
          }
          await supabase
            .from("deal_template_items")
            .insert(STARTER_ITEMS.map((it, i) => ({ user_id: userId, template_id: template.id, kind: it.kind, title: it.title, sort_order: i })));
        }
      } finally {
        await refresh();
        ensuring.current = null;
      }
    })();
    return ensuring.current;
  }, [userId, loading, templates, refresh]);

  useEffect(() => {
    ensureDefaultTemplates();
  }, [ensureDefaultTemplates]);

  async function addTemplate(name: string, dealType: DealType) {
    if (!userId) return;
    const existing = templates.filter((t) => t.deal_type === dealType);
    const { data, error } = await supabase
      .from("deal_templates")
      .insert({ user_id: userId, name, deal_type: dealType, is_default: false, sort_order: existing.length })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data as DealTemplate;
  }

  async function renameTemplate(id: string, name: string) {
    const { error } = await supabase.from("deal_templates").update({ name }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteTemplate(id: string) {
    const template = templates.find((t) => t.id === id);
    const { error } = await supabase.from("deal_templates").delete().eq("id", id);
    if (error) throw error;
    // Promote another template of the same type to default so a type is
    // never left without one, mirroring how deleting the Inbox list isn't
    // allowed to leave zero lists.
    if (template?.is_default) {
      const remaining = templates.filter((t) => t.id !== id && t.deal_type === template.deal_type);
      if (remaining.length > 0) {
        await supabase.from("deal_templates").update({ is_default: true }).eq("id", remaining[0].id);
      }
    }
    await refresh();
  }

  async function setDefaultTemplate(id: string) {
    if (!userId) return;
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    // Clear the old default for this deal type first — the partial unique
    // index only allows one is_default=true row per (user, deal_type).
    await supabase
      .from("deal_templates")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("deal_type", template.deal_type)
      .eq("is_default", true);
    const { error } = await supabase.from("deal_templates").update({ is_default: true }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function addItem(templateId: string, kind: DealChecklistKind, title: string, groupLabel: string) {
    if (!userId) return;
    const existing = items.filter((i) => i.template_id === templateId && i.kind === kind);
    const { error } = await supabase
      .from("deal_template_items")
      .insert({ user_id: userId, template_id: templateId, kind, title, group_label: groupLabel, sort_order: existing.length });
    if (error) throw error;
    await refresh();
  }

  async function bulkImportItems(templateId: string, kind: DealChecklistKind, parsed: ParsedChecklistItem[]) {
    if (!userId || parsed.length === 0) return;
    const existingCount = items.filter((i) => i.template_id === templateId && i.kind === kind).length;
    const { error } = await supabase.from("deal_template_items").insert(
      parsed.map((p, i) => ({
        user_id: userId,
        template_id: templateId,
        kind,
        title: p.title,
        group_label: p.group_label,
        sort_order: existingCount + i,
      }))
    );
    if (error) throw error;
    await refresh();
  }

  async function renameItem(id: string, title: string) {
    const { error } = await supabase.from("deal_template_items").update({ title }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("deal_template_items").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // Copies the given deal type's default template's items onto a
  // freshly-created deal. Called once, right after addDeal — a plain insert
  // into deal_checklist_items, picked up by useDeals' own realtime
  // subscription rather than returned here, since templates and per-deal
  // checklists are two different hooks.
  async function seedDealChecklist(dealId: string, dealType: DealType) {
    if (!userId) return;
    const defaultTemplate = templates.find((t) => t.is_default && t.deal_type === dealType);
    if (!defaultTemplate) return;
    const templateItems = items.filter((i) => i.template_id === defaultTemplate.id);
    if (templateItems.length === 0) return;
    const { error } = await supabase.from("deal_checklist_items").insert(
      templateItems.map((it) => ({
        user_id: userId,
        deal_id: dealId,
        kind: it.kind,
        title: it.title,
        group_label: it.group_label,
        sort_order: it.sort_order,
      }))
    );
    if (error) throw error;
  }

  return {
    templates,
    items,
    loading,
    addTemplate,
    renameTemplate,
    deleteTemplate,
    setDefaultTemplate,
    addItem,
    bulkImportItems,
    renameItem,
    deleteItem,
    seedDealChecklist,
  };
}
