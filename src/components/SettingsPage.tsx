import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { useProfile } from "../hooks/useProfile";
import type { useTheme, ThemePreference, AccentColor } from "../hooks/useTheme";
import type { useDealTemplates } from "../hooks/useDealTemplates";
import type { useTags } from "../hooks/useTags";
import type { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import type { GoogleAccount } from "../types";
import { DealTemplatesManager } from "./DealTemplatesManager";
import { TagsManager } from "./TagsManager";
import { Avatar } from "./Avatar";
import { useDialogs } from "./DialogHost";
import { resizeImageToDataUrl } from "../lib/imageResize";
import { HIDEABLE_MODULES } from "../types";

interface SettingsPageProps {
  session: Session;
  profileData: ReturnType<typeof useProfile>;
  theme: ReturnType<typeof useTheme>;
  dealTemplatesData: ReturnType<typeof useDealTemplates>;
  tagsData: ReturnType<typeof useTags>;
  googleCalendarData: ReturnType<typeof useGoogleCalendar>;
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

export function SettingsPage({ session, profileData, theme, dealTemplatesData, tagsData, googleCalendarData }: SettingsPageProps) {
  const [managingTemplates, setManagingTemplates] = useState(false);
  const [managingTags, setManagingTags] = useState(false);

  if (managingTemplates) {
    return <DealTemplatesManager dealTemplatesData={dealTemplatesData} onBack={() => setManagingTemplates(false)} />;
  }
  if (managingTags) {
    return <TagsManager tagsData={tagsData} onBack={() => setManagingTags(false)} />;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 640, fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>Settings</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ProfileCard session={session} profileData={profileData} />
        <AccountCard session={session} />
        <AppearanceCard theme={theme} />
        <ModulesCard profileData={profileData} />
        <GoogleCalendarsCard googleCalendarData={googleCalendarData} />
        <TagsCard onManage={() => setManagingTags(true)} />
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

// Hiding a module removes its nav tab and "+ Create" entry (see Header.tsx/
// CreateMenu.tsx) — the underlying data isn't touched, so unhiding brings
// it right back exactly as it was.
function ModulesCard({ profileData }: { profileData: ReturnType<typeof useProfile> }) {
  const { profile, updateProfile } = profileData;
  const hidden = profile?.hidden_modules ?? [];
  const visibleCount = HIDEABLE_MODULES.length - hidden.length;

  function toggle(key: string) {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    updateProfile({ hidden_modules: next });
  }

  return (
    <Card title="Modules">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Hide modules you don't use — they'll disappear from the nav bar and the "+ Create" menu. At least one has to stay on.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {HIDEABLE_MODULES.map((mod) => {
          const isVisible = !hidden.includes(mod.key);
          const isLastVisible = isVisible && visibleCount === 1;
          return (
            <div key={mod.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{mod.label}</span>
              <Toggle checked={isVisible} disabled={isLastVisible} onChange={() => toggle(mod.key)} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// This app has no other toggle-switch primitive — the theme control is a
// 3-way button group, not a fit for a simple on/off setting like this one.
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={disabled ? "At least one module has to stay visible" : undefined}
      onClick={onChange}
      style={{
        width: 36,
        height: 20,
        borderRadius: 99,
        border: "none",
        background: checked ? "var(--accent)" : "var(--border-strong)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        padding: 0,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

// Read-only by design (calendar.readonly OAuth scope) — Evertill can never
// create/edit/delete anything on a linked Google account's calendar,
// stated here since that's not otherwise visible from the UI itself.
function GoogleCalendarsCard({ googleCalendarData }: { googleCalendarData: ReturnType<typeof useGoogleCalendar> }) {
  const dialogs = useDialogs();
  const { accounts, calendars, loading, connecting, connectError, clearConnectError, connect, disconnectAccount, setCalendarVisible } = googleCalendarData;

  async function handleDisconnect(account: GoogleAccount) {
    const ok = await dialogs.confirm({
      message: `Disconnect ${account.email}? Its calendars will stop showing in Tasks. You can reconnect it anytime.`,
      confirmLabel: "Disconnect",
      danger: true,
    });
    if (ok) disconnectAccount(account.id);
  }

  return (
    <Card title="Calendars">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        Link Google accounts to see their events alongside your tasks in Today, Week, and Month. Read-only — Evertill never edits your Google Calendar.
      </p>
      {connectError && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 12,
            color: "var(--danger)",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <span>{connectError}</span>
          <button
            onClick={clearConnectError}
            aria-label="Dismiss"
            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
      {!loading && accounts.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No Google accounts connected yet.</div>}
      {accounts.map((account) => {
        const accountCalendars = calendars.filter((c) => c.google_account_id === account.id);
        return (
          <div
            key={account.id}
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {account.email}
              </span>
              <button onClick={() => handleDisconnect(account)} style={dangerLinkButtonStyle}>
                Disconnect
              </button>
            </div>
            {accountCalendars.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No calendars found on this account.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {accountCalendars.map((cal) => (
                  <div key={cal.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-body)", minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: cal.color || "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cal.summary}</span>
                    </span>
                    <Toggle checked={cal.visible} onChange={() => setCalendarVisible(cal.id, !cal.visible)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button
        onClick={connect}
        disabled={connecting}
        style={{ ...primaryButtonStyle, alignSelf: "flex-start", opacity: connecting ? 0.6 : 1, cursor: connecting ? "wait" : "pointer" }}
      >
        {connecting ? "Connecting…" : "+ Connect Google Account"}
      </button>
    </Card>
  );
}

function TagsCard({ onManage }: { onManage: () => void }) {
  return (
    <Card title="Tags">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
        The shared tag list used on Leads and Pipeline cards — create your own, rename them, and pick their colors.
      </p>
      <button onClick={onManage} style={{ ...primaryButtonStyle, alignSelf: "flex-start" }}>
        Manage →
      </button>
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

const dangerLinkButtonStyle: CSSProperties = {
  ...linkButtonStyle,
  color: "var(--danger)",
  flexShrink: 0,
};

const segmentButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 16px",
  cursor: "pointer",
};
