-- Transactional checks. Rolls back every test edit and publication.
-- Run after the initial document has been seeded. Uses an existing administrator.
begin;
select set_config('fuku.test_admin',(select user_id::text from public.fuku_website_admins limit 1),true);
set local role anon;
do $$ begin
 if has_table_privilege('anon','public.fuku_website_drafts','SELECT') then raise exception 'Anonymous draft access'; end if;
 if has_function_privilege('anon','public.fuku_website_publish(timestamptz)','EXECUTE') then raise exception 'Anonymous publishing'; end if;
 if not exists(select 1 from public.fuku_website_public where id='main') then raise exception 'Public site unreadable'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if exists(select 1 from public.fuku_website_drafts) then raise exception 'Non-admin draft access'; end if;
 begin
  perform public.fuku_website_save('{}'::jsonb,null);
  raise exception 'Non-admin saved draft';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('fuku.test_admin'),true);
do $$ declare c jsonb; r timestamptz; n timestamptz; begin
 select content,updated_at into c,r from public.fuku_website_drafts where id='main';
 if c is null then raise exception 'Admin cannot read'; end if;
 c:=jsonb_set(c,'{members,0,published}','false');
 n:=public.fuku_website_save(c,r);
 begin
  perform public.fuku_website_save(c,r);
  raise exception 'Stale save was accepted' using errcode='XX000';
 exception when sqlstate 'P0001' then null; end;
 perform public.fuku_website_publish(n);
 if (select jsonb_array_length(content->'members') from public.fuku_website_public where id='main') <> jsonb_array_length(c->'members')-1 then raise exception 'Hidden member leaked'; end if;
end $$;
reset role;
rollback;
select 'PASS: anonymous, non-admin, administrator, stale-save conflict, hidden-member filtering; test edits rolled back' as verification;
