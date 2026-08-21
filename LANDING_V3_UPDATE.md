# Landing Page V3

This update changes the landing page to the requested composition:

- Left side: school headline, description and Student Login / Rankings actions.
- Right side: the three feature points (question types, secure assessment, instant progress).
- Right side below the features: a large student ranking image slider.
- Ranking slider loads the public Top 10 leaderboard from `/api/leaderboard-public?limit=10`.
- Center student is highlighted with a larger photo, rank, medal (when applicable), class and average percentage.
- Previous/next controls and rank dots are included.
- Ranking errors are no longer silently hidden; the page shows an error and a retry button.
- Responsive layout collapses to a clean mobile layout.

## Local testing

For the ranking data to load locally, the Netlify function must be running because the public ranking is served by `netlify/functions/leaderboard-public.js` and uses the server-side Supabase service key.

Recommended:

```bash
npx netlify dev
```

Then open the local URL shown by Netlify (normally `http://localhost:8888`).

Running only `npm run dev` starts Vite but does not start the Netlify function runtime, so `/api/leaderboard-public` will not have real ranking data unless a separate Netlify functions server is running.
