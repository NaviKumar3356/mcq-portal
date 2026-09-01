-- V13: configurable school catalog + student sections
alter table students add column if not exists section text;

insert into app_settings (key, value, updated_at) values
('school_classes', '{"items":["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"]}', now()),
('school_subjects', '{"items":["English","Hindi","Sanskrit","Mathematics","EVS","Computer","Science","SST","CT & AI"]}', now()),
('school_sections', '{"items":["A","B","C"]}', now())
on conflict (key) do nothing;
