-- V17: security + free-tier performance hardening.
-- Run after schema_v16_migration.sql.

-- Faster student login lookup and roster operations.
create index if not exists idx_students_class_roll_dob
  on students(class, roll_number, dob);

-- Fast test-window lookups used by student dashboards and test loading.
create index if not exists idx_tests_class_start_at
  on tests(class, start_at desc);

-- Prevent duplicate answer rows for one question in one submission.
create unique index if not exists uq_answers_submission_question
  on answers(submission_id, question_id);

-- Keep practical-resource storage limits aligned with the application-level
-- extensions already supported by the portal.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip','application/x-zip-compressed',
  'application/octet-stream'
]
where id = 'question-resources';

-- Keep the answer bucket at the existing 20 MB ceiling and add common
-- practical MIME types where the browser may upload them.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip','application/x-zip-compressed',
  'text/plain','application/octet-stream'
]
where id = 'answer-sheets';
