# Landing + Ranking V5 update

## Ranking ties

Public and authenticated class leaderboards now use competition ranking. Equal average percentages receive the same rank; the next rank skips accordingly (`1, 1, 3`). Secondary sorting is used only to keep the display order deterministic and never changes a tied student's rank.

## Hero ranking carousel

The landing-page Top 10 carousel wraps only when moving from the last active rank to rank 1. Side cards do not wrap, so rank #10 never appears beside rank #1. The carousel therefore shows #1/#2 at the beginning and #9/#10 at the end.

## Larger badges

Rank badges and medal badges were enlarged substantially on both the landing carousel and the full public rankings page.

## Student photo uploads

- Students can upload/change their own photo from **My Profile**.
- Teachers and Super Admins can upload/change a student's photo from **Students → Upload photo / Change photo**.
- Teacher access is restricted to their assigned classes on the server.

## Private admin URL

The Super Admin login is no longer linked from public pages. The route is configured through:

`VITE_ADMIN_LOGIN_PATH=/school-admin-console-7f3c/login`

For production, set a private path in Netlify environment variables and use that URL only with the administrator. This reduces public exposure but does not replace server-side role authentication and a strong password.
