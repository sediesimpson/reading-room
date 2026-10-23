-- Step 8: edit and delete your own links.
-- Paste into the Supabase SQL editor and run.

-- True once a link has been the pick on any day.
create function was_picked(link bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from daily_picks where link_id = link);
$$;
revoke execute on function was_picked(bigint) from public, anon;
grant execute on function was_picked(bigint) to authenticated;

-- Only your own links, and only until they've been picked
-- (changing a picked link would rewrite what you've already read).
create policy "edit your own unpicked links" on links
  for update to authenticated
  using (added_by = auth.uid() and not was_picked(id))
  with check (added_by = auth.uid() and group_id = my_group_id());
create policy "delete your own unpicked links" on links
  for delete to authenticated
  using (added_by = auth.uid() and not was_picked(id));

-- Editing can change the url and its details, never who added it or its room.
grant update (url, title, description, image), delete on links to authenticated;

-- Only picked links can be marked as read, so an unpicked link never has
-- reads holding on to it and can always be deleted.
drop policy "mark your group's links as read" on reads;
create policy "mark your group's picked links as read" on reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from links l where l.id = reads.link_id and l.group_id = my_group_id())
    and was_picked(link_id)
  );
