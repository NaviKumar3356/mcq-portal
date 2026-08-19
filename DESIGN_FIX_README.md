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
