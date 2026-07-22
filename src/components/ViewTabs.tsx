import type { CSSProperties } from "react";

export type BoardSubView = "board" | "list" | "calendar" | "value";

const DEFAULT_ORDER: BoardSubView[] = ["board", "list", "calendar", "value"];
const LABELS: Record<BoardSubView, string> = {
  board: "Board",
  list: "List",
  calendar: "Calendar",
  value: "Value",
};

export function ViewTabs({
  active,
  onChange,
  order = DEFAULT_ORDER,
}: {
  active: BoardSubView;
  onChange: (view: BoardSubView) => void;
  order?: BoardSubView[];
}) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {order.map((view) => (
        <button key={view} onClick={() => onChange(view)} style={tabButtonStyle(active === view)}>
          {LABELS[view]}
        </button>
      ))}
    </div>
  );
}

const tabButtonStyle = (active: boolean): CSSProperties => ({
  background: active ? "var(--accent-strong)" : "none",
  border: "none",
  borderRadius: 8,
  color: active ? "#fff" : "var(--text-tertiary)",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 14px",
  cursor: "pointer",
});
