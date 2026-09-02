import type { Session } from "@supabase/supabase-js";
import type { Page } from "../types";
import type { Profile } from "../hooks/useProfile";
import { useIsMobile } from "../hooks/useMediaQuery";
import { CreateMenu } from "./CreateMenu";
import type { CreateType } from "./CreateMenu";
import { Avatar } from "./Avatar";
import { ThemeToggleButton } from "./Header";

interface TopNavProps {
  session: Session;
  profile: Profile | null;
  page: Page;
  onSetPage: (page: Page) => void;
  onCreate: (type: CreateType) => void;
  hiddenModules: string[];
  themeEffective: "dark" | "light";
  onToggleTheme: () => void;
  // Which modules THIS app's bar switches between, and which +Create
  // types it offers — the two apps (Tasks+Notes vs Leads+Pipeline+Deals)
  // are otherwise identical shells, just scoped to a different subset.
  navItems: { key: Page; label: string }[];
  createTypes: CreateType[];
  // A small, deliberately secondary link to the other app — the whole
  // point of splitting into two shells is each one only shows what's
  // relevant to it, so this stays a plain text link off to the side
  // rather than another nav-weight item competing with navItems.
  otherAppLabel: string;
  onSwitchApp: () => void;
}

// The signed-in app's own navigation — module switcher, +Create, account
// — as a horizontal top bar. Two different apps (TasksApp/CRMApp in
// App.tsx) each render one of these scoped to their own subset of
// modules, rather than one shared switcher covering all five modules at
// once (that was LeftNav.tsx, since removed — a single five-module rail
// was the wrong direction once the two module groups needed to feel like
// genuinely separate apps rather than one crowded one).
export function TopNav({
  session,
  profile,
  page,
  onSetPage,
  onCreate,
  hiddenModules,
  themeEffective,
  onToggleTheme,
  navItems,
  createTypes,
  otherAppLabel,
  onSwitchApp,
}: TopNavProps) {
  const visibleNavItems = navItems.filter((item) => !hiddenModules.includes(item.key));
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", rowGap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Evertill</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CreateMenu onSelect={onCreate} hiddenModules={hiddenModules} allowedTypes={createTypes} />
          {/* On phone widths, BottomTabBar.tsx (rendered by App.tsx below
              <main>) takes over module navigation instead — this same pill
              row wrapping onto a second line here was exactly the crowded,
              "strange navigation" problem this app's nav has already been
              redesigned around once before (see the top-nav/pill-tab
              rework this comment block's neighbors describe). */}
          {!isMobile && (
            <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {visibleNavItems.map((item) => (
                <button key={item.key} onClick={() => onSetPage(item.key)} style={navItemStyle(page === item.key)}>
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onSwitchApp} style={switchAppButtonStyle}>
          {otherAppLabel} →
        </button>
        <ThemeToggleButton effective={themeEffective} onToggle={onToggleTheme} />
        <button
          onClick={() => onSetPage("settings")}
          title="Go to Settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: page === "settings" ? "var(--border)" : "none",
            border: "none",
            borderRadius: 99,
            padding: "4px 10px 4px 4px",
            cursor: "pointer",
          }}
        >
          <Avatar name={profile?.full_name || session.user.email} avatarDataUrl={profile?.avatar_data_url} size={28} />
          <span style={{ fontSize: 13, fontWeight: 600, color: page === "settings" ? "var(--text-primary)" : "var(--text-secondary)" }}>
            {profile?.full_name || session.user.email}
          </span>
        </button>
      </div>
    </div>
  );
}

// Same translucent color-mix pill LeftNav used — genuinely across all 4
// accent colors and both themes with no extra --accent-subtle-bg-style
// token needed, same reasoning as when this effect first replaced the
// plain underline.
function navItemStyle(active: boolean) {
  return {
    background: active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
    border: "none",
    borderRadius: 999,
    color: active ? "var(--accent-light)" : "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 600,
    padding: "7px 14px",
    cursor: "pointer",
    transition: "background 120ms ease, color 120ms ease",
  };
}

const switchAppButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
