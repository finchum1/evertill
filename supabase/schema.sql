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
-- out of the signUp() call's `options.data` metadata.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name'
  );
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
