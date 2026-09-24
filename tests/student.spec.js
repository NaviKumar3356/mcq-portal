import { test, expect } from '@playwright/test';
import { loginStudent, logoutStudent, TEST_STUDENT, findOpenTest } from './helpers.js';
import { E2E_CONFIG } from './test-config.js';

test.describe('Student portal - complete functional flow', () => {
  test('public student login rejects invalid DOB/credentials', async ({ page }) => {
    await page.goto('/student/login');
    await page.locator('#klass').selectOption(TEST_STUDENT.className);
    await page.locator('#roll').fill(TEST_STUDENT.roll);
    await page.locator('#dob').fill('2000-01-01');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.locator('.error-box')).toBeVisible();
    await expect(page).toHaveURL(/\/student\/login$/);
  });

  test('student can login and dashboard loads', async ({ page }) => {
    await loginStudent(page);
    await expect(page.getByText(/student self-service/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ranking/i })).toBeVisible();
    await logoutStudent(page);
  });

  test('student profile and leaderboard pages are reachable', async ({ page }) => {
    await loginStudent(page);

    await page.goto('/student/profile');
    await expect(page).not.toHaveURL(/\/student\/login$/);
    await expect(page.locator('body')).not.toContainText('PAGE ERROR');

    await page.goto('/student/leaderboard');
    await expect(page).not.toHaveURL(/\/student\/login$/);
    await expect(page.locator('body')).not.toContainText('PAGE ERROR');

    await logoutStudent(page);
  });

  test('assigned test has correct opening state and can be opened', async ({ page }) => {
    await loginStudent(page);

    const titlePattern = process.env.PYTHON_TEST_TITLE || 'Python';
    const row = await findOpenTest(page, titlePattern);
    test.skip(!row, 'No matching OPEN test. Set PYTHON_TEST_TITLE or open the test window before running the full student test.');

    await row.getByRole('button', { name: /start test/i }).click();
    await expect(page).toHaveURL(/\/student\/test\//);
    await expect(page.locator('.timer')).toBeVisible();
    await expect(page.getByRole('button', { name: /submit test/i })).toBeVisible();
  });

  test('Grade IX Python practical is assigned one variant per question and runs in-browser', async ({ page }) => {
    await loginStudent(page);

    const titlePattern = process.env.PYTHON_TEST_TITLE || 'Python';
    const row = await findOpenTest(page, titlePattern);
    test.skip(!row, 'No matching OPEN Python test.');

    await row.getByRole('button', { name: /start test/i }).click();
    await expect(page).toHaveURL(/\/student\/test\//);

    const blocks = page.locator('.question-block');
    await expect(blocks).toHaveCount(5);

    // The supplied Grade 9 paper is 5 questions x 10 marks = 50.
    await expect(page.getByText(/50 marks/i).first()).toBeVisible();

    const text = await blocks.allInnerTexts();
    expect(text.join('\n')).toMatch(/city|population|temperature/i);
    expect(text.join('\n')).toMatch(/even numbers between 1 and 20/i);
    expect(text.join('\n')).toMatch(/reverse.*1234|1234.*reverse/i);
    expect(text.join('\n')).toMatch(/45.*3.*5|divisible by both/i);
    expect(text.join('\n')).toMatch(/minimum number/i);

    const editors = page.locator('.python-code-editor');
    await expect(editors).toHaveCount(5);

    // Q1 Variant 5: Data Types.
    await editors.nth(0).fill([
      'city = "Delhi"',
      'population = 20000000',
      'temperature = 28.5',
      'print(city, type(city))',
      'print(population, type(population))',
      'print(temperature, type(temperature))',
    ].join('\n'));
    await editors.nth(0).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
      .getByRole('button', { name: /run python/i }).click();
    await expect(editors.nth(0).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
      .toContainText('Delhi', { timeout: 30_000 });

    // Q2 Variant 5: even numbers 1..20.
    await editors.nth(1).fill('for i in range(2, 21, 2):\\n    print(i)');
    await editors.nth(1).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
      .getByRole('button', { name: /run python/i }).click();
    await expect(editors.nth(1).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
      .toContainText('20', { timeout: 30_000 });

    // Q3 Variant 5: reverse 1234 -> 4321.
    await editors.nth(2).fill([
      'number = 1234',
      'reversed_number = 0',
      'while number > 0:',
      '    digit = number % 10',
      '    reversed_number = reversed_number * 10 + digit',
      '    number //= 10',
      'print(reversed_number)',
    ].join('\n'));
    await editors.nth(2).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
      .getByRole('button', { name: /run python/i }).click();
    await expect(editors.nth(2).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
      .toContainText('4321', { timeout: 30_000 });

    // Q4 Variant 5: 45 divisible by both 3 and 5.
    await editors.nth(3).fill([
      'number = 45',
      'if number % 3 == 0 and number % 5 == 0:',
      '    print("Divisible by both")',
      'else:',
      '    print("Not divisible by both")',
    ].join('\n'));
    await editors.nth(3).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
      .getByRole('button', { name: /run python/i }).click();
    await expect(editors.nth(3).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
      .toContainText(/Divisible by both/i, { timeout: 30_000 });

    // Q5 Variant 5: input five numbers and print minimum.
    await editors.nth(4).fill([
      'numbers = []',
      'for _ in range(5):',
      '    numbers.append(int(input()))',
      'print(min(numbers))',
    ].join('\n'));
    const runner5 = editors.nth(4).locator('xpath=ancestor::div[contains(@class,"python-runner")]');
    await runner5.locator('.python-input').fill('25\\n12\\n40\\n7\\n19');
    await runner5.getByRole('button', { name: /run python/i }).click();
    await expect(runner5.locator('.python-output')).toContainText('7', { timeout: 30_000 });
  });

  test('answers survive a refresh before submission', async ({ page }) => {
    await loginStudent(page);
    const row = await findOpenTest(page, process.env.PYTHON_TEST_TITLE || 'Python');
    test.skip(!row, 'No matching OPEN test.');
    await row.getByRole('button', { name: /start test/i }).click();

    const editors = page.locator('.python-code-editor');
    await expect(editors.first()).toBeVisible();
    const marker = '# STUDENT_REFRESH_PERSISTENCE_TEST';
    await editors.first().fill(marker);
    await page.reload();
    await expect(editors.first()).toHaveValue(marker);
  });


  test('normal session locking blocks a second browser using the SAME student account', async ({ browser, page }) => {
    test.skip(!(process.env.E2E_TEST_SECRET || E2E_CONFIG.e2eSecret), 'Configure the E2E test secret to enable repeatable same-student session tests.');

    // First browser uses the E2E override only to make this test repeatable.
    await loginStudent(page, { student: TEST_STUDENT, e2e: true });

    const second = await browser.newPage();
    try {
      // Deliberately omit the E2E header: this must behave exactly like a real second device.
      await second.goto('/student/login');
      await second.locator('#klass').selectOption(TEST_STUDENT.className);
      await second.locator('#roll').fill(TEST_STUDENT.roll);
      await second.locator('#dob').fill(TEST_STUDENT.dob);
      await second.getByRole('button', { name: /log in/i }).click();
      await expect(second.locator('.error-box')).toContainText(/already|logged|session|active/i);
      await expect(second).toHaveURL(/\/student\/login$/);
    } finally {
      await second.close();
      await logoutStudent(page);
    }
  });

  test('E2E mode can safely replace the SAME student active session without changing production locking', async ({ browser, page }) => {
    test.skip(!(process.env.E2E_TEST_SECRET || E2E_CONFIG.e2eSecret), 'Configure the E2E test secret to enable repeatable session reset testing.');

    await loginStudent(page, { student: TEST_STUDENT, e2e: true });
    const second = await browser.newPage();
    try {
      // Same student, second browser, E2E header enabled: the test harness may replace the old test session.
      await loginStudent(second, { student: TEST_STUDENT, e2e: true });
      await expect(second).toHaveURL(/\/student\/dashboard$/);
      await logoutStudent(second);
    } finally {
      await second.close();
      // The first browser's token is intentionally stale after replacement; do not call its logout endpoint.
      await page.close();
    }
  });

  test('file-based practical can accept a student upload without proctoring lock', async ({ page }) => {
    await loginStudent(page);
    const titlePattern = process.env.FILE_TEST_TITLE;
    test.skip(!titlePattern, 'Set FILE_TEST_TITLE to an OPEN file-based practical test to exercise answer-file upload.');

    const row = await findOpenTest(page, titlePattern);
    test.skip(!row, 'No matching OPEN file-based practical test.');

    await row.getByRole('button', { name: /start test/i }).click();
    await expect(page).toHaveURL(/\/student\/test\//);
    const fileInputs = page.locator('input[type="file"]');
    test.skip(await fileInputs.count() === 0, 'The selected test has no file-upload question.');

    await fileInputs.first().setInputFiles('tests/fixtures/student-upload-test.txt');
    await expect(page.getByText(/Uploaded: student-upload-test\.txt/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/file work enabled.*tab switching allowed/i)).toBeVisible();
  });

  test('student logout clears access to protected dashboard', async ({ page }) => {
    await loginStudent(page);
    await logoutStudent(page);
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/student\/login$/);
  });
});
