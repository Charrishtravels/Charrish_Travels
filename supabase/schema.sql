create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating smallint not null check (rating between 1 and 5),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists reviews_status_idx on reviews (status, created_at desc);

alter table reviews enable row level security;
-- No policies are defined: with RLS on and no policies, only requests using the
-- service role key (used by the Netlify Functions) can read/write this table.
