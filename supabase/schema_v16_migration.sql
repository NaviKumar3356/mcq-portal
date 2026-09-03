-- V16: atomic student session acquisition.
-- Run after schema_v15_migration.sql.
create or replace function public.acquire_student_session(
  p_student_id uuid,
  p_session_id uuid,
  p_cutoff timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare acquired boolean;
begin
  insert into public.student_active_sessions (student_id, session_id, last_seen_at)
  values (p_student_id, p_session_id, now())
  on conflict (student_id) do update
    set session_id = excluded.session_id, last_seen_at = now()
    where public.student_active_sessions.last_seen_at <= p_cutoff
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;
revoke all on function public.acquire_student_session(uuid, uuid, timestamptz) from public;
grant execute on function public.acquire_student_session(uuid, uuid, timestamptz) to service_role;
