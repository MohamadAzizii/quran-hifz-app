-- Partial-page progress within a learning page
alter table user_pages
  add column if not exists progress_ayah_key text,
  add column if not exists graduated_to_recent_at timestamptz;

-- Numeric ordinal for stable ayah ordering (string ayah_key sorts "2:10" before "2:2")
alter table ayah_cache
  add column if not exists ayah_ordinal integer;

create index if not exists ayah_cache_page_ordinal_idx
  on ayah_cache (page_number, ayah_ordinal);

create index if not exists user_pages_user_status_idx
  on user_pages (user_id, status);

create index if not exists user_pages_user_review_idx
  on user_pages (user_id, next_review_date);
