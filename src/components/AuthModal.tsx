import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

type Mode = "signin" | "signup";

interface AuthModalProps {
  initialMode: Mode;
  onClose: () => void;
}

export function AuthModal({ initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      onClose();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: companyName } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      // Email confirmation is disabled on the project — user is signed in immediately.
      onClose();
      return;
    }
    // Email confirmation is required before the account can sign in.
    setNotice("Account created — check your email to confirm it before signing in.");
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 8, 23, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Evertill
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>

        {mode === "signup" && (
          <>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Full name
              <input
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Company name
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} />
            </label>
          </>
        )}

        <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Email
          <input
            type="email"
            required
            autoFocus={mode === "signin"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: 13, background: "rgba(239,68,68,0.12)", padding: "8px 10px", borderRadius: 8 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ color: "var(--success)", fontSize: 13, background: "rgba(34,197,94,0.12)", padding: "8px 10px", borderRadius: 8 }}>
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            background: "var(--accent)",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            padding: "10px 16px",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={() => switchMode("signup")} style={linkStyle}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")} style={linkStyle}>
                Sign in
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  background: "var(--border)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 15,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
};

const linkStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--accent)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};
