-- Step 7: let each of you set your own display name from the app.
-- Paste into the Supabase SQL editor and run, after 06_login.sql.

-- A new profile belongs to whoever is logged in...
alter table profiles alter column user_id set default auth.uid();

-- ...and you can only create or rename your own.
create policy "you can add your own profile" on profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "you can rename yourself" on profiles
  for update to authenticated using (user_id = auth.uid());
grant insert, update on profiles to authenticated;

-- Optional: links and reads from before login have nobody attached.
-- These give them to the first account created (you, if you added yourself first).
-- Remove the "--" to run them. If the second complains about "reads_once_each",
-- run dev_reset.sql instead.
-- update links set added_by = (select id from auth.users order by created_at limit 1) where added_by is null;
-- update reads set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
