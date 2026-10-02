create or replace function private.guard_profile() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    if (select private.current_role()) <> 'Admin' and (new.role,new.unit,new.region,new.npp,new.username,new.id,new.email) is distinct from (old.role,old.unit,old.region,old.npp,old.username,old.id,old.email) then
      raise exception 'Organizational fields and roles are managed by an administrator';
    end if;
    if new.id<>old.id or new.email<>old.email then raise exception 'Account identity is managed by Supabase Auth'; end if;
    if old.role='Admin' and new.role<>'Admin' and not exists(select 1 from public.profiles where role='Admin' and id<>old.id) then raise exception 'Keep at least one administrator account'; end if;
  end if;
  return new;
end $$;

create or replace function private.guard_case() returns trigger language plpgsql set search_path = '' as $$
declare paused boolean;
begin
  if auth.uid() is null then return new; end if;
  if tg_op='UPDATE' then
    if (new.id,new.ticket,new.created_at,new.created_by,new.source_batch) is distinct from (old.id,old.ticket,old.created_at,old.created_by,old.source_batch) then raise exception 'Case identifiers and source information cannot be changed'; end if;
    if (select private.current_role()) not in ('Admin','Team Leader') and (new.primary_pic_id,new.primary_pic_name,new.collaborator_ids,new.collaborator_names,new.requester_id) is distinct from (old.primary_pic_id,old.primary_pic_name,old.collaborator_ids,old.collaborator_names,old.requester_id) then raise exception 'Assignment and requester identity are managed by a team leader'; end if;
    -- Waiting and closure metrics are controlled by the database, not request payloads.
    new.waiting_hours=old.waiting_hours;new.waiting_since=old.waiting_since;
    new.closure_date=old.closure_date;new.actual_handling_hours=old.actual_handling_hours;
    if new.lifecycle='Waiting Support' and old.lifecycle<>'Waiting Support' then new.waiting_since=now(); end if;
    if old.lifecycle='Waiting Support' and new.lifecycle<>'Waiting Support' and old.waiting_since is not null then
      new.waiting_hours=old.waiting_hours+greatest(0,extract(epoch from(now()-old.waiting_since))/3600);new.waiting_since=null;
    end if;
    if new.lifecycle='Closed' and old.lifecycle<>'Closed' then
      if length(trim(new.resolution_summary))=0 or length(trim(new.closure_reason))=0 then raise exception 'Resolution and closure reason are required'; end if;
      select coalesce((value->>'pauseWaitingSupport')::boolean,false) into paused from public.configuration where id=true;
      new.closure_date=now();
      new.actual_handling_hours=greatest(0,extract(epoch from(now()-new.created_at))/3600-case when paused then new.waiting_hours else 0 end);
    end if;
    if new.lifecycle<>'Closed' and old.lifecycle='Closed' then new.reopened=true;new.closure_date=null;new.actual_handling_hours=null; end if;
  else
    if new.lifecycle='Closed' then raise exception 'New cases cannot start closed'; end if;
    new.created_at=now();new.waiting_hours=0;new.waiting_since=case when new.lifecycle='Waiting Support' then now() else null end;new.closure_date=null;new.actual_handling_hours=null;
  end if;
  new.updated_at=now();
  return new;
end $$;

create function private.stamp_comment() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.author_id=auth.uid();new.created_at=now();
    select full_name into new.author_name from public.profiles where id=auth.uid();
  end if;
  return new;
end $$;
revoke all on function private.stamp_comment() from public,anon;
create trigger stamp_comment before insert on public.case_comments for each row execute function private.stamp_comment();
