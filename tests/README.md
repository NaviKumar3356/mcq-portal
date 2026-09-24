# SNSVM Portal — Free End-to-End Testing

This folder adds a **free, local Playwright test suite** for the portal. It is designed to test the application from a real student's browser point of view and also provides teacher/admin/security smoke coverage.

## What is covered

### Student
- Student login success/failure
- Session-protected dashboard
- Profile and leaderboard routes
- Test opening
- Test timer visibility
- Grade IX Python practical structure
- 5 questions / 50 marks
- Variant-5 content for Parth Poonia (Roll 5)
- Python execution in the browser
- `for`, `while`, `if/else`
- `input()` with multiple lines
- Output verification
- Draft persistence after refresh
- Logout and protected-route redirect

### Teacher
- Teacher login
- Paper dashboard
- Search/filter controls
- Create-paper page
- Students/leaderboard/profile routes
- Page crash detection

### Super Admin
- Admin login
- Overview
- Teachers
- Students
- Papers
- Leaderboard
- Profile
- Settings
- Page crash detection

### Public/security
- Landing page
- Public rankings
- Protected-route redirects
- Private admin URL protection
- Unknown-route fallback
- `/api/server-time`
- `/api/public-catalog`
- HTTP method protection for selected POST-only APIs

## Install

From the project root:

```bash
npm install
npx playwright install chromium
```

Playwright is open source and the browser tests run locally. No cloud testing subscription is required.

## Run

### All tests

```bash
npm run test:e2e
```

### Watch the browser

```bash
npm run test:e2e:headed
```

### Student tests only

```bash
npm run test:student
```

### Teacher/admin tests

```bash
npm run test:roles
```

### Security/public tests

```bash
npm run test:security
```

## Student test defaults

The student suite defaults to the test account used for the current Grade 9 verification:

```text
Class: IX
Roll: 5
DOB: 2013-06-01
```

Override them when required:

```bash
STUDENT_CLASS=IX STUDENT_ROLL=5 STUDENT_DOB=2013-06-01 npm run test:student
```

The Python test searches the student's dashboard for an **open** test whose title contains `Python`.

You can make the matching stricter:

```bash
PYTHON_TEST_TITLE="Grade 9 Python Practical" npm run test:student
```

## Teacher/admin credentials

Teacher/admin tests are skipped unless credentials are supplied.

Windows PowerShell:

```powershell
$env:TEACHER_USERNAME="test_teacher"
$env:TEACHER_PASSWORD="test_password"
$env:ADMIN_USERNAME="test_admin"
$env:ADMIN_PASSWORD="test_password"
npm run test:roles
```

Linux/macOS:

```bash
TEACHER_USERNAME=test_teacher \
TEACHER_PASSWORD=test_password \
ADMIN_USERNAME=test_admin \
ADMIN_PASSWORD=test_password \
npm run test:roles
```

Use **dedicated test accounts**, not real staff credentials.

## Important: production testing

The student Python test expects an **OPEN** Python test. If the test is scheduled for another time, the login/dashboard/security tests can still run, but the full Python flow will be skipped.

For a true end-to-end exam rehearsal:

1. Create a dedicated Grade IX test.
2. Publish it.
3. Make its opening window active.
4. Assign the test to the Grade IX class.
5. Use a dedicated test student such as Roll 5.
6. Run:

```bash
npm run test:student
```

## Reports

After a run:

```text
playwright-report/
test-results/
```

The HTML report can be opened with:

```bash
npx playwright show-report
```

On failure Playwright retains screenshots, video and a trace when configured by the test runner.

## What this suite intentionally does NOT do automatically

It does not delete papers, publish results, delete students, change settings, or permanently modify production data. Destructive teacher/admin operations should be tested against a staging/test database.

This is important because "test all functionality" should not mean accidentally deleting a live exam.

## Recommended production test account

Create:

```text
Grade: IX
Roll: 5
DOB: 2013-06-01
```

and use the uploaded Grade 9 Python practical. The supplied paper defines 5 questions, 8 variants per question, 10 marks each, for 50 marks. Roll 5 should receive Variant 5 for each question.

The student test verifies the expected Variant-5 topics and actually runs representative Python programs in the browser.

## Current limitations

This suite is a real browser automation suite, but no automated test can prove every possible database state or every third-party browser/network failure.

For complete release testing, run it against:
- a staging Supabase project, and
- the production Netlify deployment with a dedicated test account.

Do not use real student records for automated testing.


### Full session-lock coverage
No second test student is required. The same real student account configured in `STUDENT_CLASS`, `STUDENT_ROLL`, and `STUDENT_DOB` is used for both sides of the session-lock test. The first browser logs in with the E2E header, while the second browser deliberately logs in without it and must be rejected. A separate test then uses the E2E header in both browsers to verify that automated runs can safely replace the previous test session. Production students still follow the normal one-active-session rule.


## Same-student E2E configuration

The included `tests/test-config.js` is a local-only configuration for the existing student account. Edit only `student.className`, `student.roll`, and `student.dob` if you need to test a different existing student. The file is ignored by Git.

The generated E2E secret is stored locally in `E2E_TEST_SECRET.txt`. Add the same value to Netlify as the server-side environment variable `E2E_TEST_SECRET`. Also set `E2E_TEST_STUDENT_CLASS` and `E2E_TEST_STUDENT_ROLL` to the same existing student's class and roll. Do not create a `VITE_` version of the secret.

With these values, the Playwright tests use the existing student and the E2E header only for repeatable session replacement. Normal login/session locking remains enforced when the header is absent.
