# V14 — Teacher submissions and paper builder update

## Fix: submitted students were incorrectly shown as Not submitted
The submissions function now falls back to the existing submission columns if the attendance migration has not yet been applied. This prevents a missing `absence_reason` column from making the entire class roster appear as Not submitted.

When the attendance migration is missing, the page clearly warns that attendance is disabled. Submitted/graded attempts still appear correctly.

## Attendance
Run `supabase/schema_v10_migration.sql` after the previous migrations to enable:
- Mark absent
- Absence reason
- Unmark absent
- Attendance filtering

## Teacher submissions UI
- Professional page header
- Pending grading terminology
- Clear status cards and filters
- Search and flag filters retained
- Submitted attempts remain distinct from Not submitted students

## New paper builder
- Guided header and progress steps
- Better paper-details card
- Responsive field grid
- Question library section
- Decorative question count
- Cleaner add-question controls
- Professional save bar
- Mobile/tablet responsive layout

Run locally:
```powershell
npm install
netlify dev
```
