# SNSVM MCQ Test Portal

A production-oriented online assessment platform for **Sant Nandlal Smriti Vidya Mandir, Malsisar, Rajasthan**. The portal separates Student, Teacher and Super Admin experiences and supports secure online tests, question shuffling, timed assessments, grading, attendance, make-up attempts, submission merging, report-card exports, leaderboards, profile photos and school-wide branding.

> **Release focus:** V18.4 professional admin/catalog/media polish, default-avatar management, configurable classes/subjects/sections, teacher-photo visibility in Admin, stronger error handling, security headers and deployment verification.

---

## 1. What this project does

### Student portal
- Student login using the school's configured student credentials.
- Dashboard showing assigned/open tests and results.
- Server-controlled test timing and Indian Standard Time workflow.
- MCQ, written/upload and practical question support where configured.
- Per-student question and option shuffling.
- Anti-cheating/tab-switch monitoring.
- Re-opened and make-up test support.
- Student profile photo upload.
- Configurable default avatar when a photo has not been uploaded.
- Personal result/review pages and leaderboard access.
- Professional downloadable report-card/result experience.

### Teacher portal
- Paper/test creation and editing.
- Word/DOCX question import.
- Question library and answer-key management.
- Submission and attendance management.
- Mark a non-submitting student absent and record an absence reason.
- Filter students by status/search/attempt.
- Grade MCQ/written/practical answers with clear selected/correct options.
- Reopen attempts and create make-up attempts.
- Merge later make-up submission data into the appropriate test workflow.
- Student CRUD and photo management.
- Class/subject-scoped permissions.
- Class leaderboard and downloadable reports.
- Teacher profile photo and account management.

### Super Admin portal
- Dashboard overview and operational statistics.
- Teacher CRUD, activation/deactivation and password reset.
- Student CRUD and bulk CSV upload.
- All-paper management.
- School identity and branding.
- Logo and landing-media management.
- Student default-avatar management.
- Theme presets and custom colour controls.
- Card density/corner preferences.
- **Academic catalogue:** configurable Classes, Subjects and Sections.
- Teacher photos visible in the admin teacher list.
- School-wide leaderboard.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router 6 |
| Backend | Netlify Functions (Node.js) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Authentication | App-issued JWT + server-side role checks |
| Password hashing | bcryptjs |
| Reports | jsPDF, html2canvas, SheetJS/XLSX |
| DOCX import | Mammoth |
| CSV import | Papa Parse |
| Deployment | Netlify |

The browser is **not** the security boundary. Protected data operations go through Netlify Functions and server-side role checks.

---

## 3. Project structure

```text
mcq-portal/
├── src/
│   ├── components/
│   │   ├── PanelLayout.jsx
│   │   ├── SchoolLogo.jsx
│   │   ├── SiteTheme.jsx
│   │   └── StudentAvatar.jsx
│   ├── lib/
│   │   ├── api.js
│   │   ├── constants.js
│   │   ├── parseMcqDocx.js
│   │   ├── reportExport.js
│   │   ├── routes.js
│   │   └── supabaseClient.js
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── TakeTest.jsx
│   │   ├── StudentResult.jsx
│   │   ├── TeacherDashboard.jsx
│   │   ├── CreateTest.jsx
│   │   ├── EditTest.jsx
│   │   ├── GradeSubmissions.jsx
│   │   ├── GradeOne.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── ManageStudents.jsx
│   │   ├── ManageTeachers.jsx
│   │   ├── AdminOverview.jsx
│   │   └── AdminSettings.jsx
│   ├── App.jsx
│   └── styles.css
├── netlify/
│   └── functions/
│       ├── login-*.js
│       ├── test-*.js
│       ├── submission-*.js
│       ├── student-*.js
│       ├── teacher-*.js
│       ├── leaderboard*.js
│       ├── admin-*.js
│       └── utils/
│           ├── auth.js
│           ├── catalog.js
│           ├── constants.js
│           ├── db.js
│           └── ...
├── supabase/
│   ├── schema.sql
│   ├── schema_v*.sql
│   └── schema_v13_migration.sql
├── public/
│   ├── default-student-avatar.svg
│   └── ...
├── netlify.toml
├── package.json
└── README.md
```

---

## 4. Local setup

### Requirements

Install:
- Node.js 18+ (Node 20 LTS recommended)
- npm
- A Supabase project
- A Netlify account for deployment

### Install

```bash
npm install
```

### Environment variables

Create `.env` from `.env.example` and configure the browser-safe values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ADMIN_LOGIN_PATH=/secure-admin-console/login
```

Netlify Functions require server-side secrets. Configure these in **Netlify → Site configuration → Environment variables** rather than committing them:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
SUPER_ADMIN_USERNAME=...
SUPER_ADMIN_PASSWORD=...
```

Never expose the Supabase service-role key or JWT secret to the browser.

---

## 5. Supabase database setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Run the base schema if this is a fresh database.
4. Run the migrations in order for an existing installation.
5. For this release, run:

```text
supabase/schema_v13_migration.sql
```

### V13 adds
- `students.section`
- `school_classes` catalogue setting
- `school_subjects` catalogue setting
- `school_sections` catalogue setting

The application has safe fallback defaults, but the migration should still be applied before production use so the Admin catalogue is persistent.

### Storage

Create the private/public buckets required by the project as described in the earlier schema/migrations. The school branding bucket is expected as:

```text
site-assets
```

Student/answer-sheet storage should remain configured according to the corresponding Supabase migration and access rules.

---

## 6. Start locally

```bash
npm run dev
```

For a Netlify-like local environment, use the Netlify CLI if installed:

```bash
netlify dev
```

The second option is useful because it runs the React application and Netlify Functions together.

---

## 7. Production build and verification

Before deployment:

```bash
npm run verify
npm run build
```

The Netlify configuration now runs:

```text
npm install && npm run verify && npm run build
```

If verification fails, do not deploy until the error is fixed.

Preview the production bundle locally:

```bash
npm run preview
```

---

## 8. Netlify deployment

### Option A — Git deployment (recommended)

1. Push the project to GitHub/GitLab/Bitbucket.
2. Create a new Netlify site from the repository.
3. Set the environment variables.
4. Confirm the build settings come from `netlify.toml`.
5. Deploy.

Expected build output:

```text
dist/
```

Expected functions directory:

```text
netlify/functions/
```

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy
netlify deploy --prod
```

Do not upload `.env` or server secrets to Git.

---

## 9. Admin catalogue management

Open:

```text
/admin/settings
```

The **School academic catalogue** section lets a Super Admin maintain:

- Classes
- Subjects
- Sections

One item per line is recommended.

Example:

```text
Classes:
I
II
III
IV
V
VI

Subjects:
English
Hindi
Mathematics
Science
Computer
CT & AI

Sections:
A
B
C
D
```

Classes and subjects feed teacher assignment and paper creation. Sections are stored against students.

---

## 10. Default student avatar

The default avatar is controlled from:

```text
Admin → School & branding → Student default avatar
```

Supported formats:
- JPG
- PNG
- WebP

Recommended size:

```text
512 × 512 px
```

Priority is:

```text
Student uploaded photo
        ↓
Admin-selected default avatar
        ↓
Built-in school fallback SVG
```

This keeps the portal visually complete even when students have not uploaded photographs.

---

## 11. Teacher photo handling

Teacher profile photos are stored on the teacher record and are now requested by the Admin teacher-management function. The Admin teacher list displays:

1. Uploaded teacher photo, if available.
2. Initials fallback if no photo exists.

The same photo can also appear in the teacher's portal/sidebar where the relevant profile data is available.

---

## 12. Test lifecycle

A normal assessment can follow this lifecycle:

```text
Create draft
   ↓
Add/import questions
   ↓
Configure class + subject
   ↓
Configure opening/closing time
   ↓
Configure shuffling/security
   ↓
Publish
   ↓
Students attempt
   ↓
Auto-grade MCQ / teacher-grade other answers
   ↓
Review submissions
   ↓
Publish results
   ↓
Leaderboard + report cards
```

If a student misses the original test:

```text
Mark absent / record reason
        ↓
Assign make-up attempt
        ↓
Student takes the paper later
        ↓
Review / grade
        ↓
Merge according to the make-up workflow
```

Do not delete or merge production test data without first checking the submission list and database backup/export.

---

## 13. Recommended production test cases

### Authentication
- Valid student login.
- Invalid student login.
- Invalid teacher login.
- Invalid admin login.
- Disabled teacher login.
- Logout from every role.
- Direct access to protected URLs without a token.

### Students
- Add student.
- Edit student.
- Delete student.
- Upload photo.
- Remove/replace photo.
- Default avatar when photo is absent.
- Class filter.
- Section assignment.
- CSV import with valid and invalid rows.
- Duplicate roll number handling.

### Teachers
- Create teacher.
- Assign classes.
- Assign subjects.
- Edit teacher.
- Reset password.
- Disable/re-enable login.
- Teacher photo appears in Admin.
- Teacher cannot access another teacher's class/subject.

### Paper creation
- Create MCQ paper.
- Create written/upload question.
- Import DOCX.
- Change marks.
- Set opening date/time.
- Set closing date/time.
- Closing time earlier than opening time must be rejected.
- Publish/unpublish where supported.
- Question shuffle.
- Option shuffle.
- Grouped shuffle.

### Student attempt
- Test opens at correct server time.
- Test is unavailable before opening time.
- Test closes after deadline.
- Timer continues correctly after refresh.
- Double-click submission does not create duplicate submission.
- Tab-switch warning/auto-submit behaviour.
- Reopened attempt works.
- Make-up attempt works.

### Teacher grading
- Submitted status is distinct from not-submitted.
- Absent status and reason are stored.
- Selected option is clearly separated from correct option.
- MCQ auto-score is correct.
- Written/manual marks save.
- Teacher remarks save.
- Reopen works.
- Merge works.

### Reports
- Student report PDF.
- Student report Excel.
- Leaderboard PDF.
- Leaderboard Excel.
- Correct student name and test number in filenames.
- Logo/watermark renders.
- Long names do not break the document.
- Empty result sets do not create broken/blank exports.

### Admin
- Branding loads without blank page.
- Theme preset saves.
- Custom colour saves.
- Logo upload works.
- Landing image upload works.
- Default avatar upload works.
- Restore built-in avatar works.
- Class/subject/section catalogue saves.
- Teacher photo appears.
- Dashboard statistics load.

### Responsive testing
Test at minimum:

```text
1440 × 900 desktop
1280 × 720 laptop
1024 × 768 tablet/desktop
768 × 1024 tablet
390 × 844 mobile
```

Pay particular attention to:
- Admin cards
- Date/time fields
- Tables
- Leaderboard podium
- Landing ranking carousel
- Navigation buttons
- File-upload controls

---

## 14. Security checklist before going live

- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only on the server.
- [ ] `JWT_SECRET` is long and random.
- [ ] Super Admin password is changed from any development value.
- [ ] Supabase RLS is enabled according to the schema/migrations.
- [ ] Storage buckets have the intended public/private access.
- [ ] Production domain uses HTTPS.
- [ ] No `.env` file is committed.
- [ ] Netlify deploy succeeds with `npm run verify && npm run build`.
- [ ] Protected routes redirect correctly.
- [ ] Server-side role checks work even if a user manually changes frontend URLs.
- [ ] Search input is tested with punctuation and wildcard-like characters.
- [ ] Duplicate submission race is tested.
- [ ] Error pages do not expose stack traces to visitors.

The project now sends basic hardening headers through `netlify.toml`, including `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a restrictive `Permissions-Policy`.

---

## 15. AI / analytics roadmap

The portal is a good foundation for later analytics, but **do not train a model on raw student data immediately**.

First collect clean, versioned assessment events such as:

```text
student_id (preferably anonymised for ML)
test_id
question_id
class
subject
question_type
marks
selected_option
correct_option
is_correct
response_time_seconds
attempt_number
was_make_up
was_absent
teacher_grade
question_difficulty_label (later)
```

Useful future AI features:

- Student performance trend analysis.
- Topic-level weakness detection.
- Question difficulty estimation.
- Question discrimination analysis.
- Automatic identification of unusually easy/hard questions.
- Class-level learning-gap reports.
- Suggested revision topics.
- Teacher dashboards showing improvement over time.
- Question-generation assistance for teachers.

### How much data is needed?

For analytics and dashboards, you do **not** need model training data at first. Start collecting clean data from day one.

For an initial useful difficulty/performance model, a practical target is roughly:

```text
10,000+ question-response records: exploratory analytics
25,000–50,000: useful baseline predictive models
100,000+: substantially better coverage across classes/topics
```

The exact amount depends more on the number of unique questions, subjects, classes and students than on raw row count. Do not use a student's name, DOB or other unnecessary personal information as model features.

---

## 16. Common troubleshooting

### Blank page
Open the browser console and Netlify function logs. The application error boundary intentionally shows a safe message rather than exposing a production stack trace.

Common causes:
- Missing environment variables.
- Migration not applied.
- Function returning an unexpected object shape.
- Incorrect Supabase storage configuration.
- Stale Vite cache.

Try:

```bash
rm -rf node_modules dist
npm install
npm run verify
npm run build
```

On Windows PowerShell, remove the directories manually if `rm -rf` is unavailable.

### Branding page error
Confirm:
- `app_settings` exists.
- `site-assets` bucket exists.
- Admin is authenticated as `super_admin`.
- `admin-site-settings` and `admin-catalog` functions deploy successfully.

### Default avatar not appearing
Check:
1. `/api/site-settings` returns `default_avatar_url`.
2. The storage path exists.
3. The bucket is accessible as expected.
4. The browser can load the image URL.
5. Built-in `/default-student-avatar.svg` exists as the final fallback.

### Calendar/date input
The assessment schedule uses the browser's native `datetime-local` control with a large, responsive input surface. The server remains authoritative for actual enforcement; the browser field is only the input UI.

---

## 17. Git release workflow

Recommended:

```bash
git status
git add .
git commit -m "Release V18.4 admin and catalogue polish"
git push origin main
```

Before committing:

```bash
npm run verify
npm run build
```

After pushing, wait for Netlify's production deploy to finish and perform the smoke tests listed above.

---

## 18. Important operational rule

**Database backups come before destructive operations.**

Especially before:
- deleting a test,
- deleting a student,
- merging submissions,
- changing attendance records,
- changing production schema.

The portal contains assessment records that may be required for official school reporting.

---

## 19. Release summary

This release keeps the existing assessment architecture while improving the operational layer:

- Professional Admin control centre.
- Configurable academic catalogue.
- Student sections.
- Default avatar administration.
- Better teacher photo visibility.
- Better landing ranking avatar rendering.
- More polished date/time fields.
- Better admin statistics.
- Safer error display.
- Duplicate submission protection.
- Safer student search filtering.
- Netlify security headers.
- Verification included in production build.

For a live school deployment, apply the Supabase migration, configure secrets, run verification/build, deploy to Netlify, and complete the production test checklist before inviting students.
