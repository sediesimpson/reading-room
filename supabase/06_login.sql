-- Step 7: login. Names for the two of you, and every row knows who made it.
-- Paste into the Supabase SQL editor and run, AFTER creating both users
-- (Authentication -> Users -> Add user).

-- Display names, so the page says "from sam", not an email address.
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
);

alter table profiles enable row level security;
create policy "anyone can read profiles" on profiles for select using (true);

-- Who added each link, who spun each day, who read what.
-- "default auth.uid()" fills in whoever is logged in, automatically.
alter table links add column added_by uuid references auth.users (id) default auth.uid();
alter table daily_picks add column spun_by uuid references auth.users (id) default auth.uid();
alter table reads alter column user_id set default auth.uid();
alter table reads add constraint reads_user_id_fkey foreign key (user_id) references auth.users (id);

-- Each of you can mark a link as read only once.
alter table reads add constraint reads_once_each unique (link_id, user_id);

-- Logged-in visitors use the "authenticated" role, so give it the same
-- access the page had before. Step 9 tightens all of this.
grant select, insert on links, reads to authenticated;
grant select on daily_picks, profiles to authenticated;
grant execute on function spin() to authenticated;
