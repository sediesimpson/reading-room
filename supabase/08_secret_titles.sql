-- Step 9: secret titles.
-- You can see the url, title and description of your own links and of links
-- that have been picked. Everyone else's unpicked links are just a slice:
-- an id and who added it. The database decides this, not the page.
-- Paste into the Supabase SQL editor and run.

-- Reading full links: only your own, or ones that have had their day.
drop policy "see your group's links" on links;
create policy "see your own links and picked links" on links
  for select to authenticated
  using (group_id = my_group_id() and (added_by = auth.uid() or was_picked(id)));

-- The wheel itself: every link in your room, with nothing that gives it away.
-- "security definer" lets it count links you can't read in full, and it only
-- ever returns these three columns.
create function wheel_slices()
returns table (id bigint, added_by uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.added_by, l.created_at
  from links l
  where l.group_id = my_group_id()
  order by l.created_at, l.id;
$$;

revoke execute on function wheel_slices() from public, anon;
grant execute on function wheel_slices() to authenticated;
