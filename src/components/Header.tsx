// Logged-out top bar only — sits above <Landing> (App.tsx's own comment on
// that render branch explains why: Landing renders no header of its own,
// relying entirely on this one for the "Evertill" wordmark + Log in/Sign
// up). The signed-in app's own navigation (module switcher, +Create,
// avatar/Settings) lives in TopNav.tsx instead — this component used to
// render both cases behind a `session &&` branch, but keeping a component
// named "Header" half-dead for the case it actually still serves was more
// confusing than trimming it down to just that case. (ThemeToggleButton
// below is exported and reused by TopNav.tsx rather than duplicated.)
interface HeaderProps {
  onLogin: () => void;
  onSignup: () => void;
  themeEffective: "dark" | "light";
  onToggleTheme: () => void;
}

export function Header({ onLogin, onSignup, themeEffective, onToggleTheme }: HeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        // Same env(safe-area-inset-top) reasoning as TopNav.tsx — a no-op
        // in a normal browser tab, but keeps this bar clear of the status
        // bar if the app is launched from the home screen while signed out.
        padding: "calc(16px + env(safe-area-inset-top)) 24px 16px",
        borderBottom: "1px solid var(--border)",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Evertill</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggleButton effective={themeEffective} onToggle={onToggleTheme} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onLogin} style={ghostButtonStyle}>
            Log in
          </button>
          <button onClick={onSignup} style={primaryButtonStyle}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export function ThemeToggleButton({ effective, onToggle }: { effective: "dark" | "light"; onToggle: () => void }) {
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
