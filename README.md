# SNSVM Test Portal (MCQ + Written + Upload)

A free-to-run test portal for **Sant Nandlal Smriti Vidya Mandir, Malsisar**.

## Latest update

- **Roll number is no longer unique on its own** — since the same roll number can exist in multiple
  classes, students now log in with **Class + Roll number + Date of birth**. Run
  `supabase/schema_v3_migration.sql` to apply this (safe — it doesn't touch existing rows).
- **CSV bulk upload for students**, covering multiple classes in a single file: go to **Students → Upload
  CSV**, with columns `roll_number,name,class,dob`. Each row's own `class` column decides where it goes, so
  one file can onboard your whole school at once. Re-uploading updates existing students instead of
  duplicating them.
- **Edit an existing paper** any time from **Papers → Edit** — title, subject, class, timing, and questions
  can all be changed. Once students have started submitting, the question *set* locks (no add/remove) so no
  one's submission gets orphaned, but you can still fix wording, marks, or the answer key — and if you
  correct an MCQ's answer key after grading has started, already-graded scores for that question
  automatically recompute.
- **Anti-cheating shuffle**: when creating or editing a paper, tick "Shuffle question order per student"
  and/or "Shuffle each MCQ's option order per student". You also choose a group size — e.g. 5 means roll
  numbers 1–5 (within that class) get one shuffled order, 6–10 get a different one, and so on, so students
  sitting next to each other essentially never match, while you're not dealing with 40 completely unique
  papers. Set the group size to 1 for a fully unique order per student. This needs no extra storage — the
  order is recomputed the same way every time from the paper + the student's position, so it's stable across
  refreshes but impossible to predict from a neighbour's screen.

## What's new in the previous version

- **Three separate login pages**: Student, Teacher, and Super Admin — each with their own portal.
- **Super Admin** account (yours, via env vars) creates and manages **as many Teacher accounts as you want**,
  each assigned specific **classes (1st–12th)** and **subjects** (English, Hindi, Sanskrit, Mathematics,
  EVS, Computer, Science, SST, CT & AI).
- **Teachers** can only set papers, grade, and manage students for their own assigned class(es) + subject(s).
  They can add or remove students in their assigned classes.
- **Super Admin** can see and manage everything — all teachers, all students, all papers.
- **Search & delete**, class-wise or student-wise: find students by class/name/roll number and remove them
  (their submissions/answer-copies go with them); delete an entire paper and all its submissions; delete a
  single student's submission.
- **Answer key as its own step**: build the paper (MCQ options can be filled with the answer key right away,
  or left for later), then finalize/edit the answer key any time from the paper's "Answer key" button.
  Grading then uses that key.
- **Remarks on MCQ answers are now optional but available** — auto-scored MCQs can still get a teacher
  remark if you want to add one; it's just never required.
- **Refresh-safe test taking**: a student's in-progress answers are saved to their browser as they go, so
  refreshing the page mid-test does not lose their answers (only submitting clears the draft).
- **School branding**: the SNSVM seal and school name appear on every login page and on the test-taking
  screen itself, for every paper.
- Redesigned with a proper sidebar/menu for Teacher and Super Admin panels.

---

## Architecture (unchanged, still 100% free-tier)

```
Browser (React app)  --->  Netlify Functions (Node, in netlify/functions/)  --->  Supabase (Postgres + Storage)
```

The browser only ever talks to your own Netlify Functions for data — never directly to Supabase — which is
what makes "students only see their own data" and "teachers only see their assigned class" actually
enforceable. The one exception is uploading a scanned answer sheet, which goes straight from the browser to
Supabase Storage using a short-lived signed link your function hands out.

---

## 1. Supabase setup

1. Create a free project at supabase.com.
2. **SQL Editor** → run `supabase/schema.sql` in full (first time only).
3. **SQL Editor** → run `supabase/schema_v2_migration.sql` in full (adds the `teachers` table and a couple
   of columns/indexes — safe to run even if you already ran schema.sql before).
4. **SQL Editor** → run `supabase/schema_v3_migration.sql` in full (switches the student login key from
   roll-number-alone to class+roll-number, and adds the shuffle settings — also safe on existing data).
5. **Settings → API** → copy `Project URL`, `anon public` key, and `service_role` key (you'll need all three
   below).

You do **not** need to add teachers via SQL — the Super Admin creates them from the app itself, from the
**Teachers** page. Students can still be added either from the app (Teacher/Super Admin → Students → +Add)
or bulk-imported via Supabase's Table Editor → Insert → Import CSV with columns `roll_number,name,class,dob`.

---

## 2. Push to GitHub

```bash
cd mcq-portal
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mcq-portal.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy on Netlify

1. app.netlify.com → **Add new site → Import an existing project** → pick your repo. Build settings come
   from `netlify.toml` already in the repo.
2. **Site settings → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_KEY` | Supabase `service_role` key |
   | `VITE_SUPABASE_URL` | same Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase `anon public` key |
   | `JWT_SECRET` | any long random string |
   | `SUPER_ADMIN_USERNAME` | your super-admin login username |
   | `SUPER_ADMIN_PASSWORD` | a strong password |

3. **Deploy site**. You get a free `https://your-site.netlify.app` URL (renameable, still free).

---

## 4. First-time walkthrough after deploying

1. Go to the site → **Super Admin** → log in with `SUPER_ADMIN_USERNAME`/`SUPER_ADMIN_PASSWORD`.
2. **Teachers** → **+ Add teacher** → give them a name, username, password, and tick which classes and
   subjects they teach. Repeat for every teacher.
3. Either you (Super Admin → Students) or each teacher (Teacher → Students, limited to their own classes)
   adds students: roll number, name, class, date of birth.
4. A teacher logs in at **Teacher** → **+ New paper** → picks their subject/class (only their assigned ones
   show up), adds MCQ/written/upload questions, saves as draft.
5. From **Papers**, the teacher finalizes the **Answer key** if they didn't set it while creating, then
   **Publish to students**.
6. Students log in at **Student** with roll number + DOB, see the paper, take it within its open window.
7. After it closes, teacher opens **Submissions** → grades written/upload answers (MCQs are already
   auto-scored; remarks are optional on any question type) → **Publish result**.
8. Students then see their score and per-question remarks on their dashboard.

---

## 5. Local development (optional)

```bash
npm install -g netlify-cli   # once
cp .env.example .env                                   # fill in real VITE_ values
cp netlify/functions/.env.example netlify/functions/.env  # fill in real server secrets
npm install
netlify dev
```

---

## Free-tier limits worth knowing

- **Supabase free tier**: 500 MB database, 1 GB file storage. A free project **pauses after 7 days with no
  API activity** — a visit to the site wakes it up in a few seconds, no data is lost. For guaranteed
  always-on, Supabase's paid tier (~$25/mo) removes pausing.
- **Netlify free tier**: 100 GB bandwidth/month, 125,000 function calls/month — comfortably enough for a
  single school.
- Keep uploaded answer-sheet photos reasonably sized (a phone photo, not a raw scan) so 1 GB lasts a long
  time.

---

## Extending further

- Add more question types by adding a `type` value in `questions` and matching UI in `TakeTest.jsx` /
  `CreateTest.jsx`.
- Add CSV bulk-import for students directly in the app (currently via Supabase Table Editor).
- Swap the placeholder SVG seal in `src/components/SchoolLogo.jsx` for the school's actual logo file any
  time — drop it at `public/logo.png` and replace the `<svg>` with an `<img src="/logo.png" />`.
