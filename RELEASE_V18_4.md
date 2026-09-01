# V18.4 Release Notes — Professional Admin & Academic Catalogue

## Included
- Admin academic catalogue for Classes, Subjects and Sections.
- Student Section field in create/edit/list/CSV import workflows.
- Teacher-management class/subject options now come from the admin catalogue.
- Admin paper creation class/subject options now come from the admin catalogue.
- Teacher uploaded profile photos now appear in the Super Admin teacher list.
- Landing-page ranking carousel now gives StudentAvatar an explicit avatar class and size so uploaded/default images render inside the card instead of creating an empty-looking card.
- Shared default-avatar priority remains: student photo → admin-selected avatar → built-in SVG.
- More professional school identity fields and admin catalogue controls.
- Larger, clearer assessment date/time controls.
- Safer production error screen; React stack traces are no longer exposed to visitors.
- Student search filter characters are escaped before being placed in the PostgREST OR expression.
- Duplicate submission race returns a clean already-submitted response instead of a raw 500.
- Netlify security headers added.
- Production Netlify build now runs `npm run verify` before `npm run build`.

## Required database step
Run:

`supabase/schema_v13_migration.sql`

This adds `students.section` and the three configurable catalogue settings.

## Validation
`node scripts/verify.mjs` passes in the packaged source tree.

A full `npm run build` could not be executed in the packaging environment because dependency installation exceeded the available network/runtime window. Run `npm install && npm run verify && npm run build` on the deployment machine or local development machine before pushing to production.
