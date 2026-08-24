# v18.3 — Admin-controlled default student avatar

# MCQ Test Portal

A production-oriented school assessment platform for **Sant Nandlal Smriti Vidya Mandir, Malsisar, Rajasthan**.

The application separates public, student, teacher and Super Admin experiences while keeping sensitive operations behind authenticated Netlify Functions. It supports secure assessments, server-authoritative timing, grading, attendance, published rankings, report cards, media uploads and controlled make-up-test merging.

**Release:** V18.2 — Production polish, relationship-safe rankings, admin theme studio and responsive UX

## Product areas

### Public
- School-branded landing page with student ranking carousel.
- Public Top 10 leaderboard with equal-score competition ranking.
- Class filters and responsive layouts.
- Student/Teacher portals are separated from public navigation.
- Super Admin login is intentionally hidden behind a private route.

### Student portal
- Authenticated dashboard and test access.
- Server-authoritative assessment timing.
- Question/option shuffling where configured by the teacher.
- Secure submission and result handling.
- Review of selected vs correct answers.
- Student photo self-service.
- Professional result/report-card exports.
- Class leaderboard and profile management.
- Safe navigation even when a student has no submitted attempts.

### Teacher portal
- Create/edit/publish assessment papers.
- MCQ, written, upload and practical question types.
- DOCX question import.
- Question and MCQ-option shuffling with configurable grouping.
- Submission search, filtering and grading.
- Correct/wrong/unanswered visibility and teacher remarks.
- Attendance and absence-reason recording.
- Reopen and make-up-test workflows.
- Controlled merge of a later make-up submission into the original assessment.
- Student photo management.
- Excel, PDF and image exports.

### Super Admin portal
- Separate protected login route.
- Teacher CRUD and assignment management.
- Student CRUD and photo management.
- Paper/test administration.
- School branding and site-media uploads.
- Logo, hero images and theme controls.
- Theme presets plus custom colours.
- Interface density/corner preferences.
- School-wide leaderboard access and exports.

## Architecture

```text
Browser / React
      |
      | /api/*
      v
Netlify Functions
      |
      +---- JWT authentication / role checks
      |
      +---- Supabase database
      |
      +---- Supabase Storage
```

The browser JWT payload is used only for UI state. **Authorization is enforced again inside every protected server function.** Never rely on hidden routes or client-side role checks as the security boundary.

## Project structure

```text
mcq-portal/
├── public/                       # Logos, favicon and landing assets
├── src/
│   ├── components/              # Shared layouts/theme/logo components
│   ├── lib/                     # API client, auth, constants, parsers
│   ├── pages/                   # Public, student, teacher and admin pages
│   ├── App.jsx                  # Routes and role protection
│   └── main.jsx                 # React entry point
├── netlify/functions/            # Server-side API endpoints
│   ├── utils/                   # Auth, DB and shared server helpers
│   ├── leaderboard.js
│   ├── leaderboard-public.js
│   ├── submission-merge.js
│   ├── test-create.js
│   └── ...
├── supabase/                    # Base schema and migrations
├── scripts/verify.mjs            # Static integrity verification
├── netlify.toml
├── vite.config.js
├── package.json
└── README.md
```

## Local development

### Requirements

- Node.js 18+ (Node 20 LTS recommended)
- npm
- Supabase project
- Netlify CLI for full local function behavior

### Install

```powershell
npm install
```

### Verify the source tree

```powershell
npm run verify
```

The verification script checks local imports, application imports/routes, critical GradeSubmissions declarations and Netlify Function JavaScript syntax.

### Run the full application locally

```powershell
npm install -g netlify-cli
netlify dev
```

Then open:

```text
http://localhost:8888
```

Using `netlify dev` is recommended over `npm run dev` because the application depends on `/api/*` Netlify Functions.

### Production build

```powershell
npm run build
```

## Environment variables

Create a local `.env` from `.env.example`.

Client-visible values:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ADMIN_LOGIN_PATH=/secure-admin-console/login
```

Server-only secrets must be configured in Netlify environment settings. Never commit service-role keys, JWT secrets, database passwords or storage credentials.

## Netlify deployment

1. Push the repository to Git.
2. Connect the repository to Netlify.
3. Set the environment variables in **Netlify → Site configuration → Environment variables**.
4. Use the repository build command:

```text
npm run build
```

5. Deploy.
6. Confirm `/api/server-time` and authenticated portal routes work.
7. Confirm the private admin route works, for example:

```text
/secure-admin-console/login
```

The admin path is not a substitute for authorization. Server-side role checks remain mandatory.

## Supabase setup

Apply the base schema and project migrations in order. Do not casually delete a migration that has already been applied to production.

The make-up/merge workflow should preserve the original submission and its audit information while associating the student's completed attempt with the original assessment. **Do not delete an archived make-up test until the merge has been verified.**

## Ranking rules

Published results only are included.

Students are ranked by average percentage, not raw marks, so tests with different maximum marks remain comparable.

Equal exact scores receive the same competition rank:

```text
95%  → #1
95%  → #1
90%  → #3
```

Roll/name sorting is only a deterministic display tie-breaker; it never changes a tied rank.

The ranking Netlify Functions intentionally avoid ambiguous Supabase embedded relationships for submissions/student records. Submission facts and student details are resolved separately so an additional foreign key does not break the page.

## Assessment timing and security

- The server is authoritative for assessment time windows.
- Client clocks are not trusted for enforcement.
- Closing/opening times are validated in the UI and enforced server-side.
- Role permissions are checked inside protected functions.
- Student-facing APIs should return only the data required by the current student.

## Create-paper UX

The assessment builder provides:

- Clear paper identity field.
- Professional opening/closing schedule controls.
- Duration.
- Subject/class selection.
- Anti-cheating settings.
- Per-student or grouped shuffle configuration.
- DOCX import.
- Question library and save workflow.

The shuffle helper copy intentionally spans the available workspace width so the security explanation remains readable on desktop and stacks cleanly on mobile.

## Admin theme studio

Super Admin can choose a preset:

- School Emblem
- Heritage
- Academic
- Royal
- Clean
- Earth

They can also fine-tune primary, secondary and accent colours and choose card density/corner style. These are presentation settings and do not alter authentication, permissions or assessment rules.

## Make-up / merge workflow

Recommended workflow:

```text
Original assessment
       |
       +---- Student absent
       |
       +---- Create/assign make-up assessment
                    |
                    +---- Student completes later
                    |
                    +---- Teacher verifies submission
                    |
                    +---- Merge into original assessment
```

After a successful merge, verify the student's submission from the original assessment before deleting or archiving the separate make-up paper.

## Code-quality checklist before release

```powershell
npm install
npm run verify
npm run build
netlify dev
```

Then manually smoke-test:

- Public landing page
- Public rankings
- Student login/logout
- Teacher login/logout
- Admin private login
- Create paper
- DOCX import
- Question shuffle
- Start/end schedule
- Student test submission
- Teacher grading
- Absent marking
- Reopen
- Make-up assignment
- Merge
- Original-paper review after merge
- Leaderboard tie ranking
- Excel/PDF exports
- Student/teacher/admin photo uploads
- Admin logo/hero upload
- Admin theme preset and save
- Mobile layout
- Desktop layout

## Git release workflow

```powershell
git status
git add .
git commit -m "release: production polish and admin improvements"
git push origin main
```

Before pushing, inspect `.env` and confirm no secret values are staged.

## Troubleshooting

### Blank leaderboard

Check the browser Network tab for `/api/leaderboard`. The current implementation avoids ambiguous embedded `students(...)` relationships. If Supabase reports a schema error, inspect the function response before changing database relationships.

### Blank submissions page

Run:

```powershell
npm run verify
```

Then check the browser console and the failing `/api/*` request. Do not undo a successful make-up merge merely because a frontend relationship query fails.

### PowerShell cannot use `rmdir /s /q`

That syntax is for Command Prompt. In PowerShell use:

```powershell
Remove-Item -Recurse -Force node_modules
```

### Netlify Functions work locally but not after deployment

Confirm all required environment variables are present in Netlify and redeploy after changing server-side environment values.

## Security notes

This is a school assessment application and should be treated as sensitive software. Keep the following principles intact:

1. Never trust client-side role checks.
2. Never expose service-role credentials to the browser.
3. Keep the admin login route private, but do not treat obscurity as authentication.
4. Validate assessment timing on the server.
5. Restrict student data returned by public endpoints.
6. Keep merge operations auditable.
7. Back up production data before destructive migrations or deletes.

## Release notes

### V18.2

- Full-width anti-cheating settings and readable helper copy.
- Professional teacher full-name profile field.
- Larger leaderboard rank numbers and medal treatment.
- Relationship-safe authenticated and public leaderboard functions.
- Admin theme preset studio.
- Admin interface density and corner-style preferences.
- Expanded production QA checklist and deployment documentation.

### V18.1

- Professional assessment title and schedule controls.
- Server-time messaging around schedule enforcement.
- Responsive assessment-builder layout.
- Professional developer README and release documentation.


---

# Release notes and project history


## DESIGN FIX README

# Design fix — why the profile photo looked flat, and what changed

## Root cause

`src/styles_additions.css` already had the correct circular-avatar CSS
(`.profile-avatar-upload`, `.sidebar-avatar`, podium styles, table
centering fixes, etc.) — but **it was never linked in `index.html`**.
Only `/src/styles.css` was loaded. So none of those rules ever applied,
and the "click to upload" avatar rendered with no width/height/
border-radius at all — just flat text ("NK"), which is exactly what you
saw on the Profile page.

(`src/styles_new_Theme.css` and `src/stylesold.css` are similarly
unused/orphaned — safe to delete once you confirm nothing references
them.)

## What's in this drop

1. **`index.html`** — adds one `<link>` for the new stylesheet, right
   after the existing `styles.css` link.
2. **`src/styles_design_fix.css`** (new file) — re-includes everything
   from `styles_additions.css` (so nothing is lost), plus a fresh polish
   pass:
   - A real 112px circular avatar with a permanent small camera badge in
     the corner (previously the only "click me" hint was a hover overlay,
     easy to miss on mobile) — plus the full "📷 Change" hover overlay is
     still there as a bonus on desktop.
   - A cleaner "My Profile" card: avatar, name, @handle, and a role pill
     (Teacher / Super Admin / Roll+Class) all in one clearly separated
     header block, with the assigned classes/subjects moved into a
     subtly shaded box instead of trailing off as plain text.
   - Papers list cards get a colored left border by status (green =
     published, amber = closed, grey = draft), tighter title/meta
     layout, and the action buttons are visually separated from the
     title with their own row instead of floating loose in the card.
3. **`src/pages/Profile.jsx`** — restructured to use the new
   `profile-card-head` wrapper and role pill (shared across all three
   roles via one `ProfileHead` component instead of three near-duplicate
   blocks).
4. **`src/pages/TeacherDashboard.jsx`** — paper cards now use
   `paper-card` / `paper-card-top` / `paper-card-actions` classes.

## How to apply

Drop these four files into your project at the same paths (they
overwrite the originals), plus the one new CSS file. No database
migration, no new dependencies.

```
index.html
src/styles_design_fix.css   (new)
src/pages/Profile.jsx
src/pages/TeacherDashboard.jsx
```

If you also want the same paper-card treatment on `/admin/papers`, no
extra work is needed — `AdminOverview`/`admin/papers` route to the same
`TeacherDashboard.jsx` component already.


## LANDING V5 UPDATE

# Landing + Ranking V5 update

## Ranking ties

Public and authenticated class leaderboards now use competition ranking. Equal average percentages receive the same rank; the next rank skips accordingly (`1, 1, 3`). Secondary sorting is used only to keep the display order deterministic and never changes a tied student's rank.

## Hero ranking carousel

The landing-page Top 10 carousel wraps only when moving from the last active rank to rank 1. Side cards do not wrap, so rank #10 never appears beside rank #1. The carousel therefore shows #1/#2 at the beginning and #9/#10 at the end.

## Larger badges

Rank badges and medal badges were enlarged substantially on both the landing carousel and the full public rankings page.

## Student photo uploads

- Students can upload/change their own photo from **My Profile**.
- Teachers and Super Admins can upload/change a student's photo from **Students → Upload photo / Change photo**.
- Teacher access is restricted to their assigned classes on the server.

## Private admin URL

The Super Admin login is no longer linked from public pages. The route is configured through:

`VITE_ADMIN_LOGIN_PATH=/school-admin-console-7f3c/login`

For production, set a private path in Netlify environment variables and use that URL only with the administrator. This reduces public exposure but does not replace server-side role authentication and a strong password.


## README CHANGES

# What's in this zip (v3 — builds on the previous two updates)

Drop these files into your project at the same paths (they overwrite the
originals). No new database migration this time — everything here is
code-only.

## 1. Per-role code splitting (the "different pages" security request)
- `src/App.jsx` — every page is now loaded with `React.lazy()` instead of
  being bundled together up front.

**What this actually changes:** a student's browser now only downloads
the JS for the student portal — the teacher/admin panel code (CRUD forms,
bulk-upload parsing, grading logic) is a separate chunk that's never
fetched unless someone actually navigates into `/teacher/...` or
`/admin/...`. Each portal is a genuinely separate bundle now, loaded on
demand, not one file containing everything.

**What this does NOT change:** the actual security boundary was, and
still is, server-side — every function in `netlify/functions/` checks the
JWT's role (`requireRole(...)`) before doing anything, so a student token
was already rejected by a teacher-only endpoint regardless of what the
frontend looked like. This change reduces what an anonymous visitor's
browser is exposed to; it isn't a replacement for that server-side check,
which remains the real enforcement point. Worth keeping in mind if anyone
ever asks "is this secure" — the honest answer is "the backend enforces
it," and this is a good-practice improvement on top of that, not a fix
for a hole that existed before.

No routes changed — every URL is exactly the same as before.

## 2. Teacher management: edit + password reset (was missing)
- `netlify/functions/teachers-manage.js` — `PATCH` now also accepts
  `name`, `username`, and an optional `password` (only changes the
  password if you actually send one — omit it and their existing
  password is untouched)
- `src/pages/ManageTeachers.jsx` — every teacher card now has an
  "✏️ Edit / Reset password" button that opens an inline form: name,
  username, classes, subjects, and an optional new-password field

## 3. Student management: Update was missing (Create/Read/Delete existed, not Update)
- `netlify/functions/student-update.js` (NEW) — edits roll number, name,
  class, and DOB for an existing student. A teacher can only edit a
  student who's currently in one of their assigned classes, and can only
  move them into another class they're also assigned to.
- `src/pages/ManageStudents.jsx` — every row now has an "Edit" button
  that turns that row into inline inputs (Save/Cancel), alongside the
  photo upload from the last update.

## 4. Landing page — compacted so the Hall of Fame fits above the fold
- `src/styles.css` — full file (everything from the last two updates,
  plus a new override block appended at the end)

Shrunk: header height, hero title/paragraph/point sizes, the decorative
laptop illustration, and the three role cards — all noticeably smaller
and tighter, so there's less empty space before the leaderboard. On
short browser windows (under ~760px tall) the decorative laptop graphic
is hidden entirely rather than shrunk further, since it's purely
decorative and the leaderboard is the priority. This gets the Hall of
Fame within the first screen on most laptop/desktop windows; very small
phones in portrait may still need a short scroll — there's a limit to how
much text and a 3-person podium can be compressed before it stops being
readable.

## Apply order

1. Copy `src/App.jsx` in — no build config changes needed, Vite handles
   the code-splitting automatically from the `import()` calls.
2. Copy the 2 backend files into `netlify/functions/`.
3. Copy the 2 frontend page files into `src/pages/`.
4. Replace `src/styles.css`.
5. Deploy.

Nothing here touches the database, so there's no migration to run for
this batch.

---

## Project name suggestions

A few directions, since "SNSVM Test Portal" works fine internally but
you may want something with more personality if you ever show it off,
rename the repo, or reuse it for other schools later:

**Keeping it grounded in the school:**
- **Vidya Setu** ("bridge of knowledge" — Hindi/Sanskrit, fits the
  school's existing motto style)
- **SNSVM ParikshaHub** (parīkṣā = exam/test in Hindi/Sanskrit)
- **Gurukul Assess**

**Generic enough to reuse for any school later, if that's ever useful:**
- **TestNest**
- **ExamOrbit**
- **ClassCheck**
- **PariksHub** (parīkṣā again, but standalone/brandable)
- **MeritTrack**

If you want, tell me which direction you like (rooted-in-the-school vs.
generic/reusable) and I can narrow it down further or check nothing
similar is already a well-known product name.


## REPORT CARD PDF V10

# V10 Professional Student Report Card PDF

The student PDF export has been redesigned based on the supplied `class-test-i.pdf`.

## Improvements
- Professional school report-card layout using the school's maroon, green and gold theme.
- School logo in the header and a subtle logo watermark.
- Student name, class and roll number shown clearly.
- Test title and detected test number shown in the report.
- Score and percentage presented prominently.
- Correct, wrong, unanswered and total question counts.
- Question-wise performance table with question type and marks.
- Teacher remarks retained where available.
- IST generated timestamp and page numbering.
- Multi-page handling for longer tests.
- Download filename includes the student name and test number/title, e.g. `Lakshya-Sharma_Test-I_Class-Test-I_Result.pdf`.

The existing result-review and authentication functionality is retained.


## REPORT CARD PDF V11

# V11 Student Report Card PDF

## Changes
- Increased the printed school logo from 24mm to 29mm and restructured the header so the school name and report-card title cannot overlap.
- Added a clear two-line `STUDENT ASSESSMENT / REPORT CARD` header block.
- Kept student name, class, roll number, test title, test number, score and percentage.
- Replaced the plain question/marks table in the student PDF with a question-wise review.
- For every MCQ, all options are printed. The correct option is highlighted in green, the student's wrong option in maroon/red, and a correct student response is labelled `Your answer · Correct`. Unanswered questions show the correct answer plus `Student response: Not answered`.
- Written/practical/upload questions remain supported with a clearly marked student response section.
- Pagination is handled per question block and the school watermark/footer remain.
- Student/test filename remains professional, e.g. `Aarav-Kaswan_Test-I_Class-Test-I_Result.pdf`.

## Local test
```powershell
npm install
netlify dev
```
Then log in as a student, open a published result, and click `PDF report card`.


## TEACHER REVIEW V12

# V12 — Teacher Review Workspace

## Improvements
- Clear separation between **Student Selected** and **Correct Answer** for MCQ questions.
- Every option is visually marked when it is the student's selection and/or the answer key.
- Correct / wrong / unanswered / manual filters.
- Search questions while grading.
- Professional teacher-review summary with marks and status counts.
- Teacher remarks use a larger textarea with guidance.
- Manual marks inputs are limited to non-MCQ question types; MCQ remains auto-scored.
- Save Review keeps the teacher on the page and refreshes saved values.
- Save & Return saves and returns to submissions.
- Submission management filters by student/roll, grading status, and flagged state.
- Existing CRUD actions remain available: open/review, grade/update, reopen, and delete submission.
- Existing test CRUD/publish controls remain unchanged.
- Responsive layout for desktop, laptop, tablet, and mobile.

## Local test
```powershell
npm install
netlify dev
```
Then open `http://localhost:8888` and use the Teacher portal.

## V13 attendance update

- Teachers/admins can mark students who did not submit as **Absent**.
- An absence reason is required and can be edited later.
- Absent students can be unmarked, returning them to **Not submitted**.
- Submission filters now include Submitted, Graded, Absent, and Not submitted.
- The teacher submission page shows decorative summary counters for Students, Graded, Submitted, Absent, Not submitted, and Flagged.
- Added `supabase/schema_v10_migration.sql`; run it after schema_v9.


## TEACHER REVIEW V14 UPDATE

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


## V13 ATTENDANCE UPDATE

# Teacher attendance and submission management — V13

## What changed

### Attendance
Teachers and Super Admins can now mark a student as **Absent** when the student has no submitted attempt.

A reason is required, for example:
- Sick leave
- Family emergency
- School event
- Not present on test day
- Other approved reason

The reason can be edited later. **Unmark** removes the absence record and returns the student to **Not submitted**.

A student who already has a submitted attempt cannot be marked absent by this action, preventing accidental loss of a real attempt.

### Filters
The submission management screen now supports:
- All students
- Submitted
- Graded
- Absent
- Not submitted
- Flagged only / Not flagged
- Student name or roll-number search

### Summary counters
The teacher sees decorative counters for:
- Students
- Graded
- Submitted
- Absent
- Not submitted
- Flagged

### Database
Run this migration after the existing migrations:

`supabase/schema_v10_migration.sql`

It adds `absence_reason` and `marked_absent_at` to `submissions` and adds status/absence indexes.


## V14 SUBMISSION STATUS FIX

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


## V15 NAVIGATION AND STUDENT SECURITY

# V15 — Navigation, Student Self-Service & Security

- Removed duplicate Back to papers navigation from Grade Submissions.
- Converted current standalone navigation links to professional button-style controls.
- Student logout is now a prominent button in the student top bar.
- Added a secure student self-service area for profile/photo, ranking, and test navigation.
- Student permissions remain read-only for marks/class/roll/tests; only the student's own profile photo can be changed through the existing authenticated endpoint.
- Teacher/admin CRUD routes remain protected by existing role guards and server-side authorization.
- No new public admin links or elevated student permissions were introduced.


## V16 STUDENT REVIEW NAVIGATION

# V16 — Student review navigation fix

If a student opens a published result URL without a submitted attempt, the result page now shows a professional empty state with:

- Back to my tests button
- My ranking button
- Clear explanation that no submitted attempt exists
- No blank/error-only page

The existing submitted-result review page keeps its normal Back to my tests button. No role or server-side security behavior was changed.


## V17 MERGED V15 V16

# V17 — V15 + V16 merged

This package combines V15 navigation/security improvements with V16 student review navigation.

## V15 retained
- Duplicate back navigation removed from teacher submissions.
- Navigation uses professional button-style controls.
- Student logout uses a button-style control.
- Student self-service/profile navigation and security-preserving role boundaries retained.
- Existing teacher attendance/submission and admin functionality retained.

## V16 retained
- Students with no submitted attempt are not stranded on the result/review page.
- Empty result state includes Back to my tests and View my ranking actions.
- Submitted-result behavior remains unchanged.

No V15 functionality was intentionally removed; V16 changes are limited to the student result/review empty state and its supporting styles.


## V18 1 UPDATE

# V18.1 Update

## Assessment builder polish

- Reworked the paper-name field into a full-width, high-contrast input with icon and helper text.
- Reworked opening and closing schedule inputs into dedicated schedule cards.
- Added clear Start/End visual chips and schedule guidance.
- Closing time uses the opening time as the minimum selectable value when an opening time is present.
- Added client-side validation preventing a closing time earlier than or equal to the opening time.
- Clarified that server time remains authoritative for test availability.
- Preserved the existing question builder, DOCX import, shuffle controls, grading and save workflow.

## Engineering checks

`npm run verify` statically checks local imports, App imports/routes, GradeSubmissions merge/export declarations and Netlify Function JavaScript syntax.

A full Vite build must still be run in a normal development environment after `npm install` because dependency installation timed out in the packaging environment used for this release.


## V18 2 UPDATE

# V18.2 Production Polish

## Included
- Anti-cheating panel now uses the full content width and readable helper text.
- Teacher profile full-name input explicitly uses a styled text control instead of browser-default sizing.
- Leaderboard rank/medal presentation is larger and clearer.
- Authenticated and public leaderboard functions no longer rely on ambiguous Supabase embedded student relationships.
- Admin theme studio adds six school-safe presets plus custom colour controls.
- Admin interface density and corner-style preferences are persisted through the existing site-settings API.
- README expanded for Git/Netlify/Supabase deployment and production QA.

## Safety
No role permissions or assessment security rules were relaxed by these UI changes.


## V18 MAKEUP AND MERGE

# V18 — Make-up attempts and safe paper merge

This release adds a teacher-controlled make-up workflow and a safe merge for separately-created make-up papers.

## Make-up attempt
From a student's **Absent** or **Not submitted** row on the teacher Submissions page, use **Assign make-up attempt**. The student receives the same paper through their normal student dashboard. The teacher may optionally set a custom duration and note/reason.

The make-up attempt is recorded as `attempt_type = make_up` and is associated with the original test. Existing submitted attempts cannot be overwritten by this action.

## Merge a separately-created paper
If a teacher already created a separate make-up paper and a student submitted it, open that paper's submissions page. Under the student's submission, choose the original destination paper and select **Merge safely**.

The server validates:
- teacher/admin authorization for both papers;
- same student and class;
- same subject;
- destination has no existing submission for that student;
- both papers have the same number and ordered question structure, question type, text, options (for MCQ), and marks.

The server then remaps answer question IDs to the destination paper and moves the submission to the destination test. The source test is retained; the submission stores `merged_from_test_id` for auditability.

## Database
Run `supabase/schema_v11_migration.sql` after the previous migrations. It adds make-up/merge metadata to `test_reopens` and `submissions`.

## Local run
```powershell
npm install
netlify dev
```


## V6 UPDATE

# MCQ Portal V6 update

- Public rankings hero is smaller and class filters stay in one horizontal row with horizontal scrolling on narrow screens.
- Visual theme updated to match the school logo: maroon, academic green and gold.
- Added Super Admin School & Branding control centre.
- Added CRUD-oriented admin quick actions and system controls on Admin Overview.
- Added public site settings API and dynamic school logo support.
- Added admin image uploads for school logo and three landing media slots.
- Added configurable school name/place and theme colours.
- Added Supabase v9 migration for the `site-assets` public bucket and branding settings.
- Admin route defaults to `/secure-admin-console/login` and remains unlinked from public pages; use `VITE_ADMIN_LOGIN_PATH` to customise it.


## V8 RESPONSIVE TEST README

# V8 Responsive Test Build

This package is the complete V7 project with a final responsive-stability pass.

## Run the complete application locally

```powershell
npm install
npm install -g netlify-cli
netlify dev
```

Open:

`http://localhost:8888`

## Admin

`http://localhost:8888/secure-admin-console/login`

## Public rankings

`http://localhost:8888/rankings`

## Recommended viewport checks

- 1920px desktop
- 1440px desktop
- 1280px laptop
- 1100px tablet/laptop boundary
- 1024px tablet/small laptop
- 768px tablet
- 390px mobile

The responsive pass specifically prevents the hero text, three feature points, and ranking visual from overlapping at laptop widths. The public ranking headings are reduced and the class selector remains a single horizontal strip with horizontal scrolling on narrow screens.


## V9 RESULT REVIEW UPDATE

# V9 — Student Result & Paper Review Redesign

Updated the student result page based on the requested UI:

- Removed the separate bottom "Review your paper" card/button.
- Moved "Show correct & wrong answers" into the main result header beside the test title/score area.
- Added a professional assessment-result hero with score, percentage and question statistics.
- Added a polished paper-review section that appears directly below the result header when review is enabled.
- MCQ options clearly show the correct answer and the student's wrong/correct selection.
- Added Correct / Wrong / Unanswered status badges.
- Improved written, upload and practical answer presentation.
- Added teacher-remark styling.
- Responsive layout for desktop, tablet and mobile.
- Existing Image and PDF report-card export controls remain available.

Run locally with:

```powershell
npm install
netlify dev
```

Then open the student result page through the normal student workflow.


## V18.2 Final presentation and avatar polish

This finished release includes a shared `StudentAvatar` component and `public/default-student-avatar.svg`. Students who have not uploaded a photo now receive a neutral school-themed avatar instead of an initials-only placeholder. The same fallback is used if an uploaded photo cannot be loaded.

The default avatar is applied consistently to:
- Public landing-page ranking slider
- Public school leaderboard
- Teacher grading/review header
- Teacher/admin student management
- Student dashboard
- Profile cards when no personal photo is available

No student photo is required for account creation, and the default avatar never changes the underlying `photo_path` data. Uploading a photo simply replaces the displayed fallback.

## Documentation policy

This repository intentionally contains **one project documentation file: `README.md`**. Earlier release notes and implementation notes have been consolidated into the release-history section of this document so a developer, reviewer or deployment engineer has one authoritative source of project information.

## Final release checklist

Before pushing to Git/Netlify:

```powershell
npm install
npm run verify
npm run build
netlify dev
```

Then test, at minimum:
1. Public landing page and ranking slider.
2. Public leaderboard and every class filter.
3. Student login, test launch, timer and submission.
4. Student result, review and report-card export.
5. Teacher paper creation, DOCX import and shuffle settings.
6. Teacher submissions, grading, remarks and attendance/absence.
7. Make-up test assignment and merge into the original test.
8. Teacher/student photo upload and default-avatar behavior.
9. Teacher/admin leaderboard and Excel/PDF exports.
10. Super Admin CRUD, school branding, theme settings and school ranking.
11. `/secure-admin-console/login` and protected admin routes.
12. Mobile and desktop layouts.

Do not reset or recreate the production Supabase database when deploying this release. Apply only migrations that are actually required by the target database, and keep backups before schema changes.

## Admin settings blank-page hardening

The School & Branding page is intentionally safe to load even when browser-side Supabase environment variables are missing. The Supabase client used for direct signed-storage uploads is loaded only when an administrator actually uploads an asset. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` before using branding uploads.

The application also includes a global React error boundary. If a future runtime error occurs, administrators see a diagnostic page instead of a completely blank screen.


## Administrator-controlled default student avatar

The **Admin → School & branding** screen includes a **Student default avatar** control.

- Upload JPG, PNG, or WebP directly from the admin portal.
- The selected image is stored in the public `site-assets` bucket.
- Students who do not have an uploaded profile photo automatically use this image.
- Existing student photos always take priority.
- **Restore built-in** removes the custom setting and returns to `public/default-student-avatar.svg`.
- The shared `StudentAvatar` component reads the public site setting, keeping the landing leaderboard, rankings and student-facing surfaces consistent.

### Database migration

After deploying this version, run `supabase/schema_v12_migration.sql` once in the Supabase SQL Editor. No service-role key is exposed to the browser; the protected Netlify admin function issues the signed upload URL.

## v18.3.2 — Avatar and Admin UI hardening

This release standardizes student avatar rendering across the application:

- Uploaded student photo always takes priority.
- Super Admin's **School & Branding → Student default avatar** is used when a student has no photo.
- Built-in school-themed SVG remains the final fallback if the configured image is unavailable.
- Landing-page ranking cards use constrained circular avatars and no longer allow the image's intrinsic dimensions to expand the card.
- Teacher and Super Admin class leaderboards use the same shared avatar component.
- Student dashboard and student profile use the configured default avatar.
- Teacher/Admin student management lists use the same fallback behavior.
- Public site settings accepts both nested JSON asset settings and direct path values.
- Admin School & Branding text fields, selects, and theme controls have a consistent professional input treatment.
- Landing page has horizontal-overflow protection for desktop and mobile.

### Verification

Run locally before deployment:

```bash
npm install
npm run build
npm run verify
```

Then test:

1. Admin → School & Branding → upload a JPG under **Student default avatar** → Save.
2. Confirm a student without a photo shows that JPG on the landing ranking, public rankings, student dashboard/profile, teacher leaderboard, and admin/teacher student list.
3. Upload a real student photo and confirm it overrides the default avatar everywhere.
4. Remove/restore the default avatar and confirm the built-in SVG fallback is used.
