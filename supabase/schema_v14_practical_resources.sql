-- V14: practical model solutions and downloadable task resources.
-- Run this once in Supabase SQL Editor after deploying the application.

-- Keeps optional settings for manual upload tasks, for example:
-- {"submission_mode":"image","resource":{"path":"...","name":"...","mime_type":"..."}}
alter table questions add column if not exists question_settings jsonb;

-- Private source files supplied by teachers (starter images, Word/Excel
-- templates, and similar resources). Students receive short-lived links
-- only after the portal confirms they can open the relevant paper.
insert into storage.buckets (id, name, public)
values ('question-resources', 'question-resources', false)
on conflict (id) do nothing;

-- New students default to Section A. Existing section assignments are left
-- untouched so a real roster is never silently reassigned.
alter table students alter column section set default 'A';
