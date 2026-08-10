// Exchanges a Google OAuth "authorization code" (from the frontend's
// redirect back from Google's consent screen) for a real access/refresh
// token pair, then stores the linked account + its calendar list.
//
// Runs server-side deliberately: the OAuth client_secret used in this
// exchange must never reach the browser (Vite bundles are public), so this
// step can't happen in the frontend. Deploy with `supabase functions deploy
// google-oauth-exchange` or paste this file into the Supabase Dashboard's
// Edge Functions editor. Needs two secrets set on the project
// (Dashboard > Edge Functions > Manage secrets, or `supabase secrets set`):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically into every Edge Function — no need to set those.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    // Verify the caller is a real, currently-signed-in Evertill user before
    // doing anything with Google — the JWT comes from the frontend's own
    // Supabase session, checked against the anon key (not the service
    // role), so this can't be spoofed.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) throw new Error("Missing code or redirect_uri");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Google token exchange failed: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`);
    }
    const { access_token, refresh_token, expires_in } = tokenJson;

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoRes.json();
    if (!userInfoRes.ok || !userInfo.id) throw new Error("Failed to fetch Google account info");

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Google only returns a refresh_token on the first consent for a given
    // account+scope combo (we also force prompt=consent on the frontend's
    // auth URL so re-connecting still gets one) — if it's ever missing on
    // a re-auth, fall back to whatever refresh_token is already stored
    // instead of overwriting a good one with nothing.
    const { data: existing } = await serviceClient
      .from("google_accounts")
      .select("id, refresh_token")
      .eq("user_id", userId)
      .eq("google_user_id", userInfo.id)
      .maybeSingle();

    const { data: account, error: upsertError } = await serviceClient
      .from("google_accounts")
      .upsert(
        {
          user_id: userId,
          google_user_id: userInfo.id,
          email: userInfo.email,
          access_token,
          refresh_token: refresh_token || existing?.refresh_token,
          token_expires_at: expiresAt,
        },
        { onConflict: "user_id,google_user_id" }
      )
      .select()
      .single();
    if (upsertError) throw upsertError;
    if (!account.refresh_token) {
      throw new Error(
        "Google didn't grant offline access (no refresh token). Remove Evertill from your Google Account's connected-apps settings and try connecting again."
      );
    }

    // Pull the calendar list and upsert every calendar. New calendars
    // default to visible; this upsert intentionally never touches the
    // `visible` column on existing rows, so reconnecting an account can't
    // silently reset a user's on/off toggles.
    const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const calList = await calListRes.json();
    if (!calListRes.ok) throw new Error("Failed to fetch Google calendar list");

    const calendars = (calList.items || []).map((c: { id: string; summaryOverride?: string; summary: string; backgroundColor?: string }) => ({
      user_id: userId,
      google_account_id: account.id,
      calendar_id: c.id,
      summary: c.summaryOverride || c.summary,
      color: c.backgroundColor || null,
    }));
    if (calendars.length > 0) {
      const { error: calError } = await serviceClient
        .from("google_calendars")
        .upsert(calendars, { onConflict: "google_account_id,calendar_id" });
      if (calError) throw calError;
    }

    return new Response(JSON.stringify({ ok: true, email: userInfo.email }), {
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
