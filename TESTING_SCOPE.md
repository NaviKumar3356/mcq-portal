# Portal E2E Coverage Matrix

The automated suite is deliberately non-destructive. It covers the user-facing workflows that can be safely exercised against a live deployment.

## Covered automatically

### Public
- Landing page
- Public rankings
- Student login
- Teacher login
- Private admin login route
- Unknown-route fallback
- Public catalog
- Server time

### Student
- Valid login
- Invalid login
- Session persistence while page is open
- Dashboard
- Student profile route
- Student leaderboard route
- Test start button/open window
- Test timer
- Python practical structure
- 5 questions / 50 marks
- Roll 5 Variant 5 expected content
- Python code editor
- Python `print`
- `for`
- `while`
- `if/else`
- `input()` with multiple lines
- Python output
- Draft persistence after browser refresh
- Concurrent login/session lock
- Logout
- Protected route after logout
- Optional file-practical upload
- File-practical tab-switch allowance

### Teacher
- Dashboard
- Search/filter controls
- Create paper page
- Students
- Leaderboard
- Profile
- Existing-paper Edit page
- Existing-paper Answer Key page
- Existing-paper Submissions page

### Super Admin
- Overview
- Teachers
- Students
- Papers
- Leaderboard
- Profile
- Settings

### Security / HTTP
- Protected student route redirects
- Protected teacher route redirects
- Protected admin route redirects
- POST-only endpoint method checks
- No page-level error boundary visible during route smoke tests

## Intentionally not destructive

The suite does not automatically:
- delete tests
- delete students
- delete teachers
- publish/close live tests
- publish/unpublish live results
- change admin settings
- grade real submissions

These should be run against a dedicated staging/test account and database if full mutation testing is required.

## Release recommendation

For a release candidate, run:
1. `npm run test:e2e` against the deployed site.
2. `npm run test:student` with an open Grade IX Python test.
3. Teacher/admin suites using dedicated test accounts.
4. A separate staging-only mutation test for create/edit/publish/grade/delete workflows.


### Session-lock-safe E2E mode
- Automated functional tests use a dedicated E2E student account and a server-only secret.
- The E2E override replaces only that dedicated test account's existing session.
- Production students retain normal single-session enforcement.
- A separate lock-integrity test runs without the E2E override.
