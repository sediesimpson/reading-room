-- For testing only: empties the wheel, every pick and every read, so you can start fresh.
-- This deletes data for good. Never run it once you're using the app for real.

truncate reads, daily_picks, links restart identity;
