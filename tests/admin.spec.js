import { test, expect } from '@playwright/test';
import { loginAdmin, TEST_ADMIN } from './helpers.js';

test.describe('Super-admin portal - functional coverage', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_ADMIN.username || !TEST_ADMIN.password,
      'Set ADMIN_USERNAME and ADMIN_PASSWORD to run admin E2E tests.');
    await loginAdmin(page);
  });

  test('admin overview loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('body')).not.toContainText('PAGE ERROR');
  });

  test('admin management routes do not crash', async ({ page }) => {
    const paths = [
      '/admin',
      '/admin/teachers',
      '/admin/students',
      '/admin/papers',
      '/admin/leaderboard',
      '/admin/profile',
      '/admin/settings',
    ];
    for (const path of paths) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/student\/login$/);
      await expect(page.locator('body')).not.toContainText('PAGE ERROR');
    }
  });
});
