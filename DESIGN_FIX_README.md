# Landing page + leaderboard rebuild — what changed and why

## Why the last fix "didn't stick"

Last round I added a *second* stylesheet (`styles_design_fix.css`) plus a
new `<link>` in `index.html`. That's fragile — if that link doesn't make
it into the deployed `index.html` exactly right, none of those rules
load, which is exactly what happened (the "PUBLISHED" pill fell onto its
own line because the flex rule for `.paper-card-top` never applied).

This round, **everything is merged into the one `src/styles.css` you
already had linked** — nothing new to add to `index.html`. I also found
the actual cause of the overlapping grey box / misaligned hero on the
landing page: there were several older "compact" and "polish" CSS passes
for `.landing-page` stacked on top of each other, with mismatched
`grid-template-columns` between normal and short-viewport rules, plus a
decorative laptop illustration that only half-hid itself depending on
viewport height. Rather than patch a patch again, I replaced that whole
section with one clean, final block at the end of the file (CSS in the
same file applies in the order it's written, so this one wins outright
over the older conflicting rules — nothing had to be hunted down and
deleted).

## What's in this drop

1. **`index.html`** — back to a single stylesheet link. You can now
   delete `src/styles_additions.css`, `src/styles_design_fix.css`,
   `src/styles_landing_theme.css`, `src/styles_new_Theme.css`, and
   `src/stylesold.css` — nothing references any of them anymore.
2. **`src/styles.css`** (replace in full) — your original file, plus the
   avatar/profile fix and paper-card polish from last time, plus:
   - A rebuilt landing hero: no more decorative laptop graphic (that was
     the thing overlapping "Pick your role to continue"). The three
     feature points now render as their own small cards under the
     headline instead, which also fills the space better so the page
     doesn't read as empty.
   - A new **rank-badge / ribbon-medal** component (`.rank-board` /
     `.rank-row`), styled like the PTM rank-holder poster you shared —
     gold for #1, blue for #2, bronze for #3, purple for #4, green for
     #5, each with a numbered medal circle, photo, name + class, and a
     solid percentage pill.
3. **`src/pages/Landing.jsx`** — Hall of Fame now shows the top 5 as
   ribbon badges (via a new exported `RankRow` component) instead of a
   3-person podium + plain list. Decorative laptop JSX removed too.
4. **`src/pages/Leaderboard.jsx`** — the per-class leaderboard (used by
   students, teachers, and admin) now shows its top 5 with the exact
   same ribbon badges, via the same `RankRow` component imported from
   `Landing.jsx`, so ranking looks consistent everywhere in the app.
   Ranks 6+ still show in a plain table underneath for completeness.

## How to apply

```
index.html
src/styles.css
src/pages/Landing.jsx
src/pages/Leaderboard.jsx
```

Then delete the five now-unused CSS files listed above so there's no
confusion about which file is actually in effect. `src/pages/Profile.jsx`
and `src/pages/TeacherDashboard.jsx` from the previous round are still
current — no changes needed to them this time.
