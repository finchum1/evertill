import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Page } from "../types";
import { CreateMenu } from "./CreateMenu";
import type { CreateType } from "./CreateMenu";

interface HeaderProps {
  session: Session | null;
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

export function Header({ session, page, onSetPage, onLogin, onSignup, onCreate }: HeaderProps) {
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
                    background: page === item.key ? "var(--border)" : "none",
                    border: "none",
                    borderRadius: 8,
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
            title="Settings"
            aria-label="Settings"
            style={{
              background: page === "settings" ? "var(--border)" : "none",
              border: "none",
              borderRadius: 8,
              color: page === "settings" ? "var(--text-primary)" : "var(--text-secondary)",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ⚙
          </button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{session.user.email}</span>
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
