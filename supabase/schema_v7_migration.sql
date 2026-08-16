-- ============================================================
-- Migration v7 — run after v6. Safe on existing data.
--
-- Adds an optional profile photo per student, used by the new public
-- "Hall of Fame" leaderboard on the landing page. Photos live in a
-- PUBLIC storage bucket (unlike answer-sheets, which is private) since
-- they're meant to be shown to anonymous visitors on the front page —
-- never put anything else in this bucket.
-- ============================================================

alter table students add column if not exists photo_path text;

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;
