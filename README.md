# Pipeline (web)

A Vite + React + TypeScript + Supabase CRM, with real self-service signup
and a real database so every user gets their own private workspace. Three
modules are live: **Leads**, **Pipeline** (custom-column boards for working
new business and long-term nurture), and **Transactions** (a fixed-stage
board — Active → In Escrow → Inspections → Pre-Closing → Closed — with
milestone dates, money/terms fields, per-transaction checklists from your
own templates, and support for tracking transactions you're running on
behalf of other agents by name). See
[What's deliberately not built yet](#whats-deliberately-not-built-yet) for
what's still missing.

Installable as a PWA (desktop or phone home screen) — a persistent left
sidebar on desktop, a bottom tab bar on mobile.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (any
   name/region is fine).
2. In the project dashboard, open **SQL Editor → New query**, paste in the
   contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This
   creates every table the app uses (`profiles` and the Leads/Pipeline/Deals
   tables — see [How data is organized](#how-data-is-organized)) with
   row-level security so only the signed-in user's data is ever visible, a
   trigger that creates a `profiles` row automatically at signup,
   activity-stamp triggers for Leads/Pipeline/Deals notes, and realtime sync
   turned on for every table.
3. Open **Project Settings → Data API**. Copy the **Project URL** and the
   **anon public** key — you'll need both in step 3 below.

## 2. Signup is self-service — each person gets their own private workspace

The app's header has **Log in** / **Sign up** buttons. Anyone can create
their own account from the Sign Up form (full name, company name, email,
password) — there's no invite step or admin approval. Each account's leads,
pipeline clients, and transactions are completely private: row-level
security scopes every row to `auth.uid()`, so no user can ever see another
user's data.

By default, Supabase requires email confirmation before a new account can
sign in — after signing up, the app shows "check your email to confirm it."
If you'd rather skip that step during testing (or for a small trusted
group), go to **Authentication → Providers → Email** and turn off
**Confirm email** — new signups will then be signed in immediately.

**Security note:** because signup is open to anyone with the link, this is
appropriate once you're comfortable with strangers being able to create
accounts (each isolated to their own private data). If you want to restrict
who can sign up at all, that needs to be configured in Supabase (disable
public signups and invite users manually instead) — not something the
current app UI does.

## 3. Configure and run the app

```bash
cp .env.example .env
# edit .env and paste in your Project URL + anon key from step 1.3
npm install
npm run dev
```

Visit the printed local URL, click **Sign up** in the header to create an
account, and start adding leads, pipeline clients, and transactions.

## 4. Deploy for real cross-device use

The app is a static Vite build, so it can be hosted anywhere that serves
static files (Vercel, Netlify, Cloudflare Pages, etc.):

```bash
npm run build   # outputs to dist/
```

Set the same two `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` environment
variables on whichever host you deploy to. The anon key is safe to expose
publicly — it only allows what the row-level security policies in
`supabase/schema.sql` permit (each row scoped to its owning user).

## How data is organized

- **`profiles`** — one row per user (`full_name`, `company_name`,
  `hidden_modules`), created automatically right after signup by a Postgres
  trigger reading the `options.data` passed to `supabase.auth.signUp()`.

**Leads & Pipeline** (structurally identical to each other)
- **`lead_columns`** / **`pipeline_columns`** — custom user-defined stages
  (`label`, `color`, `sort_order`).
- **`lead_cards`** / **`pipeline_cards`** — `title`, `value`, `due_date`
  ("Next Activity"), `phone`/`email`/`address`, denormalized
  `last_activity_at`/`last_activity_text`. `pipeline_cards` also has
  `source_lead_id` (nullable, `SET NULL` on delete) — a pointer reserved
  for a future Lead→Pipeline conversion action, not used by anything yet.
- **`lead_notes`** / **`pipeline_notes`** — an append-only activity log per
  card. Inserting a note fires a trigger that stamps `last_activity_at`/
  `last_activity_text` onto the parent card.
- **`tags`** — one shared, user-editable tag list (managed from Settings >
  Tags) applied to both Leads and Pipeline cards via the `lead_card_tags`/
  `pipeline_card_tags` junction tables (many-to-many — a card can carry any
  number of tags).

**Transactions** (the one module with a different shape — table name is
still `deals` internally)
- **`deals`** — `status` is a **fixed** 5-value stage (`Active`/`In
  Escrow`/`Inspections`/`Pre-Closing`/`Closed`, not a user-customizable
  column like Leads/Pipeline), `type` (`Buyer`/`Listing`, a single select),
  `agent_name` (whose transaction this is, for tracking files you're
  running on behalf of other agents), the four milestone dates
  (`acceptance_date`/`inspection_date`/`appraisal_date`/`closing_date`), and
  money/terms fields (`value`, `price`, `earnest_money`, `concessions`,
  `loan_type`).
- **`deal_notes`** — same append-only-log + activity-stamp-trigger pattern as
  Leads/Pipeline notes.
- **`deal_templates`** / **`deal_template_items`** — reusable, per-type
  (Buyer/Listing) checklists a user builds in Settings; one per type can be
  marked default, seeded onto every new transaction of that type.
- **`deal_checklist_items`** — the actual per-transaction checklist
  instance, copied from a template at creation time.
- **`deal_contact_fields`** — a transaction's Contacts tab (Buyer/Seller,
  Co-op Agent, Lender, Title/Escrow — 12 standard fields seeded per
  transaction, plus any custom ones added).

Every row across every table is scoped to the signed-in user via Postgres
row-level security (`auth.uid()`), and Supabase Realtime pushes changes to
every open device/tab automatically — no manual refresh needed.

## Project structure

```
src/
  components/   LeftNav (desktop sidebar), TopNav + BottomTabBar (mobile), AuthModal
                LeadsBoard, LeadCardMini, LeadCardModal                  (Leads)
                PipelineBoard, PipelineCardMini, PipelineCardModal       (Pipeline)
                DealsBoard, DealsListView, DealsAgentsView,
                DealCardMini, NewDealModal, DealModal                   (Transactions)
                BoardListView/BoardCalendarView/BoardValueView          (shared board sub-views)
  hooks/        useAuth (session)
                useLeads, usePipeline, useDeals, useDealTemplates, useTags
                (each: data fetch/mutate + realtime sync, refetch-not-optimistic)
  lib/          supabaseClient, dates (todayKey/formatDueDate/calendar helpers), format (formatCurrency)
  types.ts      All table row types + Page union type + shared color palette
supabase/
  schema.sql    Every table + RLS policies + realtime publication + all triggers
```

## What's deliberately not built yet

Intentionally out of scope so far — add these on request:

- Drag-and-drop reordering (cards between columns in Leads/Pipeline;
  transactions between stages)
- Column/tag color-picker UI, rename-in-place (currently all use
  `window.prompt()`)
- File uploads (Leads/Pipeline/Transactions)
- The two remaining conversion actions (Lead→Transaction,
  Pipeline→Transaction) — Transaction→Pipeline ("busting" a deal) already
  exists; each of these is just an insert-into-destination +
  delete-origin-row, not built yet
- Real invite/collaboration model (this app is single-owner-only everywhere
  so far)
