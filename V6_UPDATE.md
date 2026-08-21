# MCQ Portal V6 update

- Public rankings hero is smaller and class filters stay in one horizontal row with horizontal scrolling on narrow screens.
- Visual theme updated to match the school logo: maroon, academic green and gold.
- Added Super Admin School & Branding control centre.
- Added CRUD-oriented admin quick actions and system controls on Admin Overview.
- Added public site settings API and dynamic school logo support.
- Added admin image uploads for school logo and three landing media slots.
- Added configurable school name/place and theme colours.
- Added Supabase v9 migration for the `site-assets` public bucket and branding settings.
- Admin route defaults to `/secure-admin-console/login` and remains unlinked from public pages; use `VITE_ADMIN_LOGIN_PATH` to customise it.
