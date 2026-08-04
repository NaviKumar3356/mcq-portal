# School Test Portal (MCQ + Written + Upload)

A free-to-run web app for taking tests online:
- Students log in with **Roll Number + Date of Birth** (no email needed).
- A paper can mix **MCQ** (auto-graded instantly), **typed written answers**, and
  **uploaded photo/scan answers** — chosen per question.
- You (teacher) grade written/uploaded answers, then **publish the result** —
  students only see it after that.
- All data (students, papers, answers, scanned copies) is stored **long-term in Supabase**
  (free tier: Postgres database + file storage).
- Hosting is **Netlify** (free tier: static site + serverless "Functions" acting as the backend).

Nothing here costs money at school scale. Limits are noted at the bottom.

---

## How it's built (so you know what's talking to what)

```
Browser (React app)  --->  Netlify Functions (Node, in netlify/functions/)  --->  Supabase (Postgres + Storage)
```

The browser **never talks to Supabase directly** for data (students/tests/answers) — only through
your own Netlify Functions, which hold the secret Supabase key. This is what makes the "students
can only see their own data" rule actually enforceable, instead of relying on the browser to behave.

The one exception: uploading a scanned answer sheet goes straight from the browser to Supabase
Storage, using a short-lived signed link your Function hands out — this avoids routing big photo
files through the function (Netlify Functions have a payload size limit).

---

## 1. Create your Supabase project (free)

1. Go to https://supabase.com → New project. Pick any name/region, set a database password (save it).
2. Once it's created, open **SQL Editor** → paste the entire contents of `supabase/schema.sql`
   from this project → Run. This creates all tables and the `answer-sheets` storage bucket.
3. Go to **Settings → API**. You'll need three values later:
   - `Project URL` → this is `SUPABASE_URL`
   - `anon public` key → this is `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_KEY` (⚠️ keep this one secret — never put it in
     a `VITE_` variable or commit it anywhere)

### Add your students
In Supabase → **Table editor → students**, add a row per student: `roll_number`, `name`, `class`,
`dob` (format `YYYY-MM-DD`). You can also paste many rows at once via **Insert → Import data from CSV**
if you export your class list to a CSV with columns `roll_number,name,class,dob`.

---

## 2. Push this project to GitHub

Netlify deploys from a Git repo.

```bash
cd mcq-portal
git init
git add .
git commit -m "Initial commit"
```
Create an empty repo on GitHub, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/mcq-portal.git
git branch -M main
git push -u origin main
```

---

## 3. Deploy on Netlify (free)

1. Go to https://app.netlify.com → **Add new site → Import an existing project** → pick your GitHub repo.
2. Build settings are already read from `netlify.toml` in this repo (build command, publish
   folder, functions folder) — you shouldn't need to change anything.
3. Before the first deploy, go to **Site settings → Environment variables** and add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your Supabase Project URL |
   | `SUPABASE_SERVICE_KEY` | your Supabase `service_role` key |
   | `VITE_SUPABASE_URL` | same Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase `anon public` key |
   | `JWT_SECRET` | any long random string (e.g. generate one at https://randomkeygen.com) |
   | `ADMIN_USERNAME` | whatever username you want to log in as teacher |
   | `ADMIN_PASSWORD` | a strong password |

4. Click **Deploy site**. Netlify gives you a free `https://your-site-name.netlify.app` URL.
   You can rename the site (Site settings → Change site name) or attach your own domain later,
   still free.

---

## 4. Using it

- **Students** go to the site's home page → enter roll number + DOB → see their assigned tests
  → take the test within its open/close window → submit.
- **You (teacher)** go to `/teacher/login` → log in with `ADMIN_USERNAME`/`ADMIN_PASSWORD` →
  **New paper** to build a test (mix MCQ / written / upload questions per question) → **Publish to
  students** when ready → after the close time, open **View submissions** → grade written/uploaded
  answers (MCQs are already auto-scored) → **Publish result** so students can see their score and
  per-question remarks.

---

## 5. Running it locally before you deploy (optional but recommended)

Install the [Netlify CLI](https://docs.netlify.com/cli/get-started/) once:
```bash
npm install -g netlify-cli
```
Then, inside the project folder, create a `.env` file (copy `.env.example`) with your real
Supabase values, and a `netlify/functions/.env` (copy `netlify/functions/.env.example`) with the
server-side secrets. Then run:
```bash
npm install
netlify dev
```
This serves the React app and the Functions together on one local URL, exactly like production.

---

## Free-tier limits worth knowing

- **Supabase free tier**: 500 MB database, 1 GB file storage, and — importantly — a free project
  **pauses after 7 days with no API activity** (a quick visit to the site wakes it back up; there's
  no data loss, just a few seconds' delay on the next request). If you need guaranteed always-on
  long-term storage, Supabase's paid plan (from ~$25/mo) removes pausing, or you can periodically
  ping the project to keep it active.
- **Netlify free tier**: 100 GB bandwidth/month and 125,000 function calls/month — far more than a
  single school needs.
- **Answer-sheet photos**: keep uploads reasonably sized (a phone photo, not a 20MB raw scan) so
  1 GB of free storage lasts a long time. You can compress images client-side later if you outgrow it.

---

## Extending it later

- Add more question types (fill-in-the-blank, matching) by adding a new `type` in `questions`
  and a matching renderer in `TakeTest.jsx` / `CreateTest.jsx`.
- Add a CSV bulk-import for creating many students at once from the teacher panel instead of via
  Supabase's table editor.
- Add email/SMS notification when a result is published (Supabase has a free "Edge Function +
  webhook" pattern for this, or a service like Resend's free tier).
