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
          background: "#0f172a",
          border: "1px solid #1e293b",
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
            color: "#475569",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ fontSize: 11, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          TC Dashboard
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>

        {mode === "signup" && (
          <>
            <label style={{ fontSize: 12, color: "#64748b" }}>
              Full name
              <input
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ fontSize: 12, color: "#64748b" }}>
              Company name
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} />
            </label>
          </>
        )}

        <label style={{ fontSize: 12, color: "#64748b" }}>
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
        <label style={{ fontSize: 12, color: "#64748b" }}>
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
          <div style={{ color: "#ef4444", fontSize: 13, background: "rgba(239,68,68,0.12)", padding: "8px 10px", borderRadius: 8 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ color: "#22c55e", fontSize: 13, background: "rgba(34,197,94,0.12)", padding: "8px 10px", borderRadius: 8 }}>
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            background: "#6366f1",
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

        <div style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
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
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 15,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
};

const linkStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "#6366f1",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};
