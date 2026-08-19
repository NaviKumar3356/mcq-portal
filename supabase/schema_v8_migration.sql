-- ============================================================
-- Migration v8 — run after v7. Safe on existing data.
--
-- Adds self-service profile photos for TEACHERS and the SUPER ADMIN
-- (students already got a photo_path column in v7; ManageStudents.jsx
-- lets a teacher/admin set a student's photo, but nobody had a way to
-- set their OWN photo). Also adds a tiny generic key/value settings
-- table to hold the super admin's photo — there's no "admins" table
-- since the one super admin account lives in env vars, not the DB.
-- ============================================================

alter table teachers add column if not exists photo_path text;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table app_settings enable row level security;
-- no policies => only reachable via the service role in Netlify Functions

-- Re-use the existing PUBLIC 'student-photos' bucket for teacher + admin
-- photos too (avatars aren't sensitive, and one public bucket keeps the
-- storage setup simple). No bucket changes needed here.
