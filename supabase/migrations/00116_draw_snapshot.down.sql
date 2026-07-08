-- 00116_draw_snapshot.down.sql — reverse of 00116.
-- Dropping the column fully reverts; approved draws fall back to recompute-on-read.
ALTER TABLE public.draws DROP COLUMN IF EXISTS snapshot;
