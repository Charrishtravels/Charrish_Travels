create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  occupation text,
  rating smallint not null check (rating between 1 and 5),
  message text not null,
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Safe to re-run on a database that already has the `reviews` table from before
-- the photo-upload / occupation features were added.
alter table reviews add column if not exists photo_url text;
alter table reviews add column if not exists occupation text;

create index if not exists reviews_status_idx on reviews (status, created_at desc);

alter table reviews enable row level security;
-- No policies are defined: with RLS on and no policies, only requests using the
-- service role key (used by the Netlify Functions) can read/write this table.

-- Public bucket for reviewer-submitted photos. Public read access is required
-- so approved reviews can display the photo directly by URL; only the Netlify
-- Functions (service role key) can ever write to it.
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;
