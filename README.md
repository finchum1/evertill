# TC Dashboard (web)

A Vite + React + TypeScript + Supabase rebuild of TC Dashboard, with real
self-service signup and a real database so every user gets their own private
workspace. All four core modules are live: **Tasks** (folders, lists, tasks,
subtasks, Today/Upcoming/Calendar/Completed), **Leads**, **Pipeline**, and
**Deals** (custom-column boards for Leads/Pipeline; a fixed-stage board with
milestone dates and money/terms fields for Deals). See
[What's deliberately not built yet](#whats-deliberately-not-built-yet) for
what's still missing.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (any
   name/region is fine).
2. In the project dashboard, open **SQL Editor → New query**, paste in the
   contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This
   creates every table the app uses (`profiles`, the Tasks tables, and the
   Leads/Pipeline/Deals tables — see [How data is organized](#how-data-is-organized))
   with row-level security so only the signed-in user's data is ever visible,
   a trigger that creates a `profiles` row automatically at signup, activity-
   stamp triggers for Leads/Pipeline/Deals notes, and realtime sync turned on
   for every table.
3. Open **Project Settings → Data API**. Copy the **Project URL** and the
   **anon public** key — you'll need both in step 3 below.

## 2. Signup is self-service — each person gets their own private workspace

The app's header has **Log in** / **Sign up** buttons. Anyone can create
their own account from the Sign Up form (full name, company name, email,
password) — there's no invite step or admin approval. Each account's
folders/lists/tasks are completely private: row-level security scopes every
row to `auth.uid()`, so no user can ever see another user's tasks.

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
account, and start adding tasks, leads, pipeline clients, and deals.

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

**Tasks**
- **`profiles`** — one row per user (`full_name`, `company_name`), created
  automatically right after signup by a Postgres trigger reading the
  `options.data` passed to `supabase.auth.signUp()`.
- **`todo_folders`** — optional grouping for lists. Deleting a folder unfiles
  its lists (`folder_id` → null) rather than deleting them.
- **`todo_lists`** — every user gets exactly one `is_inbox` list, created
  lazily the first time their data loads. Deleting a list cascades its tasks.
- **`todos`** — `due_date`, `completed`, `recurrence` (none/daily/weekly/
  monthly). Recurring tasks "roll forward in place": checking one off never
  sets `completed = true` — it advances `due_date` to the next occurrence
  and stays unchecked, so it never disappears, just moves. Calendar view and
  the Completed special view read/filter this same table.
- **`todo_subtasks`** — a simple checklist per task.

**Leads & Pipeline** (structurally identical to each other)
- **`lead_columns`** / **`pipeline_columns`** — custom user-defined stages
  (`label`, `color`, `sort_order`) — unlike Tasks lists, these aren't fixed.
- **`lead_cards`** / **`pipeline_cards`** — `title`, `value`, `due_date`
  ("Next Activity"), `phone`/`email`/`address`, `tag_buyer`/`tag_listing`,
  denormalized `last_activity_at`/`last_activity_text`. `pipeline_cards` also
  has `source_lead_id` (nullable, `SET NULL` on delete) — a pointer reserved
  for a future Lead→Pipeline conversion action, not used by anything yet.
- **`lead_notes`** / **`pipeline_notes`** — an append-only activity log per
  card. Inserting a note fires a trigger that stamps `last_activity_at`/
  `last_activity_text` onto the parent card.

**Deals** (the one module with a different shape)
- **`deals`** — `status` is a **fixed** 4-value stage (`Active`/`Under
  Contract`/`Pending`/`Closed`, not a user-customizable column like Leads/
  Pipeline), `type` (`Buyer`/`Listing`, a single select — not two independent
  tags), the four milestone dates (`acceptance_date`/`inspection_date`/
  `appraisal_date`/`closing_date`), and money/terms fields (`value`, `price`,
  `earnest_money`, `concessions`, `loan_type`).
- **`deal_notes`** — same append-only-log + activity-stamp-trigger pattern as
  Leads/Pipeline notes.

Every row across every table is scoped to the signed-in user via Postgres
row-level security (`auth.uid()`), and Supabase Realtime pushes changes to
every open device/tab automatically — no manual refresh needed.

## Project structure

```
src/
  components/   Header (nav: Tasks/Leads/Pipeline/Deals), AuthModal
                Sidebar, TaskListView, TaskRow, TaskModal, CalendarView   (Tasks)
                LeadsBoard, LeadCardMini, LeadCardModal                  (Leads)
                PipelineBoard, PipelineCardMini, PipelineCardModal       (Pipeline)
                DealsBoard, DealCardMini, NewDealModal, DealModal        (Deals)
  hooks/        useAuth (session)
                useTasks, useLeads, usePipeline, useDeals
                (each: data fetch/mutate + realtime sync, refetch-not-optimistic)
  lib/          supabaseClient, dates (todayKey/formatDueDate/calendar helpers), format (formatCurrency)
  types.ts      All table row types + Page/View union types + shared color palette
supabase/
  schema.sql    Every table + RLS policies + realtime publication + all triggers
```

## What's deliberately not built yet

Carried over from the original app's feature set but intentionally out of
scope so far — add these on request:

- Drag-and-drop reordering (lists, folders, tasks between lists/dates; cards
  between columns in Leads/Pipeline; deals between stages)
- Smart-scheduling date parser ("tomorrow", "next Thursday" in the title)
- List/folder/column color-picker UI, rename-in-place (currently all use
  `window.prompt()`)
- The "add task for this day" quick-add affordance on Calendar day cells
- List/Value alternate views for Leads/Pipeline/Deals (Deals originally also
  had a Calendar view of its own, on top of Tasks' Calendar)
- File uploads (Leads/Pipeline/Deals)
- The three conversion actions (Lead→Pipeline, Lead→Deal, Pipeline→Deal) —
  each just an insert-into-destination + delete-origin-row, now unblocked
  since all destination modules exist, but not built yet
- Real invite/collaboration model for Deals (the original teenyapp had
  owner + single-collaborator sharing; this rebuild is single-owner-only
  everywhere so far)
