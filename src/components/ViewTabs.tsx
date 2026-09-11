import type { CSSProperties } from "react";
import { usePrefersReducedTransparency } from "../hooks/useMediaQuery";
import { glassStyle, glassBubbleStyle } from "../lib/glass";

// Board sub-views (Leads/Pipeline/Deals) are the original and still only
// consumer of this shape — kept here (rather than inline per dashboard in
// App.tsx) since all three call sites need the same key/label pairing.
// "agents" is Deals-only (App.tsx's DEALS_VIEW_ORDER is the only place that
// includes it - Leads/Pipeline keep using DEFAULT_BOARD_VIEW_ORDER below,
// which never lists it) but lives in this shared union rather than a
// separate Deals-specific type, since BoardSubView is already the one type
// all three boards' subView state shares.
export type BoardSubView = "board" | "list" | "agents" | "calendar" | "value";
export const BOARD_VIEW_LABELS: Record<BoardSubView, string> = {
  board: "Board",
  list: "List",
  agents: "Agents",
  calendar: "Calendar",
  value: "Value",
};
export const DEFAULT_BOARD_VIEW_ORDER: BoardSubView[] = ["board", "list", "calendar", "value"];

// Generic pill-tab row shared by Leads/Pipeline/Transactions' own board
// sub-view switchers (Board/List/Calendar/Value, plus Transactions' own
// "Agents" tab) via a plain {key, label} array instead of each dashboard
// keeping a bespoke copy of tabButtonStyle. The optional `badge` renders a
// small count next to a tab's label, for any future consumer that needs one
// (no current one does).
export function ViewTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; badge?: number }[];
  active: T;
  onChange: (view: T) => void;
}) {
  const reduceTransparency = usePrefersReducedTransparency();

  return (
    // nowrap + horizontal scroll rather than flexWrap — on a narrow
    // viewport this row often shares its top line with a sidebar's own
    // hamburger trigger (SidebarDrawer's default positioning), so wrapping
    // staircased into 2-3 broken-looking lines instead of just scrolling
    // sideways, which is the standard, native-feeling way iOS itself
    // handles an overflowing segmented/chip row.
    //
    // A glass track (lib/glass.ts) with the active tab as its own clear
    // glass bubble (glassBubbleStyle) riding on top — the same segmented-
    // control-on-glass pattern iOS itself uses, and unlike LeftNav's
    // account row this track sits directly on the plain page background,
    // not on another glass surface, so a real blurred layer here doesn't
    // stack translucency on translucency.
    <div style={{ display: "inline-flex", gap: 4, flexWrap: "nowrap", overflowX: "auto", padding: 4, borderRadius: 14, ...glassStyle(reduceTransparency) }}>
      {tabs.map((tab) => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={tabButtonStyle(active === tab.key, reduceTransparency)}>
          {tab.label}
          {!!tab.badge && (
            <span style={{ fontSize: 11, marginLeft: 6, opacity: active === tab.key ? 0.85 : 0.65 }}>{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// The active tab is a clear glass bubble (lib/glass.ts) carrying the accent
// color on its own LABEL text, not a solid accent-colored fill — asked for
// after a solid-red "Board" pill read as a flat colored rectangle rather
// than glass.
const tabButtonStyle = (active: boolean, reduceTransparency: boolean): CSSProperties => ({
  border: "none",
  borderRadius: 10,
  color: active ? "var(--accent-light)" : "var(--text-tertiary)",
  fontSize: 13,
  fontWeight: 700,
  padding: "6px 14px",
  cursor: "pointer",
  flexShrink: 0,
  whiteSpace: "nowrap",
  ...(active ? glassBubbleStyle(reduceTransparency) : { background: "none" }),
});
