-- ============================================================
-- Migration v3 — run this AFTER schema.sql and schema_v2_migration.sql.
-- Safe to run on a project that already has real data: it does not drop
-- or alter any existing rows, only constraints/columns.
-- ============================================================

-- Roll numbers repeat across classes (e.g. roll 12 exists in both 6th and
-- 9th), so a student must now be identified by roll_number + class
-- together, not roll_number alone.
alter table students drop constraint if exists students_roll_number_key;
alter table students add constraint students_roll_class_unique unique (roll_number, class);

-- Anti-cheating: optional shuffling per paper.
-- shuffle_questions       — reorder questions per student
-- shuffle_options         — reorder each MCQ's options per student
-- shuffle_group_size      — how many students (by roll-number order within
--                           the class) share the same shuffled order before
--                           it changes to a new one. 1 = every student
--                           different; e.g. 5 = blocks of 5 share an order,
--                           like handing out paper "sets" in rotation.
alter table tests add column if not exists shuffle_questions boolean not null default false;
alter table tests add column if not exists shuffle_options boolean not null default false;
alter table tests add column if not exists shuffle_group_size int not null default 1;
