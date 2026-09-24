# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.js >> Student portal - complete functional flow >> student profile and leaderboard pages are reachable
- Location: tests\student.spec.js:24:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/student\/dashboard$/
Received string:  "https://e2e-testing--snsvm-test-portal.netlify.app/student/login"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    24 × locator resolved to <html lang="en" data-corner-style="soft" data-card-density="spacious">…</html>
       - unexpected value "https://e2e-testing--snsvm-test-portal.netlify.app/student/login"

```

```yaml
- img "SNSVM logo"
- text: Sant Nandlal Smriti Vidya Mandir
- heading "🎓 Student Login" [level=2]
- text: Class
- combobox "Class":
  - option "Select your class" [disabled]
  - option "I"
  - option "II"
  - option "III"
  - option "IV"
  - option "V"
  - option "VI"
  - option "VII"
  - option "VIII"
  - option "IX" [selected]
  - option "X"
  - option "XI"
  - option "XII"
- text: Roll number
- textbox "Roll number":
  - /placeholder: e.g. 24
  - text: "5"
- text: Date of birth
- textbox "Date of birth": 2013-06-01
- text: This student account is already signed in on another device or browser. Log out there first, or wait about 3 minutes for the inactive session to expire.
- button "Log in"
- paragraph:
  - link "← Back to home":
    - /url: /
```

# Test source

```ts
  1  | import { expect } from '@playwright/test';
  2  | import { E2E_CONFIG } from './test-config.js';
  3  | 
  4  | export const TEST_STUDENT = {
  5  |   className: process.env.STUDENT_CLASS || E2E_CONFIG.student.className,
  6  |   roll: process.env.STUDENT_ROLL || E2E_CONFIG.student.roll,
  7  |   dob: process.env.STUDENT_DOB || E2E_CONFIG.student.dob,
  8  | };
  9  | 
  10 | export const TEST_TEACHER = {
  11 |   username: process.env.TEACHER_USERNAME || '',
  12 |   password: process.env.TEACHER_PASSWORD || '',
  13 | };
  14 | 
  15 | export const TEST_ADMIN = {
  16 |   username: process.env.ADMIN_USERNAME || '',
  17 |   password: process.env.ADMIN_PASSWORD || '',
  18 | };
  19 | 
  20 | export async function loginStudent(page, options = {}) {
  21 |   const student = options.student || TEST_STUDENT;
  22 |   const e2eSecret = process.env.E2E_TEST_SECRET || E2E_CONFIG.e2eSecret;
  23 | 
  24 |   // Send the E2E secret only with the login request, not with every API call.
  25 |   if (options.e2e !== false && e2eSecret) {
  26 |     await page.route('**/api/login-student', async route => {
  27 |       const headers = { ...route.request().headers(), 'x-e2e-test-secret': e2eSecret };
  28 |       await route.continue({ headers });
  29 |     });
  30 |   }
  31 | 
  32 |   await page.goto('/student/login');
  33 |   await expect(page.getByRole('heading', { name: /student login/i })).toBeVisible();
  34 |   await page.locator('#klass').selectOption(student.className);
  35 |   await page.locator('#roll').fill(student.roll);
  36 |   await page.locator('#dob').fill(student.dob);
  37 |   await page.getByRole('button', { name: /log in/i }).click();
> 38 |   await expect(page).toHaveURL(/\/student\/dashboard$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  39 |   await expect(page.getByText(new RegExp(`Roll\\s*${student.roll}`))).toBeVisible();
  40 | 
  41 |   if (options.e2e !== false && e2eSecret) {
  42 |     await page.unroute('**/api/login-student');
  43 |   }
  44 | }
  45 | 
  46 | export async function logoutStudent(page) {
  47 |   const button = page.getByRole('button', { name: /log out/i });
  48 |   if (await button.isVisible().catch(() => false)) {
  49 |     await button.click();
  50 |     await expect(page).toHaveURL(/\/student\/login$/);
  51 |   }
  52 | }
  53 | 
  54 | export async function loginTeacher(page) {
  55 |   if (!TEST_TEACHER.username || !TEST_TEACHER.password) return false;
  56 |   await page.goto('/teacher/login');
  57 |   await page.locator('#u').fill(TEST_TEACHER.username);
  58 |   await page.locator('#p').fill(TEST_TEACHER.password);
  59 |   await page.getByRole('button', { name: /log in/i }).click();
  60 |   await expect(page).toHaveURL(/\/teacher$/);
  61 |   return true;
  62 | }
  63 | 
  64 | export async function loginAdmin(page) {
  65 |   if (!TEST_ADMIN.username || !TEST_ADMIN.password) return false;
  66 |   const adminPath = process.env.ADMIN_LOGIN_PATH || '/secure-admin-console/login';
  67 |   await page.goto(adminPath);
  68 |   await page.locator('#u').fill(TEST_ADMIN.username);
  69 |   await page.locator('#p').fill(TEST_ADMIN.password);
  70 |   await page.getByRole('button', { name: /log in/i }).click();
  71 |   await expect(page).toHaveURL(/\/admin$/);
  72 |   return true;
  73 | }
  74 | 
  75 | export async function findOpenTest(page, titlePattern) {
  76 |   const rows = page.locator('.test-row');
  77 |   const count = await rows.count();
  78 |   for (let i = 0; i < count; i++) {
  79 |     const row = rows.nth(i);
  80 |     const title = await row.locator('div').first().innerText().catch(() => '');
  81 |     if (titlePattern && !new RegExp(titlePattern, 'i').test(title)) continue;
  82 |     const start = row.getByRole('button', { name: /start test/i });
  83 |     if (await start.count() && await start.first().isVisible().catch(() => false)) return row;
  84 |   }
  85 |   return null;
  86 | }
  87 | 
```