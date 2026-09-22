# Security & Performance Audit

## Executive summary

The portal has a solid server-side security foundation: privileged database access is kept in Netlify Functions, Supabase RLS is enabled on the main tables, student sessions are server-checked, and practical resources use signed URLs.

The audit also found several areas that should be hardened for production school exams:

1. **Submission completeness validation** — fixed in this release.
2. **Student class validation during submission** — fixed in this release.
3. **Teacher grading answer ownership** — fixed in this release.
4. **Browser GET caching of timing/session-sensitive endpoints** — fixed in this release.
5. **Dashboard/test-detail round trips** — reduced in this release.
6. **Heartbeat traffic** — reduced from 30 seconds to 60 seconds.
7. **Database indexes and duplicate-answer protection** — added in V17 migration.
8. **Login brute-force protection** — should be configured with Netlify rate limiting.
9. **Teacher/admin browser-accessible JWTs** — functional, but HttpOnly Secure SameSite cookies would be stronger against token theft from an XSS vulnerability.

## Security status

| Area | Status | Notes |
|---|---|---|
| Supabase service-role key | Good | Server-side only |
| Supabase RLS | Good | Main application tables are locked to direct client access |
| Student active-session lock | Good | Atomic acquisition + heartbeat |
| Student class authorization | Good | Checked server-side during test load and submission |
| Test deadline enforcement | Good | Server function uses server time |
| Reattempt duration | Good | Explicit teacher/admin duration required |
| Practical resource exposure | Good | Selected variant only + signed URL |
| Submission question integrity | Hardened | Exact question-set validation added |
| Teacher grading ownership | Hardened | Answer must belong to selected submission |
| Duplicate answers | Hardened | Unique DB index added |
| Login brute-force protection | Action required | Configure Netlify rate limiting |
| Teacher/admin token storage | Improvement recommended | Prefer HttpOnly Secure SameSite cookies in a future auth refactor |
| Browser-side anti-cheat | Limited | Useful deterrent, not a security boundary |

## Free-tier performance findings

Supabase Free currently provides unlimited API requests but the free database uses shared compute and has a 60-connection database limit; this means latency can still rise even when an API-request quota is not exhausted. See the current Supabase pricing and compute documentation.

The most important optimization is therefore to reduce unnecessary database round trips and writes, not simply to increase an API quota.

The portal now:

- Runs independent dashboard queries concurrently.
- Avoids a redundant `students` lookup when the verified JWT already contains the student's class.
- Parallelizes independent test-detail reads.
- Excludes timing/session-sensitive GET endpoints from the frontend cache.
- Reduces session heartbeat traffic from every 30 seconds to every 60 seconds.
- Adds indexes for common student/test lookup paths.

## Recommended Netlify protection

Netlify supports code-based function rate limiting on all plans. For this school portal, rate limiting should be applied primarily to login endpoints and other expensive write endpoints.

Avoid an aggressive per-IP login limit because many students may share the same school Wi-Fi/public IP. A practical starting point is:

- Student login: around 100–150 requests per IP per minute.
- Teacher login: around 20 requests per IP per minute.
- Super-admin login: around 10 requests per IP per minute.

These values should be adjusted after observing real examination-day traffic.

## Recommended authentication improvement

The current JWT bearer-token model works, but the browser can read the token because it is stored in local/session storage. A future production-hardening step should move authentication to:

- `HttpOnly`
- `Secure`
- `SameSite=Lax` or `SameSite=Strict`

cookies, with short-lived access sessions and server-side refresh/revocation where appropriate.

This reduces the impact of a future XSS vulnerability because JavaScript cannot directly read an HttpOnly cookie.

## Do not rely on tab switching for security

Tab-switch detection is intentionally enabled for MCQ/HTML/Python/SQL and disabled for external-application practicals. It should be treated as an examination-policy signal, not as a cryptographic security control. A determined user can manipulate a browser environment; server-side authorization, timing, submission integrity and database constraints are the real security boundaries.

## Supabase storage

Keep `answer-sheets` and `question-resources` private. Use signed URLs. Keep storage size and MIME restrictions configured at the bucket level as well as in application code.

## Operational recommendation

Before a live exam:

1. Run the latest schema migrations.
2. Confirm Supabase Storage bucket limits.
3. Deploy the latest Netlify Functions.
4. Test one student login.
5. Test one MCQ paper.
6. Test one file-based practical.
7. Test one HTML/Python practical.
8. Test a late login.
9. Test a teacher-controlled reattempt.
10. Check Netlify Function usage/latency and Supabase database health.
11. Do not manually delete active session rows while an exam is running.
