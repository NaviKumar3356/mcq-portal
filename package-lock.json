-- ============================================================
-- Migration v4 — run after v3. Safe on existing data.
-- Lets a teacher/admin grant ONE specific student re-entry to a paper,
-- either because they submitted early by accident, or because they
-- missed the window entirely — without affecting anyone else's access.
-- ============================================================
create table if not exists test_reopens (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  reopened_by uuid references teachers(id) on delete set null,
  reopened_at timestamptz default now(),
  unique(test_id, student_id)
);
alter table test_reopens enable row level security;
-- no policies => only reachable via the service role in Netlify Functions

create index if not exists idx_test_reopens_student on test_reopens(student_id);
