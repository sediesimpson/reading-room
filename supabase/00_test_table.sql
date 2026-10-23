-- Step 1: a throwaway table to prove the app can read from Supabase.
-- Paste into the Supabase SQL editor and run. Delete it with 00_drop_test_table.sql afterwards.

create table test (
  id bigint generated always as identity primary key,
  message text not null
);

insert into test (message) values ('Hello from Supabase');

-- Let the page (which has no login yet) read this table.
alter table test enable row level security;
create policy "anyone can read test" on test for select using (true);
grant select on test to anon;
