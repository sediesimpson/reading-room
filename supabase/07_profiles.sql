-- Step 7: your names. Run after 06_login.sql.
-- Paste into the Supabase SQL editor, then replace the placeholders THERE.
-- Don't save real email addresses in this file: the repo is public.

insert into profiles (user_id, display_name)
select id, 'YOUR NAME' from auth.users where email = 'YOUR EMAIL';

insert into profiles (user_id, display_name)
select id, 'FRIEND NAME' from auth.users where email = 'FRIEND EMAIL';

-- Optional: links and reads from before login have nobody attached.
-- To make them yours, remove the "--" from the next two lines and add your email.
-- (If the second one complains about "reads_once_each", run dev_reset.sql instead.)
-- update links set added_by = (select id from auth.users where email = 'YOUR EMAIL') where added_by is null;
-- update reads set user_id = (select id from auth.users where email = 'YOUR EMAIL') where user_id is null;
