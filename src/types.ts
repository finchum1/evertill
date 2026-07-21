export const LIST_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
] as const;
export type ListColor = (typeof LIST_COLORS)[number];

export const LIST_COLOR_HEX: Record<ListColor, string> = {
  slate: "#64748b",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  pink: "#ec4899",
};

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

export interface TodoFolder {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface TodoList {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  color: ListColor;
  is_inbox: boolean;
  sort_order: number;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  list_id: string;
  title: string;
  description: string | null;
  due_date: string | null; // 'YYYY-MM-DD'
  completed: boolean;
  recurrence: Recurrence;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TodoSubtask {
  id: string;
  user_id: string;
  todo_id: string;
  title: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
}

// A "view" is either a special view key or a list's own id (list ids are
// UUIDs, so they never collide with the two special keys below).
export type View = "today" | "upcoming" | string;

export type Page = "tasks" | "leads" | "pipeline" | "deals";

// Lead columns reuse the same color palette as list colors (LIST_COLORS
// above) — one shared set of named colors across the app, not a separate one.
export interface LeadColumn {
  id: string;
  user_id: string;
  label: string;
  color: ListColor;
  sort_order: number;
  created_at: string;
}

export interface LeadCard {
  id: string;
  user_id: string;
  column_id: string;
  title: string;
  value: number;
  due_date: string | null; // 'YYYY-MM-DD' — "Next Activity"
  phone: string | null;
  email: string | null;
  address: string | null;
  tag_buyer: boolean;
  tag_listing: boolean;
  sort_order: number;
  last_activity_at: string | null;
  last_activity_text: string | null;
  created_at: string;
}

export interface LeadNote {
  id: string;
  user_id: string;
  card_id: string;
  body: string;
  created_at: string;
}

// Structurally identical to Leads above (same shared color palette, same
// card shape) plus source_lead_id — an informational-only pointer for the
// future Lead -> Pipeline conversion action, not acted on anywhere yet.
export interface PipelineColumn {
  id: string;
  user_id: string;
  label: string;
  color: ListColor;
  sort_order: number;
  created_at: string;
}

export interface PipelineCard {
  id: string;
  user_id: string;
  column_id: string;
  source_lead_id: string | null;
  title: string;
  value: number;
  due_date: string | null; // 'YYYY-MM-DD' — "Next Activity"
  phone: string | null;
  email: string | null;
  address: string | null;
  tag_buyer: boolean;
  tag_listing: boolean;
  sort_order: number;
  last_activity_at: string | null;
  last_activity_text: string | null;
  created_at: string;
}

export interface PipelineNote {
  id: string;
  user_id: string;
  card_id: string;
  body: string;
  created_at: string;
}

// Deals move through a FIXED set of stages (unlike Leads/Pipeline's
// user-customizable columns) and carry milestone dates + money/terms
// fields instead of contact tags.
export const DEAL_STATUSES = ["Active", "Under Contract", "Pending", "Closed"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];
export type DealType = "Buyer" | "Listing";

export interface Deal {
  id: string;
  user_id: string;
  address: string;
  type: DealType;
  status: DealStatus;
  value: number;
  price: number;
  earnest_money: number;
  concessions: number;
  loan_type: string | null;
  acceptance_date: string | null;
  inspection_date: string | null;
  appraisal_date: string | null;
  closing_date: string | null;
  sort_order: number;
  last_activity_at: string | null;
  last_activity_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealNote {
  id: string;
  user_id: string;
  deal_id: string;
  body: string;
  created_at: string;
}
