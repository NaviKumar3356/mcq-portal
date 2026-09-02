-- V15: one active student browser/device session per student account.
-- Run after schema_v14_migration.sql.
-- A session is considered active while its heartbeat is refreshed. The
-- application releases it on logout and treats it as stale after 15 minutes.

create table if not exists student_active_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  session_id uuid not null unique,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(student_id)
);

create index if not exists idx_student_active_sessions_last_seen
  on student_active_sessions(last_seen_at);

alter table student_active_sessions enable row level security;
-- No client policies: only the Netlify server uses the service role.

-- Storage limits reduce accidental/abusive uploads and keep the portal fast.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif',
      'application/pdf',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip','application/x-zip-compressed'
    ]
where id = 'answer-sheets';

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif',
      'application/pdf',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip','application/x-zip-compressed'
    ]
where id = 'question-resources';

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'student-photos';

-- Query-performance indexes used by dashboards, test loading and grading.
create index if not exists idx_tests_class_status on tests(class, status);
create index if not exists idx_tests_results_published on tests(results_published) where results_published = true;
create index if not exists idx_submissions_student_test on submissions(student_id, test_id);
create index if not exists idx_answers_question on answers(question_id);
create index if not exists idx_questions_test_order on questions(test_id, order_index);
