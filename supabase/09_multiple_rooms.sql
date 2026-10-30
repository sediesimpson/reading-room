-- Multiple rooms: you can belong to several rooms and switch between them.
-- profiles.group_id stays, but now means "the room you're looking at".
-- Safe to run on live data: everyone keeps the room they're in now.
-- Paste into the Supabase SQL editor and run it once.


-- MEMBERSHIPS ---------------------------------------------------------------

-- One row per person per room.
create table room_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Everyone already in a room becomes a member of it.
insert into room_members (group_id, user_id)
select group_id, user_id from profiles where group_id is not null;

-- True if you're a member of the room. "security definer" lets the rules
-- below use it without tripping over room_members' own rules.
create function is_member(room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from room_members where group_id = room and user_id = auth.uid());
$$;

-- True if you and another person share at least one room.
create function shares_a_room(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from room_members mine
    join room_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;


-- RULES ---------------------------------------------------------------------

alter table room_members enable row level security;
create policy "see who's in your rooms" on room_members
  for select to authenticated using (is_member(group_id));
-- Joining and leaving only happen through the functions below.
grant select on room_members to authenticated;

-- See every room you're in (for the room menu), not just the current one.
drop policy "see your group" on groups;
create policy "see your rooms" on groups
  for select to authenticated using (is_member(id));

-- See yourself, and anyone you share a room with, whichever room they're
-- looking at right now.
drop policy "see yourself and your group" on profiles;
create policy "see yourself and your roommates" on profiles
  for select to authenticated using (user_id = auth.uid() or shares_a_room(user_id));


-- FUNCTIONS -----------------------------------------------------------------

-- Same as before, except "everyone" now means the room's current members,
-- and only their reads count.
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
  if my_group is null or not is_member(my_group) then
    raise exception 'join a reading room first';
  end if;

  -- Already spun today? Hand back that pick.
  select * into pick from daily_picks where group_id = my_group and pick_date = today;
  if found then
    return pick;
  end if;

  -- Otherwise pick a random link that not everyone in the room has read yet.
  select count(*) into members from room_members where group_id = my_group;
  insert into daily_picks (group_id, link_id, pick_date)
  select my_group, l.id, today
  from links l
  where l.group_id = my_group
    and (
      select count(*)
      from reads r
      join room_members m on m.user_id = r.user_id and m.group_id = my_group
      where r.link_id = l.id
    ) < members
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

-- Starts a new room, adds you to it and switches you to it.
create or replace function create_group(group_name text)
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

  insert into groups (name) values (trim(group_name)) returning * into new_group;
  insert into room_members (group_id, user_id) values (new_group.id, auth.uid());
  update profiles set group_id = new_group.id where user_id = auth.uid();
  return new_group;
end;
$$;

-- Joins the room an invite link points to (if you're not in it already)
-- and switches you to it.
create or replace function join_group(code text)
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

  insert into room_members (group_id, user_id) values (target.id, auth.uid())
  on conflict do nothing;
  update profiles set group_id = target.id where user_id = auth.uid();
  return target;
end;
$$;

-- Switches the room you're looking at, to one you're a member of.
create function switch_room(room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_member(room) then
    raise exception 'you''re not in that room';
  end if;
  update profiles set group_id = room where user_id = auth.uid();
end;
$$;

-- Leaves the room you're looking at, and switches you to your most recently
-- joined other room (or to none). Your links stay in the room's wheel.
create function leave_room()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  leaving uuid := my_group_id();
begin
  delete from room_members where group_id = leaving and user_id = auth.uid();
  update profiles
  set group_id = (
    select group_id from room_members
    where user_id = auth.uid()
    order by joined_at desc
    limit 1
  )
  where user_id = auth.uid();
end;
$$;

-- Only logged-in people can call these.
revoke execute on function is_member(uuid), shares_a_room(uuid), switch_room(uuid), leave_room() from public, anon;
grant execute on function is_member(uuid), shares_a_room(uuid), switch_room(uuid), leave_room() to authenticated;
