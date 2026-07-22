import type { DealChecklistItem } from "../types";

export interface ChecklistProgress {
  doneTasks: number;
  totalTasks: number;
  doneDocs: number;
  totalDocs: number;
  percent: number;
}

// "% complete" combines tasks and documents into one number (matches how the
// old teenyapp's deal overview computed it) rather than tracking two
// separate percentages.
export function checklistProgress(items: DealChecklistItem[]): ChecklistProgress {
  const tasks = items.filter((i) => i.kind === "task");
  const docs = items.filter((i) => i.kind === "document");
  const doneTasks = tasks.filter((i) => i.done).length;
  const doneDocs = docs.filter((i) => i.done).length;
  const total = tasks.length + docs.length;
  const percent = total === 0 ? 0 : Math.round(((doneTasks + doneDocs) / total) * 100);
  return { doneTasks, totalTasks: tasks.length, doneDocs, totalDocs: docs.length, percent };
}
