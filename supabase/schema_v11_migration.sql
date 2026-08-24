-- V11: make-up attempts and safe merging of separately-created make-up papers.
-- Run after schema_v10_migration.sql.

alter table test_reopens add column if not exists attempt_type text not null default 'reopen';
alter table test_reopens add column if not exists absence_reason_snapshot text;

alter table submissions add column if not exists attempt_type text not null default 'original';
alter table submissions add column if not exists make_up_of_test_id uuid references tests(id) on delete set null;
alter table submissions add column if not exists merged_from_test_id uuid references tests(id) on delete set null;

create index if not exists idx_submissions_attempt_type on submissions(attempt_type);
create index if not exists idx_submissions_make_up_of on submissions(make_up_of_test_id);
