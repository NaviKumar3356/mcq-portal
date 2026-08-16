# What's in this zip (v2 — builds on the previous update)

Drop these files into your project at the same paths (they overwrite the
originals). New files are marked (NEW).

## 1. Database migration — RUN THIS FIRST (after v6, if you haven't already)
- `supabase/schema_v7_migration.sql` (NEW)
  Run once in Supabase → SQL Editor. Safe on existing data.
  - Adds `photo_path` to `students`.
  - Creates a **public** storage bucket `student-photos` (separate from the
    private `answer-sheets` bucket — public because these photos are meant
    to show on the unauthenticated landing page).

## 2. Backend (Netlify functions)
- `netlify/functions/leaderboard-public.js` (NEW) — unauthenticated
  endpoint powering the landing-page Hall of Fame. Returns only name,
  class, average %, tests taken, and photo — never roll number or DOB.
- `netlify/functions/student-photo-upload-url.js` (NEW) — signed upload
  URL for a student's photo (teacher/admin only, same pattern as the
  existing answer-sheet upload flow)
- `netlify/functions/student-photo-set.js` (NEW) — persists the photo path
  onto the student's row after a successful upload
- `netlify/functions/students-list.js` — now also returns `photo_path`

## 3. Frontend
- `src/lib/api.js` — adds `uploadStudentPhoto()` and `getPhotoUrl()`
- `src/pages/ManageStudents.jsx` — every student row now has a clickable
  round avatar (photo, or initials if none) to upload/change their photo
- `src/pages/Landing.jsx` — new "🏆 Hall of Fame" section: top 3 on a
  podium (photos, medals, confetti + "Congratulations!" on #1), ranks 4–5
  in a simple list below. Shown to anyone before they log in.
- `src/styles.css` — full file (previous update's content + new Hall of
  Fame / podium / confetti / avatar-upload rules appended at the bottom)

## 4. Favicon
- `public/favicon.png`, `public/favicon-16.png`, `public/favicon-32.png`,
  `public/favicon-48.png`, `public/favicon-180.png` (NEW) — generated from
  the SNSVM Test Portal seal you shared
- `index.html` — now links all of the above as the site favicon +
  Apple touch icon, and sets a matching `theme-color`

## Apply order

1. Run `supabase/schema_v7_migration.sql`.
2. Copy the 4 backend files into `netlify/functions/`.
3. Copy the 3 frontend files into `src/`.
4. Copy the 5 `public/favicon*.png` files into `public/`.
5. Replace `index.html`.
6. Deploy.

## Notes on the Hall of Fame

- **Ranking**: pooled across the *whole school* (not per-class), by
  average percentage score across every test whose result has been
  published — same normalization as the existing per-class leaderboard,
  so a paper out of 20 and one out of 100 count fairly.
- **Privacy**: the public endpoint only ever returns first/last name,
  class, score, and photo. No roll number, no DOB, nothing else.
- **Empty state**: if no results have been published anywhere yet, the
  section simply doesn't render — no empty box on the landing page.
- **Photos are optional**: any student without a photo gets a colored
  circle with their initials instead, so the board looks complete either
  way.
- Adding a photo is a manual, one-at-a-time action from **Students** →
  click a student's avatar. It's not part of the CSV bulk import — that
  would need a second file per row, which CSV can't carry, so it stayed
  out of scope for now. If you want bulk photo import later (e.g. a ZIP of
  images named by roll number), that's a reasonable follow-up.

## Note on the favicon size

Your uploaded logo is a large square PNG (a round seal on a transparent/
white background), which is exactly what a favicon needs — no
cropping or redesign was necessary. It's been resized down to 16/32/48px
for the browser tab icon and 180px for the iOS home-screen icon; the
original full-size file is also linked as a fallback for any browser that
wants a larger one.
