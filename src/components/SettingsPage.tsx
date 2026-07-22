import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { useProfile } from "../hooks/useProfile";
import type { useTheme, ThemePreference, AccentColor } from "../hooks/useTheme";
import type { useDealTemplates } from "../hooks/useDealTemplates";
import { DealTemplatesManager } from "./DealTemplatesManager";
import { Avatar } from "./Avatar";
import { resizeImageToDataUrl } from "../lib/imageResize";

interface SettingsPageProps {
  session: Session;
  profileData: ReturnType<typeof useProfile>;
  theme: ReturnType<typeof useTheme>;
  dealTemplatesData: ReturnType<typeof useDealTemplates>;
}

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: "system", label: "System" },
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
];

// Swatch colors are the accent's solid shade, shown the same regardless of
// which accent is currently active — unlike the rest of the app's chrome,
// these can't just read var(--accent) since all 4 options need to render
// simultaneously.
const ACCENT_OPTIONS: { key: AccentColor; label: string; swatch: string }[] = [
  { key: "indigo", label: "Indigo", swatch: "#6366f1" },
  { key: "red", label: "Red", swatch: "#ef4444" },
  { key: "green", label: "Green", swatch: "#10b981" },
  { key: "charcoal", label: "Charcoal", swatch: "#3f3f46" },
];

export function SettingsPage({ session, profileData, theme, dealTemplatesData }: SettingsPageProps) {
  const [managingTemplates, setManagingTemplates] = useState(false);

  if (managingTemplates) {
    return <DealTemplatesManager dealTemplatesData={dealTemplatesData} onBack={() => setManagingTemplates(false)} />;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 640, fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Settings</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ProfileCard session={session} profileData={profileData} />
        <AccountCard session={session} />
        <AppearanceCard theme={theme} />
        <DealTemplatesCard onManage={() => setManagingTemplates(true)} />
      </div>
    </div>
  );
}

function ProfileCard({ session, profileData }: { session: Session; profileData: ReturnType<typeof useProfile> }) {
  const { profile, loading, updateProfile } = profileData;
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile loads in async (after this card's first render), so seed the
  // editable fields once it arrives rather than trying to derive them
  // directly from a value that's initially null.
  useEffect(() => {
    if (!loading && profile) {
      setFullName(profile.full_name ?? "");
      setCompanyName(profile.company_name ?? "");
    }
  }, [loading, profile]);

  const dirty = fullName !== (profile?.full_name ?? "") || companyName !== (profile?.company_name ?? "");

  async function handleSave() {
    await updateProfile({ full_name: fullName.trim() || null, company_name: companyName.trim() || null });
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoStatus("Uploading…");
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await updateProfile({ avatar_data_url: dataUrl });
      setPhotoStatus(null);
    } catch (err) {
      setPhotoStatus(err instanceof Error ? err.message : "Could not upload photo.");
    }
  }

  return (
    <Card title="Profile">
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar name={fullName || session.user.email} avatarDataUrl={profile?.avatar_data_url} size={64} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => fileInputRef.current?.click()} style={linkButtonStyle}>
              Change photo
            </button>
            {profile?.avatar_data_url && (
              <button onClick={() => updateProfile({ avatar_data_url: null })} style={linkButtonStyle}>
                Remove photo
              </button>
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{photoStatus ?? "JPG or PNG"}</span>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} style={{ display: "none" }} />
        </div>
      </div>
      <label style={labelStyle}>
        Name
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Company
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Email
        <input value={session.user.email ?? ""} disabled style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }} />
      </label>
      {dirty && (
        <button onClick={handleSave} style={primaryButtonStyle}>
          Save changes
        </button>
      )}
    </Card>
  );
}

function AccountCard({ session }: { session: Session }) {
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setStatus(error ? error.message : "Password updated.");
    if (!error) setNewPassword("");
  }

  return (
    <Card title="Account">
      <label style={labelStyle}>
        New password
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={handleChangePassword} style={primaryButtonStyle}>
          Change password
        </button>
        {status && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{status}</span>}
      </div>
      <button onClick={() => supabase.auth.signOut()} style={{ ...dangerButtonStyle, alignSelf: "flex-start" }}>
        Log out
      </button>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Signed in as {session.user.email}</div>
    </Card>
  );
}

function AppearanceCard({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <Card title="Appearance">
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Theme</div>
      <div style={{ display: "flex", gap: 8 }}>
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => theme.setPreference(opt.key)}
            style={{
              ...segmentButtonStyle,
              background: theme.preference === opt.key ? "var(--accent)" : "var(--border)",
              color: theme.preference === opt.key ? "#fff" : "var(--text-body)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>Accent color</div>
      <div style={{ display: "flex", gap: 14 }}>
        {ACCENT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => theme.setAccent(opt.key)}
            title={opt.label}
            aria-label={opt.label}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: opt.swatch,
              border: "none",
              cursor: "pointer",
              boxShadow: theme.accent === opt.key ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${opt.swatch}` : "none",
            }}
          />
        ))}
      </div>
    </Card>
  );
}

function DealTemplatesCard({ onManage }: { onManage: () => void }) {
  return (
    <Card title="Deal Templates">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Your own checklists — the starred one is what new deals get seeded with.
      </p>
      <button onClick={onManage} style={{ ...primaryButtonStyle, alignSelf: "flex-start" }}>
        Manage →
      </button>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
      {children}
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
  fontSize: 14,
  padding: "9px 12px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
};

const primaryButtonStyle: CSSProperties = {
  background: "var(--accent-strong)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  color: "var(--danger)",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};

const linkButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--accent-light)",
  fontSize: 12,
  fontWeight: 600,
  padding: 0,
  cursor: "pointer",
};

const segmentButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};
