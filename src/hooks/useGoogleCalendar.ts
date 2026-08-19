import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { GoogleAccount, GoogleCalendarEntry, GoogleEvent } from "../types";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
// calendar.readonly alone isn't enough to call Google's userinfo endpoint
// (google-oauth-exchange's follow-up call to fetch the account's email/id)
// — that needs openid + email/profile access too, or the exchange
// succeeds but the userinfo call 401s with "Failed to fetch Google
// account info".
const GOOGLE_SCOPE = "openid email https://www.googleapis.com/auth/calendar.readonly";
const OAUTH_STATE_KEY = "evertill_google_oauth_state";

// The root URL, not a dedicated path — this app has no client-side router
// (every URL serves the same index.html via App.tsx's own page-switching
// state, not real routes), so redirecting Google back to "/" avoids
// needing any server rewrite rule to keep that working.
function redirectUri(): string {
  return `${window.location.origin}/`;
}

// supabase-js's functions.invoke() surfaces a non-2xx response as a
// FunctionsHttpError whose own .message is just the generic "Edge
// Function returned a non-2xx status code" — the actual reason (both
// Edge Functions here always return { ok: false, error: "..." } on
// failure) lives on error.context, the raw Response object, and has to
// be read separately. Also handles the plain `new Error(data.error)`
// thrown when the function responds 2xx but with ok: false in its body —
// that case has no .context, so it just falls through to err.message.
async function extractFunctionErrorMessage(err: unknown): Promise<string> {
  const context = (err as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (body?.error) return body.error as string;
    } catch {
      // context wasn't JSON (e.g. a network-level failure) — fall through
      // to the generic message below.
    }
  }
  return err instanceof Error ? err.message : "Failed to connect Google account.";
}

export function useGoogleCalendar(userId: string | undefined) {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Per-account fetch failures (typically an expired/revoked refresh
  // token) — the Edge Function already reports these in its response's
  // `errors` array, but until now nothing actually read that array, so a
  // broken connection just showed "no events" everywhere with no
  // explanation. Every getEvents() call below refreshes this with
  // whatever the most recent fetch found, so Settings/Calendar can show
  // a real "reconnect this account" message instead of silence.
  const [syncErrors, setSyncErrors] = useState<{ email: string; message: string }[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [accountsRes, calendarsRes] = await Promise.all([
        supabase.from("google_accounts").select("id, user_id, email, created_at").eq("user_id", userId).order("created_at"),
        supabase.from("google_calendars").select("*").eq("user_id", userId).order("summary"),
      ]);
      if (accountsRes.error) throw accountsRes.error;
      if (calendarsRes.error) throw calendarsRes.error;
      setAccounts(accountsRes.data as GoogleAccount[]);
      setCalendars(calendarsRes.data as GoogleCalendarEntry[]);
    } catch (err) {
      // Most likely cause before the google_accounts/google_calendars
      // migration has been run yet — degrade to "nothing connected"
      // instead of leaving `loading` stuck true forever on an unhandled
      // rejection, so the rest of the app (which already treats an empty
      // `calendars` array as "show nothing, skip the network call") keeps
      // working normally in the meantime.
      console.warn("Failed to load Google Calendar accounts (has the schema migration run yet?):", err);
      setAccounts([]);
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Kicks off Google's consent flow with a real full-page redirect
  // (required — Google's OAuth screen refuses to run in an iframe/popup
  // without extra postMessage plumbing this doesn't need). access_type=
  // offline + prompt=consent together guarantee a refresh_token comes back
  // even when this Google account has authorized Evertill before, which a
  // bare "offline" alone doesn't (Google only issues a refresh_token on
  // first consent unless the consent screen is forced again).
  function connect() {
    if (!GOOGLE_CLIENT_ID) {
      setConnectError("Missing VITE_GOOGLE_CLIENT_ID — set it in .env (and in Vercel's env vars for production), then reload.");
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  // Call once on app mount, after a real session exists. Checks the URL
  // for Google's redirect back (?code=...&state=...); if present, hands
  // the code to the google-oauth-exchange Edge Function, then strips the
  // query string so a page refresh never resubmits the same one-time code.
  const handleOAuthCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    if (!code && !error) return;

    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    window.history.replaceState({}, "", window.location.pathname);
    sessionStorage.removeItem(OAUTH_STATE_KEY);

    if (error) {
      setConnectError(error === "access_denied" ? "Google connection cancelled." : `Google sign-in failed: ${error}`);
      return;
    }
    if (!code || !state || state !== expectedState) {
      setConnectError("Google sign-in failed (state mismatch) — please try connecting again.");
      return;
    }

    setConnecting(true);
    setConnectError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-oauth-exchange", {
        body: { code, redirect_uri: redirectUri() },
      });
      if (fnError) throw fnError;
      if (data && data.ok === false) throw new Error(data.error);
      await refresh();
    } catch (err) {
      setConnectError(await extractFunctionErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }, [refresh]);

  async function disconnectAccount(id: string) {
    const { error } = await supabase.from("google_accounts").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }

  async function setCalendarVisible(id: string, visible: boolean) {
    const { error } = await supabase.from("google_calendars").update({ visible }).eq("id", id);
    if (error) throw error;
    await refresh();
  }

  // Not stateful — each view calls this with exactly the date range it
  // needs and manages its own loading/result state itself, same "fetch on
  // effect, no shared cache" convention as the rest of this app's hooks.
  // Skips the network call entirely (returns empty) if nothing is
  // connected/visible, so pages with no Google account linked never pay
  // for a round trip.
  async function getEvents(startISO: string, endISO: string): Promise<{ events: GoogleEvent[]; errors: { email: string; message: string }[] }> {
    if (!calendars.some((c) => c.visible)) return { events: [], errors: [] };
    const { data, error } = await supabase.functions.invoke("google-calendar-events", {
      body: { start: startISO, end: endISO },
    });
    if (error) throw error;
    const errors = (data?.errors ?? []) as { email: string; message: string }[];
    // Replace, not merge — a stale error from an account that's since been
    // fixed (or disconnected) shouldn't linger forever just because some
    // earlier call happened to report it.
    setSyncErrors(errors);
    return { events: (data?.events ?? []) as GoogleEvent[], errors };
  }

  // Today's events specifically get cached here, at this hook's level,
  // rather than being fetched by whatever component happens to render the
  // Today view — that component (TaskListView's TodayEvents) unmounts
  // every time the user navigates away from Today and remounts on return,
  // which was refetching from scratch on every single visit. This hook
  // instance itself lives for the whole session (created once in App()),
  // so keying the fetch on `calendars` instead of on mount means it only
  // re-runs when a connect/disconnect/visibility-toggle actually changes
  // what should be fetched — a plain view switch is then instant, reading
  // whatever's already cached here.
  const [todayEvents, setTodayEvents] = useState<GoogleEvent[]>([]);
  const [todayEventsLoading, setTodayEventsLoading] = useState(true);

  useEffect(() => {
    if (!calendars.some((c) => c.visible)) {
      setTodayEvents([]);
      setTodayEventsLoading(false);
      return;
    }
    let cancelled = false;
    setTodayEventsLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    getEvents(start.toISOString(), end.toISOString())
      .then(({ events }) => {
        if (!cancelled) {
          setTodayEvents(events.slice().sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1)));
          setTodayEventsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setTodayEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendars]);

  return {
    accounts,
    calendars,
    loading,
    connecting,
    connectError,
    clearConnectError: () => setConnectError(null),
    connect,
    handleOAuthCallback,
    disconnectAccount,
    setCalendarVisible,
    getEvents,
    todayEvents,
    todayEventsLoading,
    syncErrors,
  };
}
