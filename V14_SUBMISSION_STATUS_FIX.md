# V14 — Submission status display fix

## Fix
The teacher submissions page previously treated the entire class roster as `Not submitted` whenever `/submissions-list` failed. This could make students who had actually submitted appear as not submitted.

The page now only derives `Not submitted` students after the submissions API has successfully loaded. If the API fails, it shows a clear database/API error and does not invent attendance statuses.

## Required database migration for V13/V14 attendance features
Run this in Supabase SQL Editor after the earlier migrations:

`supabase/schema_v10_migration.sql`

This adds `absence_reason` and `marked_absent_at` to `submissions`.

## Local test

```powershell
npm install
netlify dev
```

Then open the teacher submissions page again.
