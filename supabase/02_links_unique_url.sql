-- Step 2 follow-up: the same link can't go in the wheel twice.
-- Paste into the Supabase SQL editor and run.

-- Remove any duplicates already added while testing, keeping the oldest.
delete from links a
using links b
where a.url = b.url and a.id > b.id;

alter table links add constraint links_url_unique unique (url);
