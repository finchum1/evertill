// Returns merged Google Calendar events for every visible calendar across
// every Google account the current user has linked, for a given date
// range. Runs server-side for the same reason google-oauth-exchange does:
// refreshing an expired access token needs the OAuth client_secret, which
// can't live in the frontend. Needs the same two secrets set on the
// project as google-oauth-exchange (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || "Token refresh failed");
  return json;
}

interface GoogleAccountRow {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface GoogleCalendarRow {
  id: string;
  google_account_id: string;
  calendar_id: string;
  summary: string;
  color: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const { start, end } = await req.json();
    if (!start || !end) throw new Error("Missing start or end");

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [accountsResult, calendarsResult] = await Promise.all([
      serviceClient.from("google_accounts").select("id, email, access_token, refresh_token, token_expires_at").eq("user_id", userId),
      serviceClient.from("google_calendars").select("id, google_account_id, calendar_id, summary, color").eq("user_id", userId).eq("visible", true),
    ]);
    if (accountsResult.error) throw accountsResult.error;
    if (calendarsResult.error) throw calendarsResult.error;

    const accounts = (accountsResult.data || []) as GoogleAccountRow[];
    const calendars = (calendarsResult.data || []) as GoogleCalendarRow[];

    const events: {
      id: string;
      calendarId: string;
      calendarSummary: string;
      accountEmail: string;
      title: string;
      start: string;
      end: string;
      allDay: boolean;
      color: string | null;
      htmlLink: string | null;
    }[] = [];
    const errors: { email: string; message: string }[] = [];

    for (const account of accounts) {
      const accountCalendars = calendars.filter((c) => c.google_account_id === account.id);
      if (accountCalendars.length === 0) continue;

      let accessToken = account.access_token;
      // Refresh a little early (60s buffer) rather than right at expiry,
      // so an in-flight events fetch never races an about-to-expire token.
      const expiresAt = new Date(account.token_expires_at).getTime();
      if (expiresAt - Date.now() < 60_000) {
        try {
          const refreshed = await refreshAccessToken(account.refresh_token);
          accessToken = refreshed.access_token;
          await serviceClient
            .from("google_accounts")
            .update({ access_token: accessToken, token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
            .eq("id", account.id);
        } catch (err) {
          // Logged (was previously swallowed silently) so a persistent
          // refresh failure shows up in the function's logs instead of only
          // as a generic user-facing message with no way to tell whether it
          // was invalid_grant (revoked/expired), invalid_client (a rotated
          // secret), or something else entirely.
          console.error(`Token refresh failed for ${account.email}:`, err);
          errors.push({ email: account.email, message: "Reconnect this account — its Google access has expired or was revoked." });
          continue;
        }
      }

      for (const cal of accountCalendars) {
        try {
          const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.calendar_id)}/events`);
          url.searchParams.set("timeMin", start);
          url.searchParams.set("timeMax", end);
          url.searchParams.set("singleEvents", "true");
          url.searchParams.set("orderBy", "startTime");
          url.searchParams.set("maxResults", "250");
          const evRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          const evJson = await evRes.json();
          if (!evRes.ok) throw new Error(evJson.error?.message || "Failed to fetch events");
          for (const e of evJson.items || []) {
            if (e.status === "cancelled") continue;
            const startVal = e.start?.dateTime || e.start?.date;
            const endVal = e.end?.dateTime || e.end?.date;
            if (!startVal || !endVal) continue;
            events.push({
              id: e.id,
              calendarId: cal.calendar_id,
              calendarSummary: cal.summary,
              accountEmail: account.email,
              title: e.summary || "(No title)",
              start: startVal,
              end: endVal,
              allDay: !e.start?.dateTime,
              color: cal.color,
              htmlLink: e.htmlLink || null,
            });
          }
        } catch (err) {
          errors.push({ email: account.email, message: `Couldn't load "${cal.summary}": ${err instanceof Error ? err.message : String(err)}` });
        }
      }
    }

    return new Response(JSON.stringify({ events, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
