-- ============================================================
-- Migration v6 — run after v5. Safe on existing data.
--
-- Part A: Practical (code) questions with per-student variants.
--   Each practical question stores a pool of "variants" (different
--   problem statements + optional starter code). At test time, every
--   student is deterministically assigned exactly one variant, spread
--   round-robin across the class roster by roll number, so neighbours
--   rarely get the same problem.
--
-- Part B: Custom reopen duration.
--   Previously a reopened student always got the paper's original
--   duration_minutes counted from the moment of reopening. Now a
--   teacher/admin can optionally set a different number of minutes
--   for that one reopened attempt (e.g. "give them just 10 minutes
--   to finish the bit they missed"). NULL means "use the paper's
--   normal duration_minutes", so existing reopens keep working as
--   before with no data changes required.
-- ============================================================

alter table questions drop constraint if exists questions_type_check;
alter table questions add constraint questions_type_check
  check (type in ('mcq','written','upload','practical'));

alter table questions add column if not exists language text;   -- 'python' | 'html', practical only
alter table questions add column if not exists variants jsonb;  -- [{question_text, starter_code}, ...]

-- Snapshot of exactly which variant a student was given, stored at
-- submit time, so grading always shows the right prompt even if the
-- teacher edits the variant pool later.
alter table answers add column if not exists variant_snapshot jsonb;

alter table test_reopens add column if not exists reopen_minutes int;
