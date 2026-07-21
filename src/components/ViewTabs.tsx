import type { CSSProperties } from "react";

export type BoardSubView = "board" | "list" | "calendar" | "value";

const SUB_VIEWS: BoardSubView[] = ["board", "list", "calendar", "value"];
const LABELS: Record<BoardSubView, string> = {
  board: "Board",
  list: "List",
  calendar: "Calendar",
  value: "Value",
};

export function ViewTabs({ active, onChange }: { active: BoardSubView; onChange: (view: BoardSubView) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {SUB_VIEWS.map((view) => (
        <button key={view} onClick={() => onChange(view)} style={tabButtonStyle(active === view)}>
          {LABELS[view]}
        </button>
      ))}
    </div>
  );
}

const tabButtonStyle = (active: boolean): CSSProperties => ({
  background: active ? "#4f46e5" : "none",
  border: "none",
  borderRadius: 8,
  color: active ? "#fff" : "#94a3b8",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 14px",
  cursor: "pointer",
});
