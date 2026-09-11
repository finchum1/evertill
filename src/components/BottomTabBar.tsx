import type { CSSProperties } from "react";
import type { Page } from "../types";
import { usePrefersReducedTransparency } from "../hooks/useMediaQuery";
import { glassStyle, glassBubbleStyle } from "../lib/glass";

interface BottomTabBarProps {
  page: Page;
  onSetPage: (page: Page) => void;
  navItems: { key: Page; label: string }[];
  hiddenModules: string[];
}

// The phone-width counterpart to LeftNav.tsx's vertical rail (App.tsx
// renders this instead on mobile, LeftNav on desktop, both keyed off the
// same useIsMobile() breakpoint) — a fixed bottom tab bar is how phone-
// native navigation actually reads on a small screen.
export function BottomTabBar({ page, onSetPage, navItems, hiddenModules }: BottomTabBarProps) {
  const visibleItems = navItems.filter((item) => !hiddenModules.includes(item.key));
  const reduceTransparency = usePrefersReducedTransparency();

  return (
    <nav style={barStyle(reduceTransparency)}>
      {visibleItems.map((item) => {
        const active = page === item.key;
        return (
          <button key={item.key} className="native-tab-btn" onClick={() => onSetPage(item.key)} style={tabButtonStyle(active, reduceTransparency)}>
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
              <ModuleIcon page={item.key} active={active} />
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 600 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// The bar's own content height — unrelated to safe-area insets now (see
// barStyle below), unlike the old edge-to-edge version where this constant
// had to account for them internally.
export const BOTTOM_TAB_BAR_HEIGHT = 60;

// How far the floating pill sits inset from the screen edges/bottom — the
// actual "Liquid Glass" signature (iOS 26's redesigned tab bar) is a
// rounded pill that visibly floats above content with a gap all around it,
// not a strip glued flush to the edges the way this bar used to render.
const SIDE_MARGIN = 16;
// Was 14 - fine in a plain Safari tab (env(safe-area-inset-bottom) is 0
// there), but combined with a real home indicator's ~34px inset once
// installed to the home screen and launched standalone, the pill sat with
// a noticeably large, "floating too high" gap below it. 8px still clears
// the indicator (the safe-area env() addition below is what actually does
// that job) while sitting closer to the true bottom edge.
const BOTTOM_MARGIN = 8;

// Total space App.tsx's <main> needs to reserve in its padding-bottom so
// page content never renders underneath the floating pill — height, the
// margin below it, and a little extra breathing room above it, kept as one
// constant so it and the bar's own layout can't drift apart from each
// other's hand-tuned numbers.
export const BOTTOM_TAB_BAR_CLEARANCE = BOTTOM_TAB_BAR_HEIGHT + BOTTOM_MARGIN + 12;

// Exported so LeftNav.tsx's own nav rows can size their icon slot with the
// same wrapper-span pattern (see the comment above), just at their own size.
export const TAB_ICON_SIZE = 23;

export const ICON_SLOT_STYLE: CSSProperties = { width: TAB_ICON_SIZE, height: TAB_ICON_SIZE, flexShrink: 0 };

function barStyle(reduceTransparency: boolean): CSSProperties {
  return {
    position: "fixed",
    // max(), not a flat SIDE_MARGIN — on a landscape phone with a notch,
    // env(safe-area-inset-left/right) can exceed this margin on its own;
    // without the max() the pill would render half-hidden under the notch
    // instead of just sitting a bit further from the true screen edge.
    left: `max(${SIDE_MARGIN}px, env(safe-area-inset-left))`,
    right: `max(${SIDE_MARGIN}px, env(safe-area-inset-right))`,
    bottom: `calc(${BOTTOM_MARGIN}px + env(safe-area-inset-bottom))`,
    height: BOTTOM_TAB_BAR_HEIGHT,
    borderRadius: BOTTOM_TAB_BAR_HEIGHT / 2,
    display: "flex",
    padding: "0 6px",
    // The "Liquid Glass" material (lib/glass.ts) — translucent, blurred,
    // saturated, brightened, with a diagonal sheen and a real elevation
    // shadow (this is a floating pill now, not a flush edge-to-edge strip)
    // — so this reads as an actual physical surface hovering above
    // whatever's scrolling underneath it, not a strip of the page glued to
    // the bottom.
    ...glassStyle(reduceTransparency, true),
    border: "1px solid color-mix(in srgb, var(--border-strong) 55%, transparent)",
    zIndex: 30,
  };
}

// The active tab gets its own small clear glass bubble (lib/glass.ts) —
// margin insets it a few px from the bar's own top/bottom edges so the
// bubble reads as a distinct rounded shape sitting inside the pill, not a
// full-height block spanning it. No backdrop-filter of its own (same
// reasoning as every other glassBubbleStyle/glassChipStyle use in this
// app) — it's already resting on the bar's own already-blurred glass.
function tabButtonStyle(active: boolean, reduceTransparency: boolean): CSSProperties {
  return {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    border: "none",
    color: active ? "var(--accent-light)" : "var(--text-muted)",
    cursor: "pointer",
    margin: "6px 3px",
    borderRadius: 16,
    ...(active ? glassBubbleStyle(reduceTransparency) : { background: "none" }),
  };
}

// A filled glyph for the active tab, thin outline otherwise — reads as a
// real app tab bar (Reminders, Music, Files, etc. all do this) rather than
// a flat color change, which reads more like a web nav pill. Exported so
// LeftNav.tsx's desktop rail uses the exact same glyphs as this bar rather
// than a second hand-drawn set that could drift out of sync with it.
//
// Every fill/stroke that needs the CSS variable goes through style={{}},
// never the bare fill=/stroke= JSX attribute — iOS Safari doesn't reliably
// resolve var() when it's set as a plain SVG presentation attribute rather
// than through an actual style declaration, so fill={color}/stroke={color}
// silently rendered as invisible icons there (labels below them were fine,
// since those are plain text, not touched by this at all). Chromium-based
// browsers resolve it either way, which is why this passed testing here
// and only broke on a real iPhone.
export function ModuleIcon({ page, active }: { page: Page; active: boolean }) {
  const color = active ? "var(--accent-light)" : "var(--text-muted)";
  // "100%", not a fixed px number — this fills the wrapping span's own
  // explicit width/height (ICON_SLOT_STYLE here, LeftNav's own equivalent
  // there) rather than relying on the <svg>'s own intrinsic size, which iOS
  // Safari doesn't reliably respect as a flex-column item.
  const size = "100%";
  const outlineAttrs = { width: size, height: size, viewBox: "0 0 20 20", fill: "none" as const, strokeWidth: 1.6 };
  const outlineStyle = { stroke: color };
  switch (page) {
    case "home":
      return active ? (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M3 9L10 3L17 9V16.5C17 17.05 16.55 17.5 16 17.5H12.5V12.5H7.5V17.5H4C3.45 17.5 3 17.05 3 16.5V9Z" style={{ fill: color }} />
        </svg>
      ) : (
        <svg {...outlineAttrs} style={outlineStyle}>
          <path d="M3 9L10 3L17 9V16.5C17 17.05 16.55 17.5 16 17.5H12.5V12.5H7.5V17.5H4C3.45 17.5 3 17.05 3 16.5V9Z" strokeLinejoin="round" />
        </svg>
      );
    case "leads":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" strokeWidth={1.6} style={{ fill: active ? color : "none", stroke: active ? "none" : color }}>
          <path d="M3 4H17L12.5 10.5V16L7.5 14V10.5L3 4Z" strokeLinejoin="round" />
        </svg>
      );
    case "pipeline":
      // A kanban board — three columns of varying height, the way Trello/
      // Linear-style board icons read at a glance — replacing the old
      // three-line-plus-dot glyph, which read more like a filter/funnel
      // than a board.
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" strokeWidth={1.6} style={{ fill: active ? color : "none", stroke: active ? "none" : color }}>
          <rect x="3" y="3" width="4" height="14" rx="1.3" />
          <rect x="8" y="3" width="4" height="9" rx="1.3" />
          <rect x="13" y="3" width="4" height="14" rx="1.3" />
        </svg>
      );
    case "deals":
      // A dollar sign — replacing the old document/card glyph, which read
      // as generic paperwork rather than the actual financial transactions
      // this module tracks.
      return active ? (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="4" style={{ fill: color }} />
          <path d="M10 6V14M13 8H8.6a1.5 1.5 0 1 0 0 3H11.4a1.5 1.5 0 1 1 0 3H7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg {...outlineAttrs} style={outlineStyle}>
          <path d="M10 6V14M13 8H8.6a1.5 1.5 0 1 0 0 3H11.4a1.5 1.5 0 1 1 0 3H7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
