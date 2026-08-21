-- V10: teacher attendance / absence tracking for test submissions.
-- Run after schema_v9_migration.sql.

alter table submissions add column if not exists absence_reason text;
alter table submissions add column if not exists marked_absent_at timestamptz;

create index if not exists idx_submissions_status on submissions(status);
create index if not exists idx_submissions_absent on submissions(marked_absent_at);
