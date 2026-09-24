import { expect } from '@playwright/test';
import { E2E_CONFIG } from './test-config.js';

export const TEST_STUDENT = {
  className: process.env.STUDENT_CLASS || E2E_CONFIG.student.className,
  roll: process.env.STUDENT_ROLL || E2E_CONFIG.student.roll,
  dob: process.env.STUDENT_DOB || E2E_CONFIG.student.dob,
};

export const TEST_TEACHER = {
  username: process.env.TEACHER_USERNAME || '',
  password: process.env.TEACHER_PASSWORD || '',
};

export const TEST_ADMIN = {
  username: process.env.ADMIN_USERNAME || '',
  password: process.env.ADMIN_PASSWORD || '',
};

export async function loginStudent(page, options = {}) {
  const student = options.student || TEST_STUDENT;
  const e2eSecret = process.env.E2E_TEST_SECRET || E2E_CONFIG.e2eSecret;

  // Send the E2E secret only with the login request, not with every API call.
  if (options.e2e !== false && e2eSecret) {
    await page.route('**/api/login-student', async route => {
      const headers = { ...route.request().headers(), 'x-e2e-test-key': e2eSecret };
      await route.continue({ headers });
    });
  }

  await page.goto('/student/login');
  await expect(page.getByRole('heading', { name: /student login/i })).toBeVisible();
  await page.locator('#klass').selectOption(student.className);
  await page.locator('#roll').fill(student.roll);
  await page.locator('#dob').fill(student.dob);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/student\/dashboard$/);
  await expect(page.getByText(new RegExp(`Roll\\s*${student.roll}`))).toBeVisible();

  if (options.e2e !== false && e2eSecret) {
    await page.unroute('**/api/login-student');
  }
}

export async function logoutStudent(page) {
  const button = page.getByRole('button', { name: /log out/i });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await expect(page).toHaveURL(/\/student\/login$/);
  }
}

export async function loginTeacher(page) {
  if (!TEST_TEACHER.username || !TEST_TEACHER.password) return false;
  await page.goto('/teacher/login');
  await page.locator('#u').fill(TEST_TEACHER.username);
  await page.locator('#p').fill(TEST_TEACHER.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  return true;
}

export async function loginAdmin(page) {
  if (!TEST_ADMIN.username || !TEST_ADMIN.password) return false;
  const adminPath = process.env.ADMIN_LOGIN_PATH || '/secure-admin-console/login';
  await page.goto(adminPath);
  await page.locator('#u').fill(TEST_ADMIN.username);
  await page.locator('#p').fill(TEST_ADMIN.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  return true;
}

export async function findOpenTest(page, titlePattern) {
  const rows = page.locator('.test-row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const title = await row.locator('div').first().innerText().catch(() => '');
    if (titlePattern && !new RegExp(titlePattern, 'i').test(title)) continue;
    const start = row.getByRole('button', { name: /start test/i });
    if (await start.count() && await start.first().isVisible().catch(() => false)) return row;
  }
  return null;
}
