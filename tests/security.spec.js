import { test, expect } from '@playwright/test';

test.describe('Public routing and access-control smoke tests', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('PAGE ERROR');
  });

  test('public rankings page loads without authentication', async ({ page }) => {
    await page.goto('/rankings');
    await expect(page.locator('body')).not.toContainText('PAGE ERROR');
  });

  test('teacher protected route redirects to teacher login', async ({ page }) => {
    await page.goto('/teacher');
    await expect(page).toHaveURL(/\/teacher\/login$/);
  });

  test('student protected route redirects to student login', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/student\/login$/);
  });

  test('student test route cannot be opened without authentication', async ({ page }) => {
    await page.goto('/student/test/does-not-matter');
    await expect(page).toHaveURL(/\/student\/login$/);
  });

  test('admin protected route redirects to private admin login', async ({ page }) => {
    await page.goto('/admin');
    const expected = process.env.ADMIN_LOGIN_PATH || '/secure-admin-console/login';
    await expect(page).toHaveURL(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  });

  test('unknown route returns to landing page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });

  test('server time endpoint returns a valid ISO timestamp', async ({ request }) => {
    const response = await request.get('/api/server-time');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(new Date(data.now).toString()).not.toBe('Invalid Date');
  });

  test('public catalog endpoint is available', async ({ request }) => {
    const response = await request.get('/api/public-catalog');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.classes)).toBeTruthy();
    expect(Array.isArray(data.subjects)).toBeTruthy();
  });

  test('POST-only submit endpoint rejects GET', async ({ request }) => {
    const response = await request.get('/api/submit-test');
    expect(response.status()).toBe(405);
  });

  test('POST-only heartbeat endpoint rejects GET', async ({ request }) => {
    const response = await request.get('/api/student-session-heartbeat');
    expect(response.status()).toBe(405);
  });
});
