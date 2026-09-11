import type { CSSProperties } from "react";
import type { Page } from "../types";
import { usePrefersReducedTransparency } from "../hooks/useMediaQuery";
import { glassStyle } from "../lib/glass";

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
          <button key={item.key} className="native-tab-btn" onClick={() => onSetPage(item.key)} style={tabButtonStyle(active)}>
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

// Fixed height reserved by App.tsx's <main> padding-bottom so page content
// never renders underneath this bar — kept as one constant so the two stay
// in sync instead of two hand-tuned numbers drifting apart.
export const BOTTOM_TAB_BAR_HEIGHT = 54;

// Exported so LeftNav.tsx's own nav rows can size their icon slot with the
// same wrapper-span pattern (see the comment above), just at their own size.
export const TAB_ICON_SIZE = 23;

export const ICON_SLOT_STYLE: CSSProperties = { width: TAB_ICON_SIZE, height: TAB_ICON_SIZE, flexShrink: 0 };

function barStyle(reduceTransparency: boolean): CSSProperties {
  return {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    // BOTTOM_TAB_BAR_HEIGHT is the actual content height (icon + label);
    // the safe-area inset is added on top of it here, not carved out of it.
    // Everything on the page uses the global `* { box-sizing: border-box }`
    // (index.css), so a plain `height: BOTTOM_TAB_BAR_HEIGHT` would count
    // paddingBottom below as part of that same 54px box — on a phone with a
    // home indicator (safe-area-inset-bottom ~34px) that left only ~20px of
    // real content room for the ~40px-tall icon+label stack, which overflowed
    // evenly above and below the box (justifyContent: center) and rendered
    // as the bar's own top border cutting through the middle of the icon.
    height: `calc(${BOTTOM_TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
    display: "flex",
    // The "Liquid Glass" material (lib/glass.ts) — translucent, blurred,
    // saturated, with a light-catching top-edge highlight — so this reads
    // as an actual floating app-shell tab bar rather than a strip of the
    // page glued to the bottom, and lets scrolled content softly show
    // through underneath as it passes.
    ...glassStyle(reduceTransparency),
    borderTop: "1px solid var(--border)",
    // A no-op in a normal browser tab (env() resolves to 0), but keeps this
    // bar clear of the home indicator if the page is ever added to the home
    // screen and launched full-screen instead.
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
    paddingRight: "env(safe-area-inset-right)",
    zIndex: 30,
  };
}

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
