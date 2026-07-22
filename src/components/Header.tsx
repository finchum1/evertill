import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
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
}

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "leads", label: "Leads" },
  { key: "pipeline", label: "Pipeline" },
  { key: "deals", label: "Deals" },
];

export function Header({ session, profile, page, onSetPage, onLogin, onSignup, onCreate }: HeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          TC Dashboard
        </div>
        {session && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <CreateMenu onSelect={onCreate} />
            <nav style={{ display: "flex", gap: 4 }}>
              {NAV_ITEMS.map((item) => (
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
      {session ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
          <button onClick={() => supabase.auth.signOut()} style={ghostButtonStyle}>
            Log out
          </button>
        </div>
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
