import type { CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Page } from "../types";
import type { Profile } from "../hooks/useProfile";
import { Avatar } from "./Avatar";
import { ThemeToggleButton } from "./Header";
import { ModuleIcon, TAB_ICON_SIZE } from "./BottomTabBar";

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

  return (
    <nav style={railStyle}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", padding: "4px 10px 22px" }}>
        Pipeline
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {visibleNavItems.map((item) => {
          const active = page === item.key;
          return (
            <button key={item.key} onClick={() => onSetPage(item.key)} style={navRowStyle(active)}>
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

const railStyle: CSSProperties = {
  width: 232,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  padding: "20px 14px",
  borderRight: "1px solid var(--border)",
  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
  // A real sidebar, not page content that happens to sit on the left — it
  // scrolls on its own if the nav list ever grows past viewport height,
  // independent of whichever dashboard is scrolling on the right.
  minHeight: "100dvh",
};

// Same translucent color-mix pill TopNav's old horizontal navItemStyle used
// (and LeadsBoard/PipelineBoard's tag pills elsewhere) — one shared "active"
// treatment across the app rather than a new one invented for this rail.
function navRowStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
    border: "none",
    borderRadius: 8,
    color: active ? "var(--accent-light)" : "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 10px",
    cursor: "pointer",
    transition: "background 120ms ease, color 120ms ease",
  };
}

function accountRowStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: active ? "var(--border)" : "none",
    border: "none",
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
  };
}
