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
