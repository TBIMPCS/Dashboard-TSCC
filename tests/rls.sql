-- Run as the project database administrator. Everything is rolled back.
begin;
create temporary table rls_users(label text primary key,id uuid not null default gen_random_uuid(),role text not null);
insert into rls_users(label,role) values
  ('staff-a','TSCC User'),('staff-b','TSCC User'),('staff-c','TSCC User'),
  ('requester-a','Requester'),('requester-b','Requester'),('head','Department Head'),('leader','Team Leader'),('admin','Admin');
insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,aud,role)
select id,id::text||'@example.invalid','{"full_name":"Transactional RLS Fixture","role":"Admin"}'::jsonb,'{}'::jsonb,'authenticated','authenticated' from rls_users;
do $$begin
  if exists(select 1 from public.profiles p join rls_users t on t.id=p.id where p.role<>'Requester') then raise exception 'User metadata incorrectly grants a role'; end if;
end $$;
update public.profiles p set role=t.role from rls_users t where p.id=t.id;
create temporary table rls_cases(label text primary key,id uuid not null default gen_random_uuid());
insert into rls_cases(label) values('own'),('other'),('draft');
insert into public.cases(id,ticket,created_by,requester_id,requester_name,primary_pic_id,primary_pic_name,collaborator_ids,subject,description,is_draft)
select t.id,'TEST-RLS-'||t.id::text,
  (select id from rls_users where label=case when t.label='other' then 'staff-c' else 'staff-a' end),
  (select id from rls_users where label=case when t.label='other' then 'requester-b' else 'requester-a' end),
  'Fixture Requester',
  (select id from rls_users where label=case when t.label='other' then 'staff-c' else 'staff-a' end),
  'Fixture Staff',case when t.label='other' then '{}'::uuid[] else array[(select id from rls_users where label='staff-b')] end,
  'Synthetic RLS fixture','No production data used',t.label='draft' from rls_cases t;
insert into public.case_internal(case_id,internal_note) select id,'Internal fixture note' from rls_cases;
insert into public.case_comments(case_id,author_id,author_name,body,visibility)
select c.id,u.id,'Fixture Staff','Visible fixture comment','Requester' from rls_cases c cross join rls_users u where c.label='own' and u.label='staff-a';
insert into public.case_comments(case_id,author_id,author_name,body,visibility)
select c.id,u.id,'Fixture Staff','Internal fixture comment','Internal' from rls_cases c cross join rls_users u where c.label='own' and u.label='staff-a';
grant select on rls_users,rls_cases to authenticated;
set local role authenticated;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',id,'role','authenticated')::text from rls_users where label='requester-a'),true);
do $$declare n integer;begin
  select count(*) into n from public.cases where id in(select id from rls_cases);if n<>1 then raise exception 'Requester can see unlinked or draft cases'; end if;
  select count(*) into n from public.case_internal where case_id in(select id from rls_cases);if n<>0 then raise exception 'Requester can see internal notes'; end if;
  select count(*) into n from public.case_comments where case_id in(select id from rls_cases);if n<>1 then raise exception 'Requester can see internal comments'; end if;
  update public.cases set subject='Forbidden' where id=(select id from rls_cases where label='own');get diagnostics n=row_count;if n<>0 then raise exception 'Requester can edit a case'; end if;
  begin
    update public.profiles set role='Admin' where id=auth.uid();
    raise exception 'Role escalation succeeded';
  exception when raise_exception then if sqlerrm='Role escalation succeeded' then raise; end if;end;
  begin
    insert into public.case_comments(case_id,body,visibility) values((select id from rls_cases where label='own'),'Forbidden internal comment','Internal');
    raise exception 'Internal comment insertion succeeded';
  exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',id,'role','authenticated')::text from rls_users where label='staff-b'),true);
do $$declare n integer;begin
  select count(*) into n from public.cases where id in(select id from rls_cases);if n<>2 then raise exception 'Collaborator access is incorrect'; end if;
  update public.cases set supporting_unit='IT' where id=(select id from rls_cases where label='own');get diagnostics n=row_count;if n<>1 then raise exception 'Collaborator cannot update assigned case'; end if;
  update public.cases set subject='Forbidden' where id=(select id from rls_cases where label='other');get diagnostics n=row_count;if n<>0 then raise exception 'Collaborator can edit unrelated case'; end if;
end $$;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',id,'role','authenticated')::text from rls_users where label='head'),true);
do $$declare n integer;begin
  select count(*) into n from public.cases where id in(select id from rls_cases);if n<>2 then raise exception 'Department head sees drafts or misses published cases'; end if;
  update public.cases set subject='Forbidden' where id=(select id from rls_cases where label='own');get diagnostics n=row_count;if n<>0 then raise exception 'Department head can edit cases'; end if;
end $$;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',id,'role','authenticated')::text from rls_users where label='leader'),true);
do $$declare n integer;begin
  select count(*) into n from public.cases where id in(select id from rls_cases);if n<>3 then raise exception 'Team leader access incorrect'; end if;
  update public.cases set lifecycle='Waiting Support' where id=(select id from rls_cases where label='own');
  update public.cases set lifecycle='Closed',resolution_summary='Resolved fixture',closure_reason='Fixture complete' where id=(select id from rls_cases where label='own');
  if not exists(select 1 from public.cases where id=(select id from rls_cases where label='own') and closure_date is not null and actual_handling_hours is not null and waiting_since is null) then raise exception 'Closure metrics were not persisted'; end if;
  select count(*) into n from public.case_activity where case_id=(select id from rls_cases where label='own');if n<3 then raise exception 'Audit trigger did not record updates'; end if;
  begin
    insert into public.case_activity(case_id,actor_name,action) values((select id from rls_cases where label='own'),'Forged actor','Forged action');
    raise exception 'Audit forgery succeeded';
  exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: requester isolation, internal-data privacy, collaborator access, read-only department head, team leader updates, closure metrics, role escalation prevention, and audit integrity' as verification;
rollback;
