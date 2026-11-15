-- Kyzbac portfolio reviews
-- Run this once in Supabase Dashboard -> SQL Editor.

create table if not exists public.portfolio_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  project text not null default '' check (char_length(project) <= 100),
  rating integer not null check (rating between 1 and 5),
  message text not null check (char_length(trim(message)) between 10 and 1200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.portfolio_reviews enable row level security;

-- Index the public feed query (approved, newest first).
create index if not exists portfolio_reviews_public_created_at_idx
  on public.portfolio_reviews (created_at desc)
  where status = 'approved';

-- Explicitly remove inherited/default client privileges, then grant only
-- the read and insert operations this frontend needs.
revoke all on table public.portfolio_reviews from anon, authenticated;

-- Public visitors can read approved reviews only.
drop policy if exists "Public can read approved reviews" on public.portfolio_reviews;
create policy "Public can read approved reviews"
  on public.portfolio_reviews
  for select
  to anon, authenticated
  using (status = 'approved');

-- Anyone can submit, but the row must remain pending until you approve it.
drop policy if exists "Visitors can submit pending reviews" on public.portfolio_reviews;
create policy "Visitors can submit pending reviews"
  on public.portfolio_reviews
  for insert
  to anon, authenticated
  with check (status = 'pending');

-- Give the public API only the operations controlled by the policies above.
grant select, insert on public.portfolio_reviews to anon, authenticated;

-- No public UPDATE or DELETE policy is created. Approve or reject submissions
-- from the Supabase dashboard using your owner account.
