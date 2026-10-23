-- Step 4: one pick per day, chosen by the database.
-- Paste into the Supabase SQL editor and run.

create table daily_picks (
  id bigint generated always as identity primary key,
  link_id bigint not null references links (id),
  -- unique: there can only ever be one pick for a given day.
  pick_date date not null unique,
  spun_at timestamptz not null default now()
);

-- The page may read picks, but only spin() can make them.
alter table daily_picks enable row level security;
create policy "anyone can read picks" on daily_picks for select using (true);
grant select on daily_picks to anon;

-- Returns today's pick, making one first if nobody has spun yet today.
-- "security definer" lets it insert into daily_picks on the page's behalf.
create or replace function spin()
returns daily_picks
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Africa/Johannesburg')::date;
  pick daily_picks;
begin
  -- Already spun today? Hand back that pick.
  select * into pick from daily_picks where pick_date = today;
  if found then
    return pick;
  end if;

  -- Otherwise pick a random link that has never been picked before.
  insert into daily_picks (link_id, pick_date)
  select l.id, today
  from links l
  where not exists (select 1 from daily_picks p where p.link_id = l.id)
  order by random()
  limit 1
  -- If you both spin at the same moment, only one insert wins...
  on conflict (pick_date) do nothing
  returning * into pick;

  -- ...and the other person gets the winner's pick.
  if pick.id is null then
    select * into pick from daily_picks where pick_date = today;
  end if;

  return pick;
end;
$$;

grant execute on function spin() to anon;
