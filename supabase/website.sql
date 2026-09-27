-- Standalone website tables. Does not modify ticket tables, users, or payment functions.
begin;
create table public.fuku_website_admins (
 user_id uuid primary key references auth.users(id), created_at timestamptz not null default now()
);
alter table public.fuku_website_admins enable row level security;
revoke all on public.fuku_website_admins from anon, authenticated;
grant select on public.fuku_website_admins to authenticated;
create policy website_own_admin on public.fuku_website_admins for select to authenticated using (user_id = (select auth.uid()));
create table public.fuku_website_drafts (
 id text primary key check (id = 'main'), content jsonb not null,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.fuku_website_drafts enable row level security;
revoke all on public.fuku_website_drafts from anon, authenticated;
grant select on public.fuku_website_drafts to authenticated;
create policy website_admin_read_draft on public.fuku_website_drafts for select to authenticated using (exists(select 1 from public.fuku_website_admins where user_id=(select auth.uid())));
create table public.fuku_website_public (
 id text primary key check (id = 'main'), content jsonb not null, published_at timestamptz not null default now()
);
alter table public.fuku_website_public enable row level security;
revoke all on public.fuku_website_public from anon, authenticated;
grant select on public.fuku_website_public to anon, authenticated;
create policy website_public_read on public.fuku_website_public for select to anon, authenticated using (true);
create function public.fuku_website_save(document jsonb, expected_revision timestamptz)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare previous timestamptz; next_revision timestamptz;
begin
 if not exists(select 1 from public.fuku_website_admins where user_id=auth.uid()) then raise exception 'Administrator required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 select updated_at into previous from public.fuku_website_drafts where id='main' for update;
 if previous is distinct from expected_revision then raise exception 'Another editor saved changes. Reload before saving.'; end if;
 if (document->>'schemaVersion') is distinct from '1' or jsonb_typeof(document->'members') is distinct from 'array' or octet_length(document::text)>2000000 then raise exception 'Invalid website document'; end if;
 next_revision := clock_timestamp();
 insert into public.fuku_website_drafts(id,content,updated_at) values('main',document,next_revision)
 on conflict(id) do update set content=excluded.content, updated_at=excluded.updated_at;
 return next_revision;
end $$;
create function public.fuku_website_publish(expected_revision timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare document jsonb; revision timestamptz;
begin
 if not exists(select 1 from public.fuku_website_admins where user_id=auth.uid()) then raise exception 'Administrator required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(9272026);
 select content,updated_at into document,revision from public.fuku_website_drafts where id='main' for update;
 if document is null or revision is distinct from expected_revision then raise exception 'Draft changed. Review again.'; end if;
 -- Hidden members stay private even if someone inspects the public API response.
 document := jsonb_set(document,'{members}',coalesce((select jsonb_agg(m) from jsonb_array_elements(document->'members') m where coalesce((m->>'published')::boolean,true)),'[]'::jsonb));
 insert into public.fuku_website_public(id,content) values('main',document)
 on conflict(id) do update set content=excluded.content,published_at=clock_timestamp();
end $$;
revoke all on function public.fuku_website_save(jsonb,timestamptz) from public, anon;
revoke all on function public.fuku_website_publish(timestamptz) from public, anon;
grant execute on function public.fuku_website_save(jsonb,timestamptz) to authenticated;
grant execute on function public.fuku_website_publish(timestamptz) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('fuku-website-images','fuku-website-images',true,8388608,array['image/jpeg','image/png','image/webp']);
create policy website_admin_upload on storage.objects for insert to authenticated with check (
 bucket_id='fuku-website-images' and exists(select 1 from public.fuku_website_admins where user_id=(select auth.uid()))
);
-- Restrictive guard prevents any existing permissive storage policy from bypassing website authorization.
create policy website_storage_guard on storage.objects as restrictive for all to public using (
 bucket_id<>'fuku-website-images' or exists(select 1 from public.fuku_website_admins where user_id=(select auth.uid()))
) with check (
 bucket_id<>'fuku-website-images' or exists(select 1 from public.fuku_website_admins where user_id=(select auth.uid()))
);
commit;
-- Add the agreed administrator separately in SQL Editor after verifying their Auth user id.
-- insert into public.fuku_website_admins(user_id) values ('VERIFIED-AUTH-USER-UUID');
