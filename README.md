# MCQ Portal
## Online Examination, Practical Assessment & Secure Student Test Platform

**Technology:** React + Vite · Netlify Functions · Supabase

---

## 1. Overview

MCQ Portal is a school examination platform for conducting controlled online tests, practical examinations, file-submission assessments, make-up attempts, and teacher/admin review workflows.

The platform supports:

- Student, teacher and administrator workflows
- MCQ examinations
- HTML, Python and SQL practical assessments
- Word, Excel, PowerPoint, Canva, GIMP, Scratch and other file-based practicals
- Multiple practical task variants and student-specific assignment
- Protected practical-resource downloads and completed-file uploads
- Server-controlled examination timing
- Late-login remaining-time calculation
- Teacher/admin-controlled reattempt and make-up duration
- Test-type-specific tab-switch protection
- Single active student session/device protection
- Supabase database and private storage
- Netlify serverless backend

The design deliberately separates **browser-based tests** from **external-application practicals** so examination security does not prevent legitimate practical work.

---

## 2. Architecture

```text
Student / Teacher / Admin Browser
              |
              v
       React + Vite Frontend
              |
              v
        Netlify Functions
              |
        +-----+------+
        |            |
        v            v
    Supabase DB   Supabase Storage
```

### Frontend

React pages provide login, dashboards, test creation/editing, test taking, practical resources, file upload, results and review interfaces.

### Backend

Netlify Functions perform server-side authentication/session validation, test retrieval/creation/editing, submission, resource upload URL generation, signed resource access and timing/session operations.

### Data layer

Supabase stores students, users, tests, questions, attempts/submissions, practical variants, active sessions and examination metadata. Supabase Storage holds private practical resources and student uploads.

---

## 3. User Roles

### Student

- Log in and access assigned tests
- Answer MCQs
- Complete HTML/Python/SQL practicals
- Download assigned practical task files
- Work in external applications when permitted
- Upload completed practical files
- Submit before the server-controlled deadline

### Teacher

- Create and edit tests
- Add MCQs and practical questions
- Upload multiple practical task variants
- Configure start time and duration
- Review submissions
- Reopen/assign make-up attempts where supported
- Set the duration for reopened attempts

### Administrator

Performs the broader user, examination and operational management functions enabled by the deployment.

---

## 4. Examination Modes

### Controlled browser tests

Typical examples: **MCQ, HTML, Python, SQL**.

These can use tab-switch protection.

### External-application/file practicals

Typical examples: **Excel, Word, PowerPoint, Canva, GIMP, Scratch and file-upload tasks**.

These allow students to leave the portal and work in the required application.

---

## 5. Tab-Switch Policy

Tab-switch behavior is intentionally test-type dependent.

| Assessment type | Tab switching |
|---|---|
| MCQ | Restricted |
| HTML | Restricted |
| Python | Restricted |
| SQL | Restricted |
| Excel | Allowed |
| Word | Allowed |
| PowerPoint | Allowed |
| Canva | Allowed |
| GIMP | Allowed |
| Scratch/file practical | Allowed |

For a file practical, the intended workflow is:

```text
Portal -> Download task -> Work in external application -> Return -> Upload -> Submit
```

Blocking tab switching in this workflow would interfere with the practical examination.

> **Important:** Tab-switch detection is an examination-control feature, not a complete anti-cheating system. It should be combined with appropriate invigilation and school examination policy.

---

## 6. Student Session Management

The portal uses browser-side and server-side controls.

### Browser session

Student authentication is maintained in `sessionStorage` rather than permanent `localStorage` authentication.

Expected behavior:

- Normal page refresh: student remains logged in.
- Navigation inside the application: session remains available.
- Closing the browser/tab: the browser session ends and a new session requires login.

### Server-side active-session lock

The application maintains an active student session record to prevent simultaneous use of the same student account on multiple devices.

A heartbeat periodically refreshes the active session. If a browser crashes or power is lost, the server eventually treats the session as stale and releases it according to the configured expiry policy.

**Do not manually delete active session records while students are taking an examination unless there is a specific administrative reason.**

---

## 7. Refresh vs Browser Close

The implementation deliberately avoids treating every `pagehide`/browser lifecycle event as a logout because browsers can trigger such events during normal navigation or refresh.

```text
Refresh -> session remains -> continue test

Close tab/browser -> browser session ends -> new session requires login

Crash/power failure -> no guaranteed close event -> heartbeat stops -> stale session expires
```

A web application cannot guarantee a reliable close event for crashes, forced termination or power failure; heartbeat-based recovery is therefore required.

---

## 8. Examination Timing

The examination timer is based on the **scheduled test start/deadline**, not on the student's login time.

Example:

- Start: 10:00 AM
- Duration: 30 minutes
- Student logs in at 10:00 -> 30 minutes remaining
- Student logs in at 10:08 -> 22 minutes remaining
- Student logs in at 10:25 -> 5 minutes remaining

A late student does not receive a fresh duration. The common server-controlled deadline remains authoritative.

The frontend should not be treated as the source of truth for examination expiry; important submission/timing validation belongs on the server.

---

## 9. Reattempt and Make-Up Timing

When a teacher/admin reopens or grants a make-up attempt, the duration can be explicitly specified.

For example:

```text
Reattempt duration = 15 minutes
```

The student receives the configured reattempt duration rather than automatically receiving the original paper duration.

This allows staff to decide how much time an individual reopened attempt should receive.

---

## 10. Multi-File Practical Assignment

A teacher can select multiple practical task files in one operation. Each selected file becomes a separate practical variant.

Example:

```text
Task 1.xlsx
Task 2.xlsx
Task 3.xlsx
Task 4.xlsx
Task 5.xlsx
Task 6.xlsx
```

The portal creates six variants and assigns one to each student according to the configured deterministic variant-selection logic.

For six variants, the current round-robin model is:

```text
Student 1 -> Task 1
Student 2 -> Task 2
Student 3 -> Task 3
Student 4 -> Task 4
Student 5 -> Task 5
Student 6 -> Task 6
Student 7 -> Task 1
Student 8 -> Task 2
...
```

This is **deterministic round-robin, not random shuffling**.

### Important roster consideration

The current selection uses roster order/rank. If roster ordering is changed after an examination is configured, the selected variant can change. A future enhancement can persist a permanent assignment record at attempt start so later roster changes cannot affect the assignment.

---

## 11. Practical Resource Security

Students should receive only the task variant assigned to them.

The backend:

1. Determines the student's practical variant.
2. Removes the complete variants list from the student response.
3. Creates a signed URL for the selected private storage object.
4. Returns only the assigned resource information.

Practical submissions also retain variant/resource metadata so a teacher can identify which task was assigned during review.

---

## 12. Supported Practical Resources

The resource-upload workflow supports common formats including:

- `.doc`, `.docx`
- `.xls`, `.xlsx`
- `.ppt`, `.pptx`
- `.xcf`, `.psd`
- `.pdf`
- `.png`, `.jpg`, `.jpeg`
- `.sb3`
- `.zip`

Allowed extensions and size restrictions are ultimately controlled by the backend upload function.

---

## 13. Practical File Workflow

```text
Teacher creates practical question
            |
            v
Select multiple task files
            |
            v
Create practical variants
            |
            v
Upload resources to private storage
            |
            v
Student receives assigned task
            |
            v
Student downloads task
            |
            v
Student works in external application
            |
            v
Student returns to portal
            |
            v
Student uploads completed file
            |
            v
Teacher reviews/submits grade
```

---

## 14. Question Shuffle vs Practical Assignment

These are independent mechanisms.

**Question shuffle** changes question order.

**Practical variant assignment** determines which task a student receives.

Therefore:

```text
Question order shuffle != Practical task assignment
```

Enabling question shuffling does not randomly reassign practical task files.

---

## 15. Important Source Areas

Typical project structure:

```text
src/
  pages/
    CreateTest.jsx
    EditTest.jsx
    TakeTest.jsx
    LoginStudent.jsx
    ...
  styles.css

netlify/
  functions/
    test-create.js
    test-edit.js
    test-detail.js
    submit-test.js
    question-resource-upload-url.js
    utils/
      practical.js
```

The project may contain additional pages, components and Netlify functions.

---

## 16. Supabase Storage and Signed URLs

Practical resources should remain in private storage where appropriate.

The normal flow is:

```text
Frontend
   |
   v
Netlify Function
   |
   v
Supabase Storage
   |
   v
Signed temporary URL
   |
   v
Student
```

Private storage objects should not be made public merely to simplify downloads.

---

## 17. Environment Variables and Secrets

Production credentials must be stored in the deployment environment, not in source code.

Use:

- Netlify environment variables
- Local `.env` files excluded from Git
- Supabase project configuration

Never commit:

- Supabase service-role keys
- Production passwords
- Private tokens
- Student credentials
- Other secrets

Never expose a Supabase service-role key in browser-side React code.

---

## 18. Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Use the scripts defined in `package.json` as the authoritative project commands.

---

## 19. Netlify Deployment

Recommended architecture:

```text
GitHub
  |
  v
Netlify
  |
  +--> Vite frontend
  |
  +--> Netlify Functions
             |
             v
          Supabase
```

Deployment checklist:

1. Push the source to GitHub.
2. Connect the repository to Netlify.
3. Configure all required environment variables.
4. Confirm the Vite build command and publish directory.
5. Deploy.
6. Test student login.
7. Test teacher/admin login.
8. Test a complete student attempt.
9. Test a practical download/upload.
10. Test timing and session behavior before using the system in a live examination.

---

## 20. Examination-Day Checklist

### Teacher/Admin

- [ ] Verify student roster and roll numbers.
- [ ] Verify test start time.
- [ ] Verify test duration.
- [ ] Verify questions and answers.
- [ ] Test every practical resource.
- [ ] Verify variant order and assignment.
- [ ] Verify file upload questions.
- [ ] Confirm tab-switch policy for the test type.
- [ ] Test one student account.
- [ ] Confirm server/database/storage connectivity.
- [ ] Avoid manual session-table deletion during the live examination.

### Student

- [ ] Log in before or within the allowed test window.
- [ ] Confirm the correct test.
- [ ] Read the instructions.
- [ ] Download the assigned task if applicable.
- [ ] Save completed files in the required format.
- [ ] Upload before the deadline.
- [ ] Submit before time expires.

---

## 21. Troubleshooting

### Student cannot log in

Check credentials, class/roll configuration, existing active session, network connectivity and Supabase availability.

### Refresh logs the student out

Verify that the deployed build contains the session-management update and that a page lifecycle handler is not clearing the active session during refresh.

### Excel/Canva student cannot switch tabs

Confirm that the assessment is using the file-based practical workflow. External-application practicals should not use restrictive tab-switch behavior.

### Wrong practical task assigned

Check student roster order, roll number, number/order of variants and test/question configuration.

### Timer is wrong

Check the scheduled start time, duration, server timezone/configuration, backend deadline and any reattempt/make-up duration.

### File cannot be uploaded

Check file extension, file size, storage permissions, signed upload URL, network connection and Supabase Storage availability.

---

## 22. Data Integrity

For practical examinations, the submission should preserve enough information to identify the assigned variant, such as:

- Variant question text
- Resource path
- Resource name
- Resource MIME type

This provides a useful historical snapshot if the test configuration is later edited.

---

## 23. Security Principles

The project should follow these principles:

- Do not trust client-side timing alone.
- Validate important operations on the server.
- Keep private resources private.
- Use signed URLs for protected resources.
- Never expose service-role secrets to the browser.
- Validate active student sessions server-side.
- Expire stale sessions.
- Preserve the assigned practical variant with the submission.
- Treat tab-switch detection as one examination-control signal, not as a complete anti-cheating solution.

---

## 24. Recommended Examination Configuration

### MCQ / HTML / Python / SQL

Recommended:

- Common scheduled start
- Server-controlled deadline
- Tab-switch protection
- Single active student session
- Student login within the permitted examination window

### Excel / Word / Canva / GIMP / Other external-app practicals

Recommended:

- Common scheduled start
- Server-controlled deadline
- Tab switching allowed
- Student-specific task variant
- Task download
- External application work
- Completed-file upload
- Teacher review

---

## 25. Browser Limitation

A browser cannot guarantee a reliable "browser closed" event for every situation. Power failure, browser crash, operating-system termination and network failure can prevent clean logout events.

The portal therefore uses a combination of:

- Browser session storage
- Server-side active-session records
- Heartbeats
- Stale-session expiration

This is more reliable than depending on a single browser-close event.

---

## 26. Future Enhancements

Potential future improvements include:

1. Permanent practical-variant assignment records at attempt start.
2. Teacher dashboard showing each student's assigned variant.
3. Detailed attempt/audit history.
4. Automatic stale-session cleanup jobs.
5. Per-test tab-switch policy stored explicitly in the database.
6. Per-question practical file validation.
7. File-size validation and upload progress indicators.
8. Submission recovery after network interruption.
9. Stronger transactional attempt locking.
10. More detailed examination analytics.

---

## 27. Maintenance and Change Management

Before major changes:

1. Create a Git commit/tag.
2. Back up important production configuration.
3. Test in development/staging.
4. Test both student and teacher workflows.
5. Run a complete test attempt.
6. Verify Netlify Functions after deployment.
7. Verify Supabase Storage permissions.

Avoid manually modifying production session records during live examinations unless required for an authorized recovery procedure.

---

## 28. End-to-End System Workflow

```text
                 +----------------------+
                 |      Teacher/Admin   |
                 +----------+-----------+
                            |
                    Create / Configure
                            |
                            v
                 +----------------------+
                 |        Test           |
                 | Start + Duration      |
                 | Questions + Variants  |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |     Student Login     |
                 +----------+-----------+
                            |
                    Session Validation
                            |
                            v
                 +----------------------+
                 |   Server Deadline     |
                 +----------+-----------+
                            |
              +-------------+-------------+
              |                           |
              v                           v
       MCQ/HTML/Python/SQL        File Practical
       Tab Protection ON          Tab Switching Allowed
              |                           |
              |                    Download Task
              |                           |
              |                    External App
              |                           |
              |                    Upload File
              |                           |
              +-------------+-------------+
                            |
                            v
                     Submit Attempt
                            |
                            v
                   Teacher/Admin Review
```

---

## 29. Production Note

This README describes the cumulative project workflow and the major security, timing and practical-assessment behavior. Before a live examination, verify the deployed Netlify build against the source repository and run a complete test with a non-production student account.

**Never place real student passwords, Supabase service-role keys, private tokens or other production secrets in this README or in the Git repository.**

---

# 32. Security & Performance Hardening (V17)

The current release includes additional server-side validation and free-tier performance optimizations.

### Security fixes included

- Student submissions are now checked against the student's class on the server.
- A submission must contain the complete question set for the test; missing/duplicate/unknown question IDs are rejected.
- Uploaded answer references are type-validated.
- Reattempt uploads no longer silently fall back to 30 minutes when the teacher/admin did not provide a valid duration.
- Teacher grading verifies that every answer being graded actually belongs to the selected submission.
- Teacher-entered marks are validated as non-negative and cannot exceed the question's maximum marks.
- Duplicate answer rows are prevented by a database unique index.
- Timing-sensitive GET endpoints bypass the frontend in-memory cache so stale deadlines/session state cannot be reused after a reopen or timing change.
- Student dashboard requests use the class already present in the signed server-verified JWT, avoiding an extra student lookup.

### Performance fixes included

- Student dashboard database reads run concurrently instead of sequentially.
- Test-detail initial reads are parallelized.
- Student heartbeat frequency is reduced from every 30 seconds to every 60 seconds while the server-side stale-session window remains short enough to recover abandoned sessions.
- Existing indexes are supplemented for student login, test start-window lookups and answer integrity.

These changes reduce unnecessary Supabase round trips and database writes without removing the server-side security checks.

### Recommended free-tier protection

Use Netlify's available rate-limiting controls for login and other write-heavy endpoints. This is especially important because student login uses class + roll number + DOB rather than a strong password. Keep the Supabase service-role key server-side only.

For production, consider moving teacher/admin authentication to short-lived, HttpOnly, Secure, SameSite cookies instead of browser-accessible JWTs. The current bearer-token approach is functional, but HttpOnly cookies provide stronger protection against token theft through an XSS bug.

---

# 33. Security Audit

See `SECURITY_AUDIT.md` for the production security review, identified risks, implemented hardening, and recommended free-tier controls.

---

# Python Browser Execution (Current)

Python practical questions now include an in-browser **Run Python** environment powered by Pyodide and executed inside a dedicated Web Worker.

- Students edit Python code directly in the portal.
- `Run Python` executes the code locally in the browser.
- Standard `print()` output is displayed in the portal.
- `input()` is supported through the **Program input** box (one input value per line).
- An 8-second execution limit stops runaway/infinite-loop programs.
- Python execution is isolated from the portal DOM and does not require a Netlify function or Supabase request.
- The submitted answer remains the student's Python source code; execution output is a convenience for the student and is not treated as authoritative grading evidence.
- The existing Python tab-switch protection remains enabled.

The first Python execution on a device may take longer because the Pyodide runtime must be downloaded and initialized. Subsequent runs benefit from the browser cache.

## Word Paper Import

The Create Test page automatically detects the supported Word practical format. A Grade 9 Python paper structured as **5 questions × 8 variants × 10 marks** is imported as five practical questions with eight variants each and a total of 50 marks. The teacher still reviews the generated draft and clicks **Create Test** so that class, schedule and other examination settings are explicitly confirmed before the test is saved/published.
