-- Migration v9 — school branding, public landing media and admin theme controls.
-- Run after v8.

insert into app_settings (key, value) values
  ('site_logo_path', '{}'::jsonb),
  ('site_hero_1', '{}'::jsonb),
  ('site_hero_2', '{}'::jsonb),
  ('site_hero_3', '{}'::jsonb),
  ('site_school_name', '{"value":"Sant Nandlal Smriti Vidya Mandir"}'::jsonb),
  ('site_school_place', '{"value":"Malsisar, Rajasthan"}'::jsonb),
  ('theme_primary', '{"value":"#8B1E2D"}'::jsonb),
  ('theme_secondary', '{"value":"#2F6B45"}'::jsonb),
  ('theme_accent', '{"value":"#E0A52C"}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;
