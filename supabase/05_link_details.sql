-- Step 6: each link's headline, summary and preview image, fetched from the article.
-- Paste into the Supabase SQL editor and run.

alter table links
  add column title text,
  add column description text,
  add column image text;
