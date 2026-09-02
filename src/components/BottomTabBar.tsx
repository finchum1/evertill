import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { Page } from "../types";

interface BottomTabBarProps {
  page: Page;
  onSetPage: (page: Page) => void;
  navItems: { key: Page; label: string }[];
  hiddenModules: string[];
  // Renders an empty flex slot (LISTS_SLOT_ID) right after the nav item
  // with this key — e.g. "tasks" puts it between Tasks and Notes. App.tsx's
  // TasksDashboard/NotesDashboard portal a "Lists" trigger button into that
  // slot (see ListsSlotButton) so it visually sits inline with the tabs
  // despite belonging to whichever page-specific component currently has
  // its own folders/lists to show — undefined renders no slot at all,
  // which is what the CRM app's bar passes today.
  insertSlotAfterKey?: Page;
}

// The phone-width counterpart to TopNav's horizontal pill row (TopNav hides
// that row and App.tsx renders this instead, both keyed off the same
// useIsMobile() breakpoint) — a fixed bottom tab bar is how phone-native
// navigation actually reads on a small screen, and avoids the pill row
// wrapping onto a second line that TopNav used to do below ~700px (the
// exact "crowded, strange navigation" complaint this app's nav has already
// been reworked around once before).
export function BottomTabBar({ page, onSetPage, navItems, hiddenModules, insertSlotAfterKey }: BottomTabBarProps) {
  const visibleItems = navItems.filter((item) => !hiddenModules.includes(item.key));

  return (
    <nav style={barStyle}>
      {visibleItems.map((item) => {
        const active = page === item.key;
        return (
          <Fragment key={item.key}>
            <button className="native-tab-btn" onClick={() => onSetPage(item.key)} style={tabButtonStyle(active)}>
              {/* A plain block-level box with its own explicit width/height,
                  not just the <svg>'s own width/height attributes — iOS
                  Safari doesn't reliably respect an SVG's intrinsic size as
                  a flex item in a flex *column* (this one), rendering it at
                  a tiny fraction of 23x23 instead (confirmed on-device: a
                  few-px dot/line/rect where a full icon should be, in a
                  Chromium browser that never reproduced it). This wrapper's
                  own size is a normal block box, which Safari sizes
                  correctly, and the SVG just fills it via width/height:100%. */}
              <span style={ICON_SLOT_STYLE}>
                <TabIcon page={item.key} active={active} />
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 600 }}>{item.label}</span>
            </button>
            {item.key === insertSlotAfterKey && <div id={LISTS_SLOT_ID} style={{ flex: 1, display: "flex" }} />}
          </Fragment>
        );
      })}
    </nav>
  );
}

// Shared with App.tsx's ListsSlotButton, which portals its trigger button +
// sheet into whichever DOM node has this id.
export const LISTS_SLOT_ID = "bottom-tab-bar-lists-slot";

// Fixed height reserved by App.tsx's <main> padding-bottom so page content
// never renders underneath this bar — kept as one constant so the two stay
// in sync instead of two hand-tuned numbers drifting apart.
export const BOTTOM_TAB_BAR_HEIGHT = 54;

// Exported so App.tsx's ListsSlotButton (its icon sits inline among these
// same tabs) can size its own icon slot identically.
export const TAB_ICON_SIZE = 23;

export const ICON_SLOT_STYLE: CSSProperties = { width: TAB_ICON_SIZE, height: TAB_ICON_SIZE, flexShrink: 0 };

const barStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  height: BOTTOM_TAB_BAR_HEIGHT,
  display: "flex",
  // A translucent blurred "material," not a flat panel — reads as an
  // actual app-shell tab bar rather than a strip of the page glued to the
  // bottom, and lets scrolled content softly show through underneath.
  background: "color-mix(in srgb, var(--bg-panel) 82%, transparent)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderTop: "1px solid var(--border)",
  // A no-op in a normal browser tab (env() resolves to 0), but keeps this
  // bar clear of the home indicator if the page is ever added to the home
  // screen and launched full-screen instead.
  paddingBottom: "env(safe-area-inset-bottom)",
  paddingLeft: "env(safe-area-inset-left)",
  paddingRight: "env(safe-area-inset-right)",
  zIndex: 30,
};

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    background: "none",
    border: "none",
    color: active ? "var(--accent-light)" : "var(--text-muted)",
    cursor: "pointer",
  };
}

// A filled glyph for the active tab, thin outline otherwise — reads as a
// real app tab bar (Reminders, Music, Files, etc. all do this) rather than
// a flat color change, which reads more like a web nav pill.
//
// Every fill/stroke that needs the CSS variable goes through style={{}},
// never the bare fill=/stroke= JSX attribute — iOS Safari doesn't reliably
// resolve var() when it's set as a plain SVG presentation attribute rather
// than through an actual style declaration, so fill={color}/stroke={color}
// silently rendered as invisible icons there (labels below them were fine,
// since those are plain text, not touched by this at all). Chromium-based
// browsers resolve it either way, which is why this passed testing here
// and only broke on a real iPhone.
function TabIcon({ page, active }: { page: Page; active: boolean }) {
  const color = active ? "var(--accent-light)" : "var(--text-muted)";
  // "100%", not a fixed px number — this fills ICON_SLOT_STYLE's own
  // explicit width/height (see the wrapping <span> in BottomTabBar's map
  // above) rather than relying on the <svg>'s own intrinsic size, which
  // iOS Safari doesn't reliably respect as a flex-column item.
  const size = "100%";
  const outlineAttrs = { width: size, height: size, viewBox: "0 0 20 20", fill: "none" as const, strokeWidth: 1.6 };
  const outlineStyle = { stroke: color };
  switch (page) {
    case "tasks":
      return active ? (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="4" style={{ fill: color }} />
          {/* White, not the tab bar's own background — this checkmark sits
              against the solid accent fill above, not the page behind it.
              A literal hex, not a var(), so the bare attribute is fine. */}
          <path d="M6.5 10L8.5 12L13.5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg {...outlineAttrs} style={outlineStyle}>
          <rect x="3" y="3" width="14" height="14" rx="4" />
          <path d="M6.5 10L8.5 12L13.5 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "notes":
      return active ? (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <rect x="4" y="3" width="12" height="14" rx="2" style={{ fill: color }} />
          {/* White, not the tab bar's own background — same reasoning as
              the "tasks"/"deals" filled icons above: these lines sit
              against the solid accent fill, not the page behind it. */}
          <path d="M6.5 7H13.5M6.5 10H13.5M6.5 13H11" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg {...outlineAttrs} style={outlineStyle}>
          <rect x="4" y="3" width="12" height="14" rx="2" />
          <path d="M6.5 7H13.5M6.5 10H13.5M6.5 13H11" strokeLinecap="round" />
        </svg>
      );
    case "leads":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" strokeWidth={1.6} style={{ fill: active ? color : "none", stroke: active ? "none" : color }}>
          <path d="M3 4H17L12.5 10.5V16L7.5 14V10.5L3 4Z" strokeLinejoin="round" />
        </svg>
      );
    case "pipeline":
      return (
        <svg {...outlineAttrs} strokeWidth={active ? 2.1 : 1.6} style={outlineStyle}>
          <path d="M3 6H17M3 10H17M3 14H12" strokeLinecap="round" />
          <circle cx="17" cy="14" r="1.5" style={{ fill: color }} stroke="none" />
        </svg>
      );
    case "deals":
      return active ? (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="2.5" style={{ fill: color }} />
          <path d="M3 8.5H17" stroke="#fff" strokeWidth="1.4" />
          <path d="M6.5 12H10" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg {...outlineAttrs} style={outlineStyle}>
          <rect x="3" y="4" width="14" height="12" rx="2" />
          <path d="M3 8.5H17" />
          <path d="M6.5 12H10" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
