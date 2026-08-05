import { useEffect, useState } from "react";

export type ThemePreference = "system" | "dark" | "light";
export type AccentColor = "indigo" | "red" | "green" | "charcoal";

const STORAGE_KEY = "tc-dashboard-theme";
const ACCENT_STORAGE_KEY = "tc-dashboard-accent";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function effectiveTheme(pref: ThemePreference): "dark" | "light" {
  return pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref;
}

function applyTheme(pref: ThemePreference) {
  document.documentElement.dataset.theme = effectiveTheme(pref);
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" || stored === "system" ? stored : "system";
}

// Indigo is the original, default accent — its tokens live directly in the
// base :root/[data-theme="light"] blocks in index.css, so no [data-accent]
// override block exists for it (there's nothing to override to).
function readStoredAccent(): AccentColor {
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  return stored === "red" || stored === "green" || stored === "charcoal" || stored === "indigo" ? stored : "indigo";
}

function applyAccent(accent: AccentColor) {
  if (accent === "indigo") delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = accent;
}

// Dark is the app's original, default look, so "system" only flips a user
// with a light-mode OS into light — it never surprises an existing dark-only
// user. Preference lives in localStorage (per-browser) rather than a synced
// profiles column since there's no other cross-device state that matters yet.
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference());
  const [accent, setAccentState] = useState<AccentColor>(() => readStoredAccent());
  // Tracked separately from `preference` (which can be "system") so a nav-bar
  // toggle button always knows which literal look — dark or light — is
  // actually on screen right now, including when "system" is the source.
  const [effective, setEffective] = useState<"dark" | "light">(() => effectiveTheme(preference));

  useEffect(() => {
    applyTheme(preference);
    setEffective(effectiveTheme(preference));
  }, [preference]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    if (preference !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setEffective(effectiveTheme("system"));
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [preference]);

  function setPreference(next: ThemePreference) {
    localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
  }

  function setAccent(next: AccentColor) {
    localStorage.setItem(ACCENT_STORAGE_KEY, next);
    setAccentState(next);
  }

  // Nav-bar quick toggle: flips the *effective* look directly to an explicit
  // preference, regardless of whether "system" was the source — so a user on
  // "system" who toggles gets a real, sticky override, not a no-op.
  function toggleEffective() {
    setPreference(effective === "dark" ? "light" : "dark");
  }

  return { preference, setPreference, accent, setAccent, effective, toggleEffective };
}
