import type { Session } from "@supabase/supabase-js";
import type { Page } from "../types";
import type { Profile } from "../hooks/useProfile";
import { CreateMenu } from "./CreateMenu";
import type { CreateType } from "./CreateMenu";
import { Avatar } from "./Avatar";
import { ThemeToggleButton } from "./Header";

interface LeftNavProps {
  session: Session;
  profile: Profile | null;
  page: Page;
  onSetPage: (page: Page) => void;
  onCreate: (type: CreateType) => void;
  hiddenModules: string[];
  themeEffective: "dark" | "light";
  onToggleTheme: () => void;
}

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "notes", label: "Notes" },
  { key: "leads", label: "Leads" },
  { key: "pipeline", label: "Pipeline" },
  { key: "deals", label: "Deals" },
];

// The signed-in app's own navigation — module switcher, +Create, account —
// as a persistent vertical rail instead of Header's old horizontal top
// bar. Sits to the left of everything else (including each module's own
// contextual Sidebar/NotesSidebar, which keep their own separate column
// exactly as before — this only replaces the app-level "which module"
// switcher, not each module's internal nav).
export function LeftNav({ session, profile, page, onSetPage, onCreate, hiddenModules, themeEffective, onToggleTheme }: LeftNavProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) => !hiddenModules.includes(item.key));

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 208,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        borderRight: "1px solid var(--border)",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", padding: "4px 8px 12px" }}>
        Evertill
      </div>

      <div style={{ marginBottom: 12 }}>
        <CreateMenu onSelect={onCreate} hiddenModules={hiddenModules} />
      </div>

      {visibleNavItems.map((item) => (
        <button key={item.key} onClick={() => onSetPage(item.key)} style={navItemStyle(page === item.key)}>
          {item.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 8px" }}>
        <ThemeToggleButton effective={themeEffective} onToggle={onToggleTheme} />
      </div>

      <button onClick={() => onSetPage("settings")} title="Go to Settings" style={accountButtonStyle(page === "settings")}>
        <Avatar name={profile?.full_name || session.user.email} avatarDataUrl={profile?.avatar_data_url} size={28} />
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
    </nav>
  );
}

// Same translucent color-mix pill this app's top nav used before moving
// here — full-width rounded rect instead of an inline pill (a fully
// stadium-rounded shape at this width would read as an odd elongated
// capsule rather than a nav row), same automatic-across-all-4-accent-
// colors-and-both-themes reasoning as before.
function navItemStyle(active: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    width: "100%",
    background: active ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent",
    border: "none",
    borderRadius: 8,
    color: active ? "var(--accent-light)" : "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 12px",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "background 120ms ease, color 120ms ease",
  };
}

function accountButtonStyle(active: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    minWidth: 0,
    background: active ? "var(--border)" : "none",
    border: "none",
    borderRadius: 8,
    padding: "6px 4px",
    cursor: "pointer",
  };
}
