-- ============================================================
-- Migration 2: multi-teacher support, super admin, answer-key flow
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Teachers (created by the super admin). Each teacher is assigned one or
-- more classes they're responsible for (adding/removing students, setting
-- papers, grading). A teacher logs in with username + password.
create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  name text not null,
  classes text[] not null default '{}',   -- e.g. {'6th','7th'}
  subjects text[] not null default '{}',  -- e.g. {'Mathematics','Science'}
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table teachers enable row level security;
-- no policies => only reachable via the service role in Netlify Functions

-- Track which teacher created/owns a paper, and whether the answer key
-- has been finalized (lets you build MCQs first, set the key afterward).
alter table tests add column if not exists created_by uuid references teachers(id) on delete set null;
alter table tests add column if not exists answer_key_set boolean not null default false;

-- Track which teacher added a student (useful for the "who added whom" trail;
-- not required for access control, which is done by class match in the app).
alter table students add column if not exists added_by uuid references teachers(id) on delete set null;

create index if not exists idx_tests_created_by on tests(created_by);
create index if not exists idx_students_class on students(class);
create index if not exists idx_tests_class on tests(class);
