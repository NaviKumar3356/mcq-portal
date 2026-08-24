-- ============================================================
-- Migration v12 — administrator-controlled default student avatar.
-- Run after schema_v11_migration.sql.
--
-- The setting stores a public site-assets path. When empty, the
-- frontend uses public/default-student-avatar.svg as the final fallback.
-- ============================================================

insert into app_settings (key, value)
values ('default_avatar', '{}'::jsonb)
on conflict (key) do nothing;
