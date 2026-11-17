-- Kyzbac Discord-linked reviews migration.
-- Run AFTER the original reviews-schema.sql has created public.portfolio_reviews.
-- This migration preserves existing reviews and requires Discord OAuth for new ones.

alter table public.portfolio_reviews
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists discord_user_id text,
  add column if not exists discord_username text,
  add column if not exists discord_global_name text,
  add column if not exists discord_avatar_hash text,
  add column if not exists discord_avatar_url text;

create index if not exists portfolio_reviews_discord_user_id_idx
  on public.portfolio_reviews (discord_user_id)
  where discord_user_id is not null;

-- Do not trust browser-supplied names, IDs, or avatar URLs.
-- The trigger reads the Discord identity stored by Supabase Auth for auth.uid().
create or replace function public.attach_discord_review_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_discord_id text;
  v_identity_data jsonb;
  v_avatar_hash text;
  v_avatar_extension text;
  v_default_avatar integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Discord sign-in is required to submit a review.';
  end if;

  select discord_identity.provider_id, discord_identity.identity_data
    into v_discord_id, v_identity_data
  from auth.identities as discord_identity
  where discord_identity.user_id = v_user_id
    and discord_identity.provider = 'discord'
  order by discord_identity.last_sign_in_at desc nulls last
  limit 1;

  if v_discord_id is null or v_discord_id !~ '^[0-9]{15,22}$' then
    raise exception 'A valid Discord identity is required to submit a review.';
  end if;

  v_identity_data := coalesce(v_identity_data, '{}'::jsonb);
  v_avatar_hash := nullif(v_identity_data ->> 'avatar', '');

  new.user_id := v_user_id;
  new.discord_user_id := v_discord_id;
  new.discord_username := coalesce(
    nullif(v_identity_data ->> 'username', ''),
    nullif(v_identity_data ->> 'preferred_username', '')
  );
  new.discord_global_name := coalesce(
    nullif(v_identity_data ->> 'global_name', ''),
    nullif(v_identity_data ->> 'name', ''),
    nullif(v_identity_data ->> 'full_name', '')
  );
  new.discord_avatar_hash := v_avatar_hash;
  new.name := coalesce(new.discord_global_name, new.discord_username, 'Discord user');

  if v_avatar_hash is not null then
    v_avatar_extension := case when left(v_avatar_hash, 2) = 'a_' then 'gif' else 'png' end;
    new.discord_avatar_url := format(
      'https://cdn.discordapp.com/avatars/%s/%s.%s?size=128',
      v_discord_id,
      v_avatar_hash,
      v_avatar_extension
    );
  else
    v_default_avatar := ((v_discord_id::bigint >> 22) % 6)::integer;
    new.discord_avatar_url := format(
      'https://cdn.discordapp.com/embed/avatars/%s.png',
      v_default_avatar
    );
  end if;

  -- All new reviews remain pending, regardless of the submitted payload.
  new.status := 'pending';
  return new;
end;
$$;

revoke all on function public.attach_discord_review_identity() from public;

drop trigger if exists portfolio_reviews_attach_discord_identity on public.portfolio_reviews;
create trigger portfolio_reviews_attach_discord_identity
before insert on public.portfolio_reviews
for each row execute function public.attach_discord_review_identity();

alter table public.portfolio_reviews enable row level security;

-- Keep the public feed read-only and limited to approved reviews.
drop policy if exists "Public can read approved reviews" on public.portfolio_reviews;
create policy "Public can read approved reviews"
  on public.portfolio_reviews
  for select
  to anon, authenticated
  using (status = 'approved');

-- Remove the previous anonymous insert policy and require an authenticated user.
drop policy if exists "Visitors can submit pending reviews" on public.portfolio_reviews;
drop policy if exists "Authenticated users can submit pending reviews" on public.portfolio_reviews;
create policy "Authenticated users can submit pending reviews"
  on public.portfolio_reviews
  for insert
  to authenticated
  with check (status = 'pending' and user_id = auth.uid());

revoke all on table public.portfolio_reviews from anon, authenticated;
grant select on table public.portfolio_reviews to anon, authenticated;
grant insert on table public.portfolio_reviews to authenticated;

-- No public UPDATE or DELETE policy is created. Approve/reject reviews from
-- Supabase Table Editor; the browser cannot approve its own submission.
