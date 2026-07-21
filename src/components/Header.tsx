import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface HeaderProps {
  session: Session | null;
  onLogin: () => void;
  onSignup: () => void;
}

export function Header({ session, onLogin, onSignup }: HeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid #1e293b",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
        TC Dashboard
      </div>
      {session ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>{session.user.email}</span>
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
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#cbd5e1",
  fontSize: 13,
  fontWeight: 600,
  padding: "7px 14px",
  cursor: "pointer",
};

const primaryButtonStyle = {
  background: "#6366f1",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  padding: "7px 14px",
  cursor: "pointer",
};
