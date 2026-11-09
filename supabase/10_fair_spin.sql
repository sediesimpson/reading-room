-- Fair spins: every person with links on the wheel gets an equal chance,
-- however many links they've added. And a link leaves the wheel as soon as
-- anyone in the room has read it.
-- Paste into the Supabase SQL editor and run it once.

create or replace function spin()
returns daily_picks
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Africa/Johannesburg')::date;
  my_group uuid := my_group_id();
  chosen_person uuid;
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

  -- First pick a random person who has an unread link on the wheel...
  select l.added_by into chosen_person
  from links l
  where l.group_id = my_group
    and not exists (select 1 from reads r where r.link_id = l.id)
  group by l.added_by
  order by random()
  limit 1;

  -- ...then one of that person's unread links.
  insert into daily_picks (group_id, link_id, pick_date)
  select my_group, l.id, today
  from links l
  where l.group_id = my_group
    and l.added_by = chosen_person
    and not exists (select 1 from reads r where r.link_id = l.id)
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
