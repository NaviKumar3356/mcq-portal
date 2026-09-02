-- V14: practical/reference resources + model answers + default Section A
alter table questions add column if not exists reference_answer text;
alter table questions add column if not exists resource_path text;
alter table questions add column if not exists resource_name text;
alter table questions add column if not exists resource_mime text;

insert into storage.buckets (id, name, public)
values ('question-resources', 'question-resources', false)
on conflict (id) do nothing;

-- Make Section A the default for existing students and future imports.
update students set section = 'A' where section is null or trim(section) = '';
