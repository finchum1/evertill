import type { CSSProperties } from "react";

// Board sub-views (Leads/Pipeline/Deals) are the original and still only
// consumer of this shape — kept here (rather than inline per dashboard in
// App.tsx) since all three call sites need the same key/label pairing.
export type BoardSubView = "board" | "list" | "calendar" | "value";
export const BOARD_VIEW_LABELS: Record<BoardSubView, string> = {
  board: "Board",
  list: "List",
  calendar: "Calendar",
  value: "Value",
};
export const DEFAULT_BOARD_VIEW_ORDER: BoardSubView[] = ["board", "list", "calendar", "value"];

// Generic pill-tab row — originally board-sub-view-specific, generalized so
// Tasks' own Today/Upcoming/Calendar/Completed switcher (App.tsx's
// TasksViewTabs) can reuse the identical visual language via a plain
// {key, label} array instead of a bespoke copy of tabButtonStyle. The
// optional `badge` renders a small count next to a tab's label — Tasks
// uses this for due-today/due-later counts, board sub-views don't need it.
export function ViewTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; badge?: number }[];
  // Plain string, not T — Tasks' own view state can be a list id that
  // matches none of these tabs (viewing a specific list rather than one of
  // Today/Upcoming/Calendar/Completed), and that's a legitimate "nothing
  // highlighted" state, not an error, so this shouldn't require active to
  // be a member of T.
  active: string;
  onChange: (view: T) => void;
}) {
  return (
    // nowrap + horizontal scroll rather than flexWrap — on a narrow
    // viewport this row often shares its top line with a sidebar's own
    // hamburger trigger (SidebarDrawer's default positioning), so wrapping
    // staircased into 2-3 broken-looking lines instead of just scrolling
    // sideways, which is the standard, native-feeling way iOS itself
    // handles an overflowing segmented/chip row.
    <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto" }}>
      {tabs.map((tab) => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={tabButtonStyle(active === tab.key)}>
          {tab.label}
          {!!tab.badge && (
            <span style={{ fontSize: 11, marginLeft: 6, opacity: active === tab.key ? 0.85 : 0.65 }}>{tab.badge}</span>
          )}
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
  flexShrink: 0,
  whiteSpace: "nowrap",
});
