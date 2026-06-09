-- Move per-device progress state (reading cursor, reading loops, today's
-- juz-complete flag, today's algorithm batch snapshot) onto user_settings so
-- it syncs across devices. Existing rows get sensible defaults.
--
-- Safe to re-run: every column uses IF NOT EXISTS.

alter table user_settings
  add column if not exists reading_cursor integer not null default 0,
  add column if not exists reading_loops integer not null default 0,
  add column if not exists reading_last_completed_date date,
  add column if not exists algo_batch_date date,
  add column if not exists algo_batch_pages integer[] not null default '{}',
  add column if not exists algo_batch_done integer[] not null default '{}';
