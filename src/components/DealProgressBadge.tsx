import type { CSSProperties } from "react";
import { checklistProgress } from "../lib/dealChecklistProgress";
import type { DealChecklistItem } from "../types";

interface DealProgressBadgeProps {
  items: DealChecklistItem[];
}

// The compact "outside the card" status indicator for List rows and Board
// mini cards — a thin progress bar plus task/document counts, so a deal's
// checklist progress is visible without opening it.
export function DealProgressBadge({ items }: DealProgressBadgeProps) {
  const { doneTasks, totalTasks, doneDocs, totalDocs, percent } = checklistProgress(items);
  if (totalTasks + totalDocs === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 110, flexShrink: 0 }}>
      <div style={barTrackStyle}>
        <div style={{ ...barFillStyle, width: `${percent}%` }} />
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
        <span>
          Tasks {doneTasks}/{totalTasks}
        </span>
        <span>
          Docs {doneDocs}/{totalDocs}
        </span>
      </div>
    </div>
  );
}

const barTrackStyle: CSSProperties = {
  width: "100%",
  height: 5,
  borderRadius: 99,
  background: "var(--border)",
  overflow: "hidden",
};

const barFillStyle: CSSProperties = {
  height: "100%",
  background: "var(--accent)",
  borderRadius: 99,
};
