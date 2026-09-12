import type { CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Page } from "../types";
import type { Profile } from "../hooks/useProfile";
import { Avatar } from "./Avatar";
import { ThemeToggleButton } from "./Header";
import { ModuleIcon, TAB_ICON_SIZE } from "./BottomTabBar";
import { PipelineWordmark } from "./PipelineWordmark";
import { usePrefersReducedTransparency } from "../hooks/useMediaQuery";
import { glassStyle, glassChipStyle, glassBubbleStyle } from "../lib/glass";

interface LeftNavProps {
  session: Session;
  profile: Profile | null;
  page: Page;
  onSetPage: (page: Page) => void;
  hiddenModules: string[];
  themeEffective: "dark" | "light";
  onToggleTheme: () => void;
  navItems: { key: Page; label: string }[];
}

// Desktop's persistent left rail — Pipeline being a single, CRM-focused app
// now (Tasks+Notes and the horizontal two-app TopNav/switchApp split have
// been removed entirely) reads better as a vertical sidebar than a
// horizontal bar, the way most single-purpose CRMs are laid out. Mobile
// keeps BottomTabBar.tsx instead (same navItems/hiddenModules, same
// ModuleIcon glyphs) — App.tsx renders exactly one of the two based on
// useIsMobile(), never both.
export function LeftNav({ session, profile, page, onSetPage, hiddenModules, themeEffective, onToggleTheme, navItems }: LeftNavProps) {
  const visibleNavItems = navItems.filter((item) => !hiddenModules.includes(item.key));
  const reduceTransparency = usePrefersReducedTransparency();

  return (
    <nav style={{ ...railStyle, ...glassStyle(reduceTransparency, true) }}>
      <div style={{ padding: "4px 10px 22px" }}>
        <PipelineWordmark themeEffective={themeEffective} iconSize={24} fontSize={16} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {visibleNavItems.map((item) => {
          const active = page === item.key;
          return (
            <button key={item.key} onClick={() => onSetPage(item.key)} style={navRowStyle(active, reduceTransparency)}>
              <span style={{ width: TAB_ICON_SIZE, height: TAB_ICON_SIZE, flexShrink: 0 }}>
                <ModuleIcon page={item.key} active={active} />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <ThemeToggleButton effective={themeEffective} onToggle={onToggleTheme} />
        <button onClick={() => onSetPage("settings")} title="Go to Settings" style={accountRowStyle(page === "settings")}>
          <Avatar name={profile?.full_name || session.user.email} avatarDataUrl={profile?.avatar_data_url} size={30} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: page === "settings" ? "var(--text-primary)" : "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {profile?.full_name || session.user.email}
          </span>
        </button>
      </div>
    </nav>
  );
}

const SIDEBAR_MARGIN = 16;

const railStyle: CSSProperties = {
  width: 232,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  padding: "20px 14px",
  border: "1px solid color-mix(in srgb, var(--border-strong) 55%, transparent)",
  borderRadius: 20,
  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
  // A detached floating panel (Liquid Glass's actual signature — see
  // BottomTabBar.tsx's own floating pill) rather than a flush edge-to-edge
  // rail: inset from the top/left/bottom, with the content column sitting
  // right up against its right edge. alignSelf: flex-start keeps this
  // box's own height from being stretched to match its (often much taller)
  // sibling — without that, position: sticky below would have no room to
  // ever actually "stick," since the box would already span the full
  // scrollable height.
  margin: `${SIDEBAR_MARGIN}px 0 ${SIDEBAR_MARGIN}px ${SIDEBAR_MARGIN}px`,
  alignSelf: "flex-start",
  position: "sticky",
  top: SIDEBAR_MARGIN,
  height: `calc(100dvh - ${SIDEBAR_MARGIN * 2}px)`,
};

// The active row is the same clear glass bubble (lib/glass.ts) ViewTabs'
// active tab uses — a lifted, translucent capsule with the accent color
// carried by its label text, not a flat colored-tint rectangle.
function navRowStyle(active: boolean, reduceTransparency: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    borderRadius: 12,
    color: active ? "var(--accent-light)" : "var(--text-secondary)",
    fontSize: 13,
    fontWeight: active ? 700 : 600,
    padding: "9px 10px",
    cursor: "pointer",
    transition: "background 120ms ease, color 120ms ease",
    ...(active ? glassBubbleStyle(reduceTransparency) : { background: "transparent" }),
  };
}

// A lifted glass "chip" (lib/glass.ts), not another blurred glass layer —
// this already sits inside the sidebar's own glass panel, so it reads as a
// solid capsule resting on top of the glass rather than a second pane of
// it (see glassChipStyle's own comment on why stacking blur is avoided).
function accountRowStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    borderRadius: 999,
    padding: "6px 12px 6px 6px",
    cursor: "pointer",
    ...glassChipStyle(active),
  };
}
