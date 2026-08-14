alter table public.scans add column if not exists confidence integer;
alter table public.scans add column if not exists all_scores jsonb default '{}'::jsonb;
