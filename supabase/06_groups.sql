-- Step 7: login and reading rooms (groups).
-- Anyone can sign up, but everything (links, picks, reads) belongs to a group,
-- and you can only see or change your own group's rows.
-- Paste into the Supabase SQL editor and run it once.

-- Start fresh: the test links from steps 2-6 don't belong to any group.
truncate reads, daily_picks, links restart identity;

-- Undo the earlier step 7 files, in case you ran them.
drop table if exists profiles cascade;
alter table links drop column if exists added_by;
alter table daily_picks drop column if exists spun_by;
alter table reads drop constraint if exists reads_once_each;
alter table reads drop constraint if exists reads_user_id_fkey;


-- GROUPS AND PROFILES ------------------------------------------------------

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  -- The secret part of the invite link.
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- One row per person: your name and the one group you're in (empty until you join).
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  display_name text not null check (length(display_name) between 1 and 30),
  group_id uuid references groups (id) on delete set null
);

-- The group of whoever is logged in. "security definer" lets it read
-- profiles without tripping over profiles' own rules.
create function my_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from profiles where user_id = auth.uid();
$$;


-- EVERY ROW BELONGS TO A GROUP ----------------------------------------------

-- New links go into your group and are marked as yours, automatically.
alter table links
  add column group_id uuid not null default my_group_id() references groups (id) on delete cascade,
  add column added_by uuid not null default auth.uid() references auth.users (id);
-- The same link can't go in the same wheel twice (other groups can have it).
alter table links drop constraint if exists links_url_unique;
alter table links add constraint links_url_unique unique (group_id, url);

-- One pick per day per group.
alter table daily_picks
  add column group_id uuid not null references groups (id) on delete cascade,
  add column spun_by uuid default auth.uid() references auth.users (id);
alter table daily_picks drop constraint if exists daily_picks_pick_date_key;
alter table daily_picks add constraint one_pick_per_day unique (group_id, pick_date);

-- Each read belongs to whoever marked it, once per link.
alter table reads
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  add constraint reads_user_id_fkey foreign key (user_id) references auth.users (id),
  add constraint reads_once_each unique (link_id, user_id);


-- ROW LEVEL SECURITY: ONLY YOUR GROUP ---------------------------------------

-- Remove the open, no-login rules from Part 1.
drop policy if exists "anyone can read links" on links;
drop policy if exists "anyone can add links" on links;
drop policy if exists "anyone can read picks" on daily_picks;
drop policy if exists "anyone can read reads" on reads;
drop policy if exists "anyone can add reads" on reads;
revoke all on links, daily_picks, reads from anon;

alter table groups enable row level security;
alter table profiles enable row level security;

create policy "see your group" on groups
  for select to authenticated using (id = my_group_id());

create policy "see yourself and your group" on profiles
  for select to authenticated using (user_id = auth.uid() or group_id = my_group_id());
-- You can create your own profile, but not put yourself in a group that way.
create policy "add your own profile" on profiles
  for insert to authenticated with check (user_id = auth.uid() and group_id is null);
create policy "rename yourself" on profiles
  for update to authenticated using (user_id = auth.uid());

create policy "see your group's links" on links
  for select to authenticated using (group_id = my_group_id());
create policy "add links to your group" on links
  for insert to authenticated with check (group_id = my_group_id() and added_by = auth.uid());

create policy "see your group's picks" on daily_picks
  for select to authenticated using (group_id = my_group_id());

create policy "see your group's reads" on reads
  for select to authenticated
  using (exists (select 1 from links l where l.id = reads.link_id and l.group_id = my_group_id()));
create policy "mark your group's links as read" on reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from links l where l.id = reads.link_id and l.group_id = my_group_id())
  );

grant select, insert on links, reads to authenticated;
grant select on daily_picks, groups, profiles to authenticated;
-- Only your name can be set directly. Joining a group goes through the functions below.
grant insert (display_name), update (display_name) on profiles to authenticated;


-- FUNCTIONS -----------------------------------------------------------------

-- Returns today's pick for your group, making one first if nobody has spun yet.
create or replace function spin()
returns daily_picks
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Africa/Johannesburg')::date;
  my_group uuid := my_group_id();
  members int;
  pick daily_picks;
begin
  if my_group is null then
    raise exception 'join a reading room first';
  end if;

  -- Already spun today? Hand back that pick.
  select * into pick from daily_picks where group_id = my_group and pick_date = today;
  if found then
    return pick;
  end if;

  -- Otherwise pick a random link that not everyone has read yet.
  select count(*) into members from profiles where group_id = my_group;
  insert into daily_picks (group_id, link_id, pick_date)
  select my_group, l.id, today
  from links l
  where l.group_id = my_group
    and (select count(*) from reads r where r.link_id = l.id) < members
  order by random()
  limit 1
  -- If two of you spin at the same moment, only one insert wins...
  on conflict (group_id, pick_date) do nothing
  returning * into pick;

  -- ...and the other person gets the winner's pick.
  if pick.id is null then
    select * into pick from daily_picks where group_id = my_group and pick_date = today;
  end if;

  return pick;
end;
$$;

-- Starts a new group with you in it.
create function create_group(group_name text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group groups;
begin
  if not exists (select 1 from profiles where user_id = auth.uid()) then
    raise exception 'set your name first';
  end if;
  if my_group_id() is not null then
    raise exception 'you''re already in a reading room';
  end if;

  insert into groups (name) values (trim(group_name)) returning * into new_group;
  update profiles set group_id = new_group.id where user_id = auth.uid();
  return new_group;
end;
$$;

-- Joins the group an invite link points to.
create function join_group(code text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target groups;
begin
  select * into target from groups where invite_code = code;
  if not found then
    raise exception 'that invite link doesn''t work';
  end if;
  if not exists (select 1 from profiles where user_id = auth.uid()) then
    raise exception 'set your name first';
  end if;
  if my_group_id() = target.id then
    return target;
  end if;
  if my_group_id() is not null then
    raise exception 'you''re already in a reading room';
  end if;

  update profiles set group_id = target.id where user_id = auth.uid();
  return target;
end;
$$;

-- The name of the group an invite link points to, so the join page can say
-- "join sam and jo's reads?" before you're a member.
create function invite_group_name(code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select name from groups where invite_code = code;
$$;

-- Only logged-in people can call these.
revoke execute on function spin(), my_group_id(), create_group(text), join_group(text), invite_group_name(text) from public, anon;
grant execute on function spin(), my_group_id(), create_group(text), join_group(text), invite_group_name(text) to authenticated;
