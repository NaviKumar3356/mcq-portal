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
