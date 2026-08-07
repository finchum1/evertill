import type { Session } from "@supabase/supabase-js";
import type { Page } from "../types";
import type { Profile } from "../hooks/useProfile";
import { CreateMenu } from "./CreateMenu";
import type { CreateType } from "./CreateMenu";
import { Avatar } from "./Avatar";

interface HeaderProps {
  session: Session | null;
  profile: Profile | null;
  page: Page;
  onSetPage: (page: Page) => void;
  onLogin: () => void;
  onSignup: () => void;
  onCreate: (type: CreateType) => void;
  hiddenModules: string[];
  themeEffective: "dark" | "light";
  onToggleTheme: () => void;
}

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "leads", label: "Leads" },
  { key: "pipeline", label: "Pipeline" },
  { key: "deals", label: "Deals" },
  { key: "notes", label: "Notes" },
];

export function Header({
  session,
  profile,
  page,
  onSetPage,
  onLogin,
  onSignup,
  onCreate,
  hiddenModules,
  themeEffective,
  onToggleTheme,
}: HeaderProps) {
  const visibleNavItems = NAV_ITEMS.filter((item) => !hiddenModules.includes(item.key));
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
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Evertill
        </div>
        {session && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <CreateMenu onSelect={onCreate} hiddenModules={hiddenModules} />
            <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {visibleNavItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onSetPage(item.key)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${page === item.key ? "var(--accent)" : "transparent"}`,
                    borderRadius: 0,
                    color: page === item.key ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "7px 14px",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggleButton effective={themeEffective} onToggle={onToggleTheme} />
        {session ? (
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
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onLogin} style={ghostButtonStyle}>
              Log in
            </button>
            <button onClick={onSignup} style={primaryButtonStyle}>
              Sign up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeToggleButton({ effective, onToggle }: { effective: "dark" | "light"; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={effective === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={effective === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: 99,
        border: "1px solid var(--border-strong)",
        background: "none",
        color: "var(--text-secondary)",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {effective === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.2V2.6M8 13.4V14.8M14.8 8H13.4M2.6 8H1.2M12.7 3.3L11.7 4.3M4.3 11.7L3.3 12.7M12.7 12.7L11.7 11.7M4.3 4.3L3.3 3.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.8A6 6 0 1 1 6.2 2.5 4.7 4.7 0 0 0 13.5 9.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ghostButtonStyle = {
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-body)",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 14px",
  cursor: "pointer",
};

const primaryButtonStyle = {
  background: "var(--accent)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  padding: "7px 14px",
  cursor: "pointer",
};
