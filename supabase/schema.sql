-- T-CAMS schema. Application roles come from protected database profiles, never user metadata.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null, full_name text not null, username text not null default '',
  role text not null default 'Requester' check(role in ('TSCC User','Team Leader','Department Head','Admin','Requester')),
  unit text not null default '', region text not null default '', npp text not null default '',
  phone text not null default '', language text not null default 'en' check(language in ('en','id')),
  avatar_path text, created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create function private.current_role() returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and auth.uid() is not null
$$;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;

create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name,username)
  values(new.id,coalesce(new.email,''),coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(coalesce(new.email,'User'),'@',1)),split_part(coalesce(new.email,''),'@',1));
  return new;
end $$;
revoke all on function private.create_profile() from public, anon, authenticated;
create trigger create_profile after insert on auth.users for each row execute function private.create_profile();

create function private.guard_profile() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and (select private.current_role()) <> 'Admin' and
    (new.role,new.unit,new.region,new.npp,new.username,new.id,new.email) is distinct from
    (old.role,old.unit,old.region,old.npp,old.username,old.id,old.email) then
    raise exception 'Organizational fields and roles are managed by an administrator';
  end if;
  return new;
end $$;
revoke all on function private.guard_profile() from public, anon;
create trigger guard_profile before update on public.profiles for each row execute function private.guard_profile();
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.current_role()) in ('TSCC User','Team Leader','Department Head','Admin'));
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid()) or (select private.current_role())='Admin') with check(id=(select auth.uid()) or (select private.current_role())='Admin');
grant select, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

create sequence public.ticket_sequence start 1;
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  ticket text not null unique default ('TSCC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.ticket_sequence')::text,6,'0')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid(), requester_id uuid references public.profiles(id),
  requester_name text not null default '', requester_unit text not null default '', region text not null default '', segment text not null default '',
  customer_name text not null default '', counterpart text not null default '', contact text not null default '', channel text not null default '',
  product text not null default 'Other', category text not null default 'Other', raw_category text not null default '', subcategory text not null default 'Other', reference_no text not null default '',
  subject text not null default 'Draft Case', description text not null default '', resolution_summary text not null default '', complexity text not null default '',
  involvement text not null default 'Business', priority text not null default 'Medium', supporting_unit text not null default 'None', additional_info text not null default '',
  primary_pic_id uuid references public.profiles(id), primary_pic_name text not null default '',
  collaborator_ids uuid[] not null default '{}', collaborator_names text[] not null default '{}',
  is_draft boolean not null default false, draft_reason text not null default '',
  lifecycle text not null default 'Probing' check(lifecycle in ('Probing','In Progress','Waiting Support','Closed')),
  escalation_status text not null default 'Not Escalated', escalation_reason text not null default '',
  closure_date timestamptz, closure_reason text not null default '', follow_up_date timestamptz,
  actual_handling_hours numeric check(actual_handling_hours >= 0), waiting_hours numeric not null default 0 check(waiting_hours >= 0), waiting_since timestamptz,
  source_batch text, reopened boolean not null default false,
  check(is_draft or (length(trim(subject))>0 and length(trim(requester_name))>0 and length(trim(description))>0))
);
alter table public.cases enable row level security;
create index cases_pic_idx on public.cases(primary_pic_id);
create index cases_creator_idx on public.cases(created_by);
create index cases_requester_idx on public.cases(requester_id);
create index cases_collaborators_idx on public.cases using gin(collaborator_ids);
create index cases_updated_idx on public.cases(updated_at desc);
create index cases_report_idx on public.cases(created_at desc, region, product);
create index cases_open_idx on public.cases(follow_up_date) where lifecycle <> 'Closed';

create function private.can_read_case(case_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.cases c where c.id=case_uuid and (
    (select private.current_role()) in ('Admin','Team Leader') or
    ((select private.current_role())='Department Head' and not c.is_draft) or
    ((select private.current_role())='TSCC User' and (c.primary_pic_id=auth.uid() or auth.uid()=any(c.collaborator_ids) or c.created_by=auth.uid())) or
    ((select private.current_role())='Requester' and c.requester_id=auth.uid() and not c.is_draft)
  ))
$$;
create function private.can_edit_case(case_uuid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.cases c where c.id=case_uuid and (
    (select private.current_role()) in ('Admin','Team Leader') or
    ((select private.current_role())='TSCC User' and (c.primary_pic_id=auth.uid() or auth.uid()=any(c.collaborator_ids) or c.created_by=auth.uid()))
  ))
$$;
revoke all on function private.can_read_case(uuid), private.can_edit_case(uuid) from public, anon;
grant execute on function private.can_read_case(uuid), private.can_edit_case(uuid) to authenticated;
create policy cases_read on public.cases for select to authenticated using(
  (select private.current_role()) in ('Admin','Team Leader') or
  ((select private.current_role())='Department Head' and not is_draft) or
  ((select private.current_role())='TSCC User' and (primary_pic_id=(select auth.uid()) or (select auth.uid())=any(collaborator_ids) or created_by=(select auth.uid()))) or
  ((select private.current_role())='Requester' and requester_id=(select auth.uid()) and not is_draft)
);
create policy cases_insert on public.cases for insert to authenticated with check(
  created_by=(select auth.uid()) and (
    (select private.current_role()) in ('Admin','Team Leader') or
    ((select private.current_role())='TSCC User' and primary_pic_id=(select auth.uid()))
  )
);
create policy cases_update on public.cases for update to authenticated using(private.can_edit_case(id)) with check(
  (select private.current_role()) in ('Admin','Team Leader') or
  ((select private.current_role())='TSCC User' and (primary_pic_id=(select auth.uid()) or (select auth.uid())=any(collaborator_ids) or created_by=(select auth.uid())))
);
grant select, insert, update on public.cases to authenticated;
grant usage on sequence public.ticket_sequence to authenticated;
revoke all on public.cases from anon;

create function private.guard_case() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op='UPDATE' then
    if (new.id,new.ticket,new.created_at,new.created_by,new.source_batch) is distinct from (old.id,old.ticket,old.created_at,old.created_by,old.source_batch) then
      raise exception 'Case identifiers and source information cannot be changed';
    end if;
    if (select private.current_role()) not in ('Admin','Team Leader') and (new.primary_pic_id,new.primary_pic_name,new.collaborator_ids,new.collaborator_names,new.requester_id) is distinct from (old.primary_pic_id,old.primary_pic_name,old.collaborator_ids,old.collaborator_names,old.requester_id) then
      raise exception 'Assignment and requester identity are managed by a team leader';
    end if;
    if new.lifecycle='Closed' and old.lifecycle<>'Closed' then
      if length(trim(new.resolution_summary))=0 or length(trim(new.closure_reason))=0 then raise exception 'Resolution and closure reason are required'; end if;
      new.closure_date=now();
      new.actual_handling_hours=greatest(0,extract(epoch from (now()-new.created_at))/3600-new.waiting_hours);
    end if;
    if new.lifecycle<>'Closed' and old.lifecycle='Closed' then new.reopened=true; new.closure_date=null; new.actual_handling_hours=null; end if;
    if new.lifecycle='Waiting Support' and old.lifecycle<>'Waiting Support' then new.waiting_since=now(); end if;
    if old.lifecycle='Waiting Support' and new.lifecycle<>'Waiting Support' and old.waiting_since is not null then
      new.waiting_hours=old.waiting_hours+greatest(0,extract(epoch from(now()-old.waiting_since))/3600); new.waiting_since=null;
    end if;
  else
    if new.lifecycle='Closed' then raise exception 'New cases cannot start closed'; end if;
    new.created_at=now();
  end if;
  new.updated_at=now();
  return new;
end $$;
revoke all on function private.guard_case() from public, anon;
create trigger guard_case before insert or update on public.cases for each row execute function private.guard_case();

create table public.case_internal(case_id uuid primary key references public.cases(id) on delete cascade, internal_note text not null default '', legacy_source jsonb);
alter table public.case_internal enable row level security;
create policy internal_read on public.case_internal for select to authenticated using((select private.current_role())<>'Requester' and private.can_read_case(case_id));
create policy internal_insert on public.case_internal for insert to authenticated with check(private.can_edit_case(case_id));
create policy internal_update on public.case_internal for update to authenticated using(private.can_edit_case(case_id)) with check(private.can_edit_case(case_id));
grant select on public.case_internal to authenticated;
grant insert(case_id,internal_note),update(internal_note) on public.case_internal to authenticated;

create table public.case_comments(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid not null references public.profiles(id) default auth.uid(),author_name text not null default '',body text not null check(length(trim(body))>0),
  visibility text not null default 'Internal' check(visibility in ('Internal','Requester')),created_at timestamptz not null default now());
alter table public.case_comments enable row level security;
create index comments_case_idx on public.case_comments(case_id,created_at);
create policy comments_read on public.case_comments for select to authenticated using(private.can_read_case(case_id) and (visibility='Requester' or (select private.current_role())<>'Requester'));
create policy comments_insert on public.case_comments for insert to authenticated with check(author_id=(select auth.uid()) and private.can_read_case(case_id) and (
  (private.can_edit_case(case_id)) or ((select private.current_role())='Requester' and visibility='Requester')
));
grant select,insert on public.case_comments to authenticated;

create table public.case_activity(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,
  actor_id uuid references public.profiles(id),actor_name text not null,action text not null,previous_status text not null default '',next_status text not null default '',
  body text not null default '',visibility text not null default 'Requester' check(visibility in ('Internal','Requester')),created_at timestamptz not null default now());
alter table public.case_activity enable row level security;
create index activity_case_idx on public.case_activity(case_id,created_at);
create policy activity_read on public.case_activity for select to authenticated using(private.can_read_case(case_id) and (visibility='Requester' or (select private.current_role())<>'Requester'));
grant select on public.case_activity to authenticated;
create function private.audit_case() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor text;
begin
  if auth.uid() is null then return new; end if;
  select full_name into actor from public.profiles where id=auth.uid();
  insert into public.case_activity(case_id,actor_id,actor_name,action,previous_status,next_status,visibility)
    values(new.id,auth.uid(),coalesce(actor,'User'),case when tg_op='INSERT' then 'Case Created' when old.is_draft and not new.is_draft then 'Case Submitted' when new.lifecycle='Closed' and old.lifecycle<>'Closed' then 'Case Closed' when old.lifecycle='Closed' and new.lifecycle<>'Closed' then 'Case Reopened' when new.lifecycle is distinct from old.lifecycle then 'Status Updated' else 'Case Updated' end,
      case when tg_op='UPDATE' then old.lifecycle else '' end,new.lifecycle,case when new.is_draft then 'Internal' else 'Requester' end);
  return new;
end $$;
revoke all on function private.audit_case() from public,anon,authenticated;
create trigger audit_case after insert or update on public.cases for each row execute function private.audit_case();

create table public.reminders(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) default auth.uid(),due_at timestamptz not null,note text not null default '',completed boolean not null default false);
alter table public.reminders enable row level security;
create index reminders_case_idx on public.reminders(case_id);
create index reminders_owner_idx on public.reminders(owner_id,due_at);
create policy reminders_read on public.reminders for select to authenticated using((select private.current_role())<>'Requester' and private.can_read_case(case_id));
create policy reminders_insert on public.reminders for insert to authenticated with check(owner_id=(select auth.uid()) and private.can_edit_case(case_id));
create policy reminders_update on public.reminders for update to authenticated using(private.can_edit_case(case_id)) with check(private.can_edit_case(case_id));
grant select,insert,update on public.reminders to authenticated;

create table public.attachments(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) default auth.uid(),name text not null,path text not null unique,size bigint not null check(size between 0 and 10485760),created_at timestamptz not null default now());
alter table public.attachments enable row level security;
create index attachments_case_idx on public.attachments(case_id);
create index attachments_uploader_idx on public.attachments(uploaded_by);
create policy attachments_read on public.attachments for select to authenticated using(private.can_read_case(case_id));
create policy attachments_insert on public.attachments for insert to authenticated with check(uploaded_by=(select auth.uid()) and private.can_edit_case(case_id) and split_part(path,'/',1)=case_id::text);
create policy attachments_delete on public.attachments for delete to authenticated using(private.can_edit_case(case_id));
grant select,insert,delete on public.attachments to authenticated;

create table public.calendar_notes(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) default auth.uid(),date date not null,note text not null check(length(trim(note))>0));
alter table public.calendar_notes enable row level security;
create index calendar_user_idx on public.calendar_notes(user_id,date);
create policy calendar_own on public.calendar_notes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.calendar_notes to authenticated;

create table public.configuration(id boolean primary key default true check(id),value jsonb not null);
alter table public.configuration enable row level security;
create policy config_read on public.configuration for select to authenticated using(true);
create policy config_update on public.configuration for update to authenticated using((select private.current_role())='Admin') with check((select private.current_role())='Admin');
grant select,update on public.configuration to authenticated;
insert into public.configuration(value) values('{"products":["SCF","LC","DG/CG/BGUC","GB Lokal","SKBDN","SBLC","Documentary Collection","Other"],"categories":["Access / Administration","Document / Draft Review","Inquiry","Other","Product / Policy Guidance","Settlement","System / Technical Issue","Transaction / Processing"],"subcategories":["Eligibility / Requirement","Transaction Status","Document Completeness","Limit Inquiry","Process Clarification","Backend Issue","Channel Issue","Settlement","Draft Wording","Scheme / Structure","Other"],"regions":["W01","W02","W03","W04","W05","W06","W07","W08","W09","W10","W11","W12","W14","W15","W16","W17","W18"],"channels":["WhatsApp","Email","Visit","Call","Discussion"],"requesterUnits":["RM","PS","LNC","TL","CS LN/IBS","WDC","BTP","Other Internal BNI"],"supportUnits":["None","BTO","IT","Product Team","Business Unit","Operational Unit","WDC","Credit Admin","Other"],"involvement":["Business","IT","Business + IT"],"priorities":["Low","Medium","High"],"tatHours":{"Business":8,"IT":12,"Business + IT":16},"pauseWaitingSupport":false,"nearTatThreshold":0.8}');

insert into storage.buckets(id,name,public,file_size_limit) values('case-attachments','case-attachments',false,10485760),('avatars','avatars',false,1048576);
create policy case_files_read on storage.objects for select to authenticated using(bucket_id='case-attachments' and exists(select 1 from public.cases c where c.id::text=split_part(name,'/',1) and private.can_read_case(c.id)));
create policy case_files_insert on storage.objects for insert to authenticated with check(bucket_id='case-attachments' and exists(select 1 from public.cases c where c.id::text=split_part(name,'/',1) and private.can_edit_case(c.id)));
create policy case_files_delete on storage.objects for delete to authenticated using(bucket_id='case-attachments' and exists(select 1 from public.cases c where c.id::text=split_part(name,'/',1) and private.can_edit_case(c.id)));
create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars' and (split_part(name,'/',1)=(select auth.uid())::text or (select private.current_role()) in ('TSCC User','Team Leader','Department Head','Admin')));
create policy avatars_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);

-- No anonymous access to business tables; service-role access is reserved for import tools.
revoke all on public.case_internal,public.case_comments,public.case_activity,public.reminders,public.attachments,public.calendar_notes,public.configuration from anon;
grant all on public.profiles,public.cases,public.case_internal,public.case_comments,public.case_activity,public.reminders,public.attachments,public.calendar_notes,public.configuration to service_role;
grant usage on sequence public.ticket_sequence to service_role;
