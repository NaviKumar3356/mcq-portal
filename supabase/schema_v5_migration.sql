-- ============================================================
-- Migration v5 — run after v4. Safe on existing data.
-- Adds tab-switch / window-blur cheating detection to submissions.
--
-- tab_switch_count — how many times the student left the tab/window
--                    during this attempt (before it hit the limit or
--                    they finished).
-- flagged_reason    — null for a normal submission, or a short code
--                     like 'tab_switching' when the test was
--                     auto-submitted because the student crossed the
--                     switch limit. Shown to the teacher before grading.
-- proctor_log        — jsonb array of {at, type} events (type is
--                     'tab_hidden' or 'window_blur') for a full audit
--                     trail if a teacher wants to double-check a flag.
-- ============================================================
alter table submissions add column if not exists tab_switch_count int not null default 0;
alter table submissions add column if not exists flagged_reason text;
alter table submissions add column if not exists proctor_log jsonb not null default '[]'::jsonb;

create index if not exists idx_submissions_flagged
  on submissions(flagged_reason)
  where flagged_reason is not null;
