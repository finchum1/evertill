-- TC Dashboard — Supabase schema (Tasks module + auth profile)
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Access model: private per-user data. Anyone can self-service sign up (see
-- the app's Sign Up form), but each user only ever sees their own folders,
-- lists, tasks, and subtasks — row-level security scopes every row to
-- auth.uid(), so one person's tasks are never visible to another user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Profile (captured at signup — full name + company name)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_owner_all" on profiles;
create policy "profiles_owner_all" on profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row right after signup, pulling full_name/company_name
-- out of the signUp() call's `options.data` metadata. Also seeds every new
-- user's Leads/Pipeline boards with a starter set of columns (matching the
-- stages the app's own daily use settled on) so a brand-new signup never
-- lands on an empty "No columns yet" board. Safe to forward-reference
-- lead_columns/pipeline_columns here even though they're defined later in
-- this file — plpgsql function bodies aren't validated against table
-- existence until the function actually runs, and by the time any real
-- signup fires this trigger, the whole script has already run once.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name'
  );

  insert into public.lead_columns (user_id, label, color, sort_order) values
    (new.id, 'New Lead', 'purple', 0),
    (new.id, 'Contacted', 'green', 1),
    (new.id, 'Follow Up', 'amber', 2),
    (new.id, 'Qualified', 'pink', 3),
    (new.id, 'Not Interested', 'blue', 4);

  insert into public.pipeline_columns (user_id, label, color, sort_order) values
    (new.id, '1+ Year', 'indigo', 0),
    (new.id, '6+ Month', 'green', 1),
    (new.id, '3-6 Months', 'amber', 2),
    (new.id, '1-3 Months', 'pink', 3),
    (new.id, 'Active', 'blue', 4);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Tasks module: todo_folders (optional grouping) -> todo_lists -> todos -> todo_subtasks
-- user_id is denormalized onto every table (not just looked up via the
-- parent) so RLS on each table is a simple auth.uid() = user_id check,
-- and inserts can rely on the column's own default rather than a join.
-- ---------------------------------------------------------------------
create table if not exists todo_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'New Folder',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists todo_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id uuid references todo_folders(id) on delete set null,
  name text not null default 'New List',
  color text not null default 'slate',
  is_inbox boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  list_id uuid not null references todo_lists(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists todo_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  todo_id uuid not null references todos(id) on delete cascade,
  title text not null,
  checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists todo_folders_user_id_idx on todo_folders(user_id);
create index if not exists todo_lists_user_id_idx on todo_lists(user_id);
create index if not exists todo_lists_folder_id_idx on todo_lists(folder_id);
-- Guarantees at most one Inbox per user even under a client-side race (React
-- StrictMode's dev-only double-invoke let two concurrent "create Inbox if
-- missing" calls both pass their in-memory check before either insert
-- landed — a real duplicate this caused was found and removed from live
-- data). The client now treats the resulting unique-violation as expected.
create unique index if not exists todo_lists_one_inbox_per_user on todo_lists(user_id) where is_inbox = true;
create index if not exists todos_user_id_idx on todos(user_id);
create index if not exists todos_list_id_idx on todos(list_id);
create index if not exists todo_subtasks_user_id_idx on todo_subtasks(user_id);
create index if not exists todo_subtasks_todo_id_idx on todo_subtasks(todo_id);

alter table todo_folders enable row level security;
alter table todo_lists enable row level security;
alter table todos enable row level security;
alter table todo_subtasks enable row level security;

drop policy if exists "todo_folders_owner_all" on todo_folders;
create policy "todo_folders_owner_all" on todo_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todo_lists_owner_all" on todo_lists;
create policy "todo_lists_owner_all" on todo_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_owner_all" on todos;
create policy "todos_owner_all" on todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todo_subtasks_owner_all" on todo_subtasks;
create policy "todo_subtasks_owner_all" on todo_subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable realtime updates so changes on one device/tab show up on others without a manual refresh.
alter publication supabase_realtime add table todo_folders;
alter publication supabase_realtime add table todo_lists;
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table todo_subtasks;

-- ---------------------------------------------------------------------
-- Leads module: lead_columns (custom user-defined stages) -> lead_cards -> lead_notes
-- Same denormalized-user_id-on-every-table pattern as the Tasks module above.
-- ---------------------------------------------------------------------
create table if not exists lead_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null default 'New Column',
  color text not null default 'slate',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lead_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  column_id uuid not null references lead_columns(id) on delete cascade,
  title text not null default 'Untitled lead',
  value numeric not null default 0,
  due_date date, -- "Next Activity"
  phone text,
  email text,
  address text,
  tag_buyer boolean not null default false,
  tag_listing boolean not null default false,
  sort_order integer not null default 0,
  last_activity_at timestamptz,
  last_activity_text text,
  created_at timestamptz not null default now()
);

create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references lead_cards(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_columns_user_id_idx on lead_columns(user_id);
create index if not exists lead_cards_user_id_idx on lead_cards(user_id);
create index if not exists lead_cards_column_id_idx on lead_cards(column_id);
create index if not exists lead_notes_user_id_idx on lead_notes(user_id);
create index if not exists lead_notes_card_id_idx on lead_notes(card_id);

alter table lead_columns enable row level security;
alter table lead_cards enable row level security;
alter table lead_notes enable row level security;

drop policy if exists "lead_columns_owner_all" on lead_columns;
create policy "lead_columns_owner_all" on lead_columns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lead_cards_owner_all" on lead_cards;
create policy "lead_cards_owner_all" on lead_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lead_notes_owner_all" on lead_notes;
create policy "lead_notes_owner_all" on lead_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Logging a note stamps last_activity_at/last_activity_text on its parent
-- card, so the board can show "last touched" without a separate query.
create or replace function public.stamp_lead_card_activity()
returns trigger as $$
begin
  update lead_cards
  set last_activity_at = new.created_at, last_activity_text = new.body
  where id = new.card_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_lead_note_created on lead_notes;
create trigger on_lead_note_created
  after insert on lead_notes
  for each row execute function public.stamp_lead_card_activity();

alter publication supabase_realtime add table lead_columns;
alter publication supabase_realtime add table lead_cards;
alter publication supabase_realtime add table lead_notes;

-- ---------------------------------------------------------------------
-- Pipeline module: structurally identical to Leads above (custom columns ->
-- cards -> notes, same denormalized-user_id RLS pattern). pipeline_cards
-- additionally has source_lead_id, an informational-only pointer for the
-- future Lead -> Pipeline conversion action (not built yet) — SET NULL on
-- delete so removing the originating lead never breaks the pipeline card.
-- ---------------------------------------------------------------------
create table if not exists pipeline_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null default 'New Column',
  color text not null default 'slate',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists pipeline_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  column_id uuid not null references pipeline_columns(id) on delete cascade,
  source_lead_id uuid references lead_cards(id) on delete set null,
  title text not null default 'Untitled client',
  value numeric not null default 0,
  due_date date, -- "Next Activity"
  phone text,
  email text,
  address text,
  tag_buyer boolean not null default false,
  tag_listing boolean not null default false,
  sort_order integer not null default 0,
  last_activity_at timestamptz,
  last_activity_text text,
  created_at timestamptz not null default now()
);

create table if not exists pipeline_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references pipeline_cards(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists pipeline_columns_user_id_idx on pipeline_columns(user_id);
create index if not exists pipeline_cards_user_id_idx on pipeline_cards(user_id);
create index if not exists pipeline_cards_column_id_idx on pipeline_cards(column_id);
create index if not exists pipeline_notes_user_id_idx on pipeline_notes(user_id);
create index if not exists pipeline_notes_card_id_idx on pipeline_notes(card_id);

alter table pipeline_columns enable row level security;
alter table pipeline_cards enable row level security;
alter table pipeline_notes enable row level security;

drop policy if exists "pipeline_columns_owner_all" on pipeline_columns;
create policy "pipeline_columns_owner_all" on pipeline_columns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pipeline_cards_owner_all" on pipeline_cards;
create policy "pipeline_cards_owner_all" on pipeline_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pipeline_notes_owner_all" on pipeline_notes;
create policy "pipeline_notes_owner_all" on pipeline_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.stamp_pipeline_card_activity()
returns trigger as $$
begin
  update pipeline_cards
  set last_activity_at = new.created_at, last_activity_text = new.body
  where id = new.card_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_pipeline_note_created on pipeline_notes;
create trigger on_pipeline_note_created
  after insert on pipeline_notes
  for each row execute function public.stamp_pipeline_card_activity();

alter publication supabase_realtime add table pipeline_columns;
alter publication supabase_realtime add table pipeline_cards;
alter publication supabase_realtime add table pipeline_notes;

-- ---------------------------------------------------------------------
-- Deals module: unlike Leads/Pipeline, deals move through a FIXED set of
-- stages (not user-customizable columns) and carry milestone dates and
-- money/terms fields instead of contact tags. deal_notes follows the same
-- append-only-log + activity-stamp-trigger pattern as lead_notes/pipeline_notes.
-- ---------------------------------------------------------------------
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  address text not null default 'New Deal',
  type text not null default 'Buyer' check (type in ('Buyer', 'Listing')),
  status text not null default 'Active'
    check (status in ('Active', 'In Escrow', 'Inspections', 'Pre-Closing', 'Closed')),
  agent_name text,
  value numeric not null default 0,
  price numeric not null default 0,
  earnest_money numeric not null default 0,
  concessions numeric not null default 0,
  loan_type text,
  acceptance_date date,
  inspection_date date,
  appraisal_date date,
  closing_date date,
  sort_order integer not null default 0,
  last_activity_at timestamptz,
  last_activity_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for an already-existing deals table (this project's live database
-- already had the old 4-value status enum before this change): adds the new
-- agent_name column and swaps the status check constraint to the 5 new
-- stage names. Safe to re-run.
alter table deals add column if not exists agent_name text;
alter table deals drop constraint if exists deals_status_check;
alter table deals add constraint deals_status_check
  check (status in ('Active', 'In Escrow', 'Inspections', 'Pre-Closing', 'Closed'));

create table if not exists deal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists deals_user_id_idx on deals(user_id);
create index if not exists deal_notes_user_id_idx on deal_notes(user_id);
create index if not exists deal_notes_deal_id_idx on deal_notes(deal_id);

alter table deals enable row level security;
alter table deal_notes enable row level security;

drop policy if exists "deals_owner_all" on deals;
create policy "deals_owner_all" on deals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deal_notes_owner_all" on deal_notes;
create policy "deal_notes_owner_all" on deal_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.stamp_deal_activity()
returns trigger as $$
begin
  update deals
  set last_activity_at = new.created_at, last_activity_text = new.body
  where id = new.deal_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_deal_note_created on deal_notes;
create trigger on_deal_note_created
  after insert on deal_notes
  for each row execute function public.stamp_deal_activity();

alter publication supabase_realtime add table deals;
alter publication supabase_realtime add table deal_notes;

-- ---------------------------------------------------------------------
-- Deal templates: reusable task/document checklists a user can maintain
-- and seed onto new deals. Exactly one template may be the user's default
-- (the one actually applied to new deals) — enforced the same way
-- todo_lists enforces one Inbox per user, via a partial unique index rather
-- than an app-level check, so it holds even under concurrent writes.
-- deal_checklist_items is the per-deal COPY of a template's items at
-- creation time, so editing a template later never retroactively changes
-- a checklist already in progress on an existing deal.
-- ---------------------------------------------------------------------
create table if not exists deal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'New template',
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists deal_template_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_id uuid not null references deal_templates(id) on delete cascade,
  kind text not null check (kind in ('task', 'document')),
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists deal_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  kind text not null check (kind in ('task', 'document')),
  title text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists deal_templates_one_default_per_user on deal_templates(user_id) where is_default = true;
create index if not exists deal_templates_user_id_idx on deal_templates(user_id);
create index if not exists deal_template_items_template_id_idx on deal_template_items(template_id);
create index if not exists deal_checklist_items_deal_id_idx on deal_checklist_items(deal_id);

alter table deal_templates enable row level security;
alter table deal_template_items enable row level security;
alter table deal_checklist_items enable row level security;

drop policy if exists "deal_templates_owner_all" on deal_templates;
create policy "deal_templates_owner_all" on deal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deal_template_items_owner_all" on deal_template_items;
create policy "deal_template_items_owner_all" on deal_template_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "deal_checklist_items_owner_all" on deal_checklist_items;
create policy "deal_checklist_items_owner_all" on deal_checklist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table deal_templates;
alter publication supabase_realtime add table deal_template_items;
alter publication supabase_realtime add table deal_checklist_items;
