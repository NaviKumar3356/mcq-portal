# Practical Exam Portal Update

This build extends the existing portal without replacing the MCQ workflow.

## Included fixes
- MS Word / Excel / GIMP / Canva / Scratch practical uploads continue through the upload-question workflow.
- Student answer uploads now accept `doc/docx`, `xls/xlsx`, `pdf`, `psd/xcf`, `sb3`, common images and video outputs (`mp4/webm`) where configured.
- Native file-picker focus/blur is ignored by the anti-cheat counter, so selecting an answer file does not count as a tab/window switch.
- HTML practical questions can retain a teacher-only reference answer imported from Word.
- Teachers can run assisted HTML auto-grading for every student's answer to a question; it checks required tags, attributes and visible text without executing untrusted student code. Teachers can override marks.
- Student-submitted code is displayed in a bold, preserved-format code panel during review/results.
- Long student names, roll numbers and metadata are wrapped so they do not overlap other UI elements.
- Student dashboard refreshes assessment status automatically, so a paper becomes Open at its scheduled time without a manual page refresh.
- Assessment scheduling is explicitly IST (Asia/Kolkata), independent of the teacher's browser timezone. Existing UTC timestamps are converted back to IST when editing.
- Normal browser close attempts to release the student's server session immediately. A sudden power loss cannot send that event, so the server-side 15-minute idle session expiry remains the recovery safety net.
- Test answers are still saved to localStorage continuously, allowing an interrupted test to resume from the previous draft after a power cut/restart on the same browser profile.

## Verification
Serverless JavaScript files were syntax-checked and the HTML assisted-grading helper was exercised with full and partial sample answers.

The local Vite build could not be completed in this Linux runtime because the supplied `node_modules` contains platform-specific optional native packages from another OS (Rollup/esbuild). On Netlify, dependencies should be installed on the build machine from `package-lock.json` before `npm run verify && npm run build`.
