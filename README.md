# TC Dashboard (web)

A Vite + React + TypeScript + Supabase rebuild of TC Dashboard, with real
self-service signup and a real database so every user gets their own private
workspace. This is phase 1 of the rebuild: **auth + the Tasks module** only
(folders, lists, tasks, subtasks, Today/Upcoming). Leads, Pipeline, and Deals
are not ported yet — that's phase 2+.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (any
   name/region is fine).
2. In the project dashboard, open **SQL Editor → New query**, paste in the
   contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This
   creates `profiles`, `todo_folders`, `todo_lists`, `todos`, and
   `todo_subtasks` with row-level security so only the signed-in user's data
   is ever visible, a trigger that creates a `profiles` row automatically at
   signup, and turns on realtime sync for all four Tasks tables.
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
account, and start adding tasks.

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
  and stays unchecked, so it never disappears, just moves.
- **`todo_subtasks`** — a simple checklist per task.
- Every row is scoped to the signed-in user via Postgres row-level security
  (`auth.uid()`), and Supabase Realtime pushes changes to every open
  device/tab automatically — no manual refresh needed.

## Project structure

```
src/
  components/   Header, AuthModal, Sidebar (folders/lists/Today/Upcoming),
                TaskListView (add-task form + rows), TaskRow, TaskModal
  hooks/        useAuth (session), useTasks (data fetch/mutate + realtime sync)
  lib/          supabaseClient, dates (todayKey/formatDueDate/etc.)
  types.ts      TodoFolder/TodoList/Todo/TodoSubtask types + list colors
supabase/
  schema.sql    Tables + RLS policies + realtime publication + signup trigger
```

## What's deliberately not built yet (phase 2+)

Carried over from the original app's feature set but out of scope for this
first pass — add these once the core is validated:

- Drag-and-drop reordering (lists, folders, tasks between lists/dates)
- Calendar view (Month/Week/Day)
- Smart-scheduling date parser ("tomorrow", "next Thursday" in the title)
- List/folder color-picker UI, rename-in-place (currently uses `prompt()`)
- "Completed" special view, Leads, Pipeline, Deals modules
