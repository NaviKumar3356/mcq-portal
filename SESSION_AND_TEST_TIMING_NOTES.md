# Session, Practical File Work, and Test Timing

- Student browser credentials are stored in `sessionStorage`, so refresh/navigation does not clear login, while closing the tab/browser removes the client-side login.
- The previous `pagehide` server-session release was removed because `pagehide` also fires on refresh and caused false logout.
- Student server sessions are refreshed every 30 seconds and expire after 3 minutes without a heartbeat. This prevents a closed/disconnected browser from holding the account lock forever while keeping active students stable.
- Tab-switch/blur proctoring is disabled. Students can download/open practical task files, work in Word/Excel/Canva/etc., and return to the portal to upload their answer without warnings or auto-submit.
- Normal tests use the fixed scheduled `end_at`; when only `start_at` is stored, the server derives `start_at + duration_minutes`. A late login therefore receives only the actual remaining time.
- Reopen and make-up attempts require teacher/admin to enter an exact number of minutes. The server stores that duration and uses `reopened_at + reopen_minutes` as the student's deadline.
