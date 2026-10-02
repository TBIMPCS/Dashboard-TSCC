create index if not exists activity_actor_idx on public.case_activity(actor_id);
create index if not exists comments_author_idx on public.case_comments(author_id);
