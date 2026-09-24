import { test, expect } from '@playwright/test';
import { loginTeacher, TEST_TEACHER } from './helpers.js';

test.describe('Teacher portal - functional coverage', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_TEACHER.username || !TEST_TEACHER.password,
      'Set TEACHER_USERNAME and TEACHER_PASSWORD to run teacher E2E tests.');
    await loginTeacher(page);
  });

  test('teacher dashboard loads papers and filters', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^papers$/i })).toBeVisible();
    await expect(page.locator('input[placeholder*="Search by title"]')).toBeVisible();
    await expect(page.locator('select')).toHaveCount(2);
  });

  test('teacher can reach create-paper workflow without publishing anything', async ({ page }) => {
    await page.getByRole('link', { name: /new paper/i }).click();
    await expect(page).toHaveURL(/\/teacher\/create$/);
    await expect(page.locator('body')).not.toContainText('PAGE ERROR');
    expect(await page.getByRole('button').count()).toBeGreaterThan(0);
  });

  test('teacher can open edit, answer-key and submissions pages for an existing paper', async ({ page }) => {
    const cards = page.locator('.paper-card');
    test.skip(await cards.count() === 0, 'No existing paper is available for non-destructive route testing.');
    const card = cards.first();
    const links = [
      { name: /edit/i, pattern: /\/teacher\/test\/[^/]+\/edit$/ },
      { name: /answer key/i, pattern: /\/teacher\/test\/[^/]+\/answer-key$/ },
      { name: /submissions/i, pattern: /\/teacher\/test\/[^/]+\/submissions$/ },
    ];
    for (const item of links) {
      await card.getByRole('link', { name: item.name }).click();
      await expect(page).toHaveURL(item.pattern);
      await expect(page.locator('body')).not.toContainText('PAGE ERROR');
      await page.goBack();
    }
  });

  test('teacher navigation pages do not crash', async ({ page }) => {
    const paths = [
      '/teacher',
      '/teacher/create',
      '/teacher/students',
      '/teacher/leaderboard',
      '/teacher/profile',
    ];
    for (const path of paths) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/student\/login$/);
      await expect(page.locator('body')).not.toContainText('PAGE ERROR');
    }
  });
});
