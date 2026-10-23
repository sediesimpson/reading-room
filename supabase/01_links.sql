-- Step 2: the links in the wheel.
-- Paste into the Supabase SQL editor and run.

create table links (
  id bigint generated always as identity primary key,
  url text not null,
  created_at timestamptz not null default now()
);

-- No login yet, so the page (the "anon" role) may read and add links.
-- Step 9 replaces these with proper per-person rules.
alter table links enable row level security;
create policy "anyone can read links" on links for select using (true);
create policy "anyone can add links" on links for insert with check (true);
grant select, insert on links to anon;
