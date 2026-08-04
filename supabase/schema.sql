-- ============================================================
-- School MCQ / Written Test Portal — Supabase schema
-- Run this whole file once in: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Students (login = roll_number + dob, no email needed)
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null unique,
  name text not null,
  class text not null,          -- e.g. '6th', '7th'
  dob date not null,
  created_at timestamptz default now()
);

-- Tests / papers
create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text,
  class text not null,          -- which class this paper is for
  duration_minutes int not null default 30,
  start_at timestamptz,         -- test opens
  end_at timestamptz,           -- test closes (auto-submit after this)
  total_marks numeric default 0,
  status text not null default 'draft',   -- draft | published | closed
  results_published boolean not null default false,
  created_at timestamptz default now()
);

-- Questions belonging to a test. type: 'mcq' | 'written' | 'upload'
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  order_index int not null default 0,
  type text not null check (type in ('mcq','written','upload')),
  question_text text not null,
  options jsonb,                 -- ["A","B","C","D"] for mcq
  correct_option int,            -- index into options, for mcq only
  marks numeric not null default 1
);

-- One row per student attempt at a test
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  submitted_at timestamptz default now(),
  status text not null default 'submitted', -- submitted | graded
  total_marks_awarded numeric,
  unique(test_id, student_id)
);

-- One row per answered question inside a submission
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  mcq_selected int,              -- selected option index (mcq)
  written_text text,             -- typed answer (written)
  file_path text,                -- storage path of uploaded scan (upload)
  marks_awarded numeric,
  teacher_remark text
);

-- Indexes
create index if not exists idx_questions_test on questions(test_id);
create index if not exists idx_submissions_test on submissions(test_id);
create index if not exists idx_answers_submission on answers(submission_id);

-- ------------------------------------------------------------
-- Row Level Security: lock the tables down completely.
-- All reads/writes happen through Netlify Functions using the
-- Supabase SERVICE ROLE key, which bypasses RLS. Nothing here
-- is ever reachable directly from the browser.
-- ------------------------------------------------------------
alter table students enable row level security;
alter table tests enable row level security;
alter table questions enable row level security;
alter table submissions enable row level security;
alter table answers enable row level security;
-- (no policies created => no direct client access at all)

-- ------------------------------------------------------------
-- Storage bucket for scanned/photographed answer copies.
-- Run this separately if it errors here — or create manually:
-- Supabase Dashboard -> Storage -> New bucket -> "answer-sheets" (private)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('answer-sheets', 'answer-sheets', false)
on conflict (id) do nothing;
