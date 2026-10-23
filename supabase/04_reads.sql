-- Step 5: who has read what.
-- Paste into the Supabase SQL editor and run.

create table reads (
  id bigint generated always as identity primary key,
  link_id bigint not null references links (id),
  -- Empty until step 7 adds login, then filled in automatically.
  user_id uuid,
  read_at timestamptz not null default now()
);

-- No login yet, so the page may read and add reads.
alter table reads enable row level security;
create policy "anyone can read reads" on reads for select using (true);
create policy "anyone can add reads" on reads for insert with check (true);
grant select, insert on reads to anon;

-- spin() now picks from links you haven't both read (fewer than 2 reads),
-- so a pick nobody got to goes back on the wheel for another day.
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

  -- Otherwise pick a random link you haven't both read.
  insert into daily_picks (link_id, pick_date)
  select l.id, today
  from links l
  where (select count(*) from reads r where r.link_id = l.id) < 2
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
