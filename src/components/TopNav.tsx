import type { Session } from "@supabase/supabase-js";
import type { Page } from "../types";
import type { Profile } from "../hooks/useProfile";
import { Avatar } from "./Avatar";
import { ThemeToggleButton } from "./Header";

interface TopNavProps {
  session: Session;
  profile: Profile | null;
  page: Page;
  onSetPage: (page: Page) => void;
  themeEffective: "dark" | "light";
  onToggleTheme: () => void;
}

// Mobile-only top bar — App.tsx renders this instead of LeftNav.tsx below
// the phone breakpoint, since a persistent sidebar has no real phone
// equivalent. Module navigation itself lives entirely in BottomTabBar.tsx
// on mobile, so this only needs the wordmark plus the theme/account
// cluster, all on one row (no name text next to the avatar — the avatar
// alone still reaches Settings, which keeps this row from wrapping onto a
// second line, the exact "crowded, strange navigation" this app's nav has
// already been reworked around once before).
export function TopNav({ session, profile, page, onSetPage, themeEffective, onToggleTheme }: TopNavProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        // The extra top inset only does anything in standalone/home-screen
        // mode (index.html's apple-mobile-web-app-status-bar-style is
        // black-translucent, so content draws under the status bar there —
        // a no-op in a normal browser tab, which has no such inset). Same
        // env() convention BottomTabBar.tsx already uses for the bottom.
        padding: "calc(16px + env(safe-area-inset-top)) 24px 16px",
        borderBottom: "1px solid var(--border)",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Pipeline</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ThemeToggleButton effective={themeEffective} onToggle={onToggleTheme} />
        <button
          onClick={() => onSetPage("settings")}
          title="Go to Settings"
          style={{
            display: "flex",
            alignItems: "center",
            background: page === "settings" ? "var(--border)" : "none",
            border: "none",
            borderRadius: 99,
            padding: 4,
            cursor: "pointer",
          }}
        >
          <Avatar name={profile?.full_name || session.user.email} avatarDataUrl={profile?.avatar_data_url} size={28} />
        </button>
      </div>
    </div>
  );
}
