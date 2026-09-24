# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.js >> Student portal - complete functional flow >> student can login and dashboard loads
- Location: tests\student.spec.js:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /profile/i })
Expected: visible
Error: strict mode violation: getByRole('link', { name: /profile/i }) resolved to 2 elements:
    1) <a href="/student/profile" class="nav-action-button secondary">👤 My profile</a> aka getByRole('link', { name: '👤 My profile' })
    2) <a href="/student/profile" class="student-service-card">…</a> aka getByRole('link', { name: '📸 Profile & photo Update' })

Call log:
  - Expect "toBeVisible" getByRole('link', { name: /profile/i }) with timeout 10000ms
  - waiting for getByRole('link', { name: /profile/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "SNSVM logo" [ref=e6]
      - text: SNSVM Test Portal
    - generic [ref=e7]:
      - text: Student panel
      - button "Log out of student portal" [ref=e8] [cursor=pointer]: ↪ Log out
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - img "Parth Poonia" [ref=e12]
        - generic [ref=e13]:
          - generic [ref=e14]: Sant Nandlal Smriti Vidya Mandir
          - heading "Hi, Parth Poonia" [level=2] [ref=e15]
          - generic [ref=e16]: Roll 5 · Class IX
      - generic "Student self-service" [ref=e17]:
        - link "👤 My profile" [ref=e18] [cursor=pointer]:
          - /url: /student/profile
        - link "🏆 My ranking" [ref=e19] [cursor=pointer]:
          - /url: /student/leaderboard
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: STUDENT SELF-SERVICE
        - heading "Manage your own learning record" [level=3] [ref=e23]
        - paragraph [ref=e24]: Safely update your profile photo, review published results, download report cards and view your class ranking. Personal marks, class, roll number and tests remain protected from student editing.
      - generic [ref=e25]:
        - link "📸 Profile & photo Update your own photo" [ref=e26] [cursor=pointer]:
          - /url: /student/profile
          - generic [ref=e27]: 📸
          - strong [ref=e28]: Profile & photo
          - generic [ref=e29]: Update your own photo
        - link "🏆 My ranking See class leaderboard" [ref=e30] [cursor=pointer]:
          - /url: /student/leaderboard
          - generic [ref=e31]: 🏆
          - strong [ref=e32]: My ranking
          - generic [ref=e33]: See class leaderboard
        - link "📚 My tests Open active assessments" [ref=e34] [cursor=pointer]:
          - /url: "#my-tests"
          - generic [ref=e35]: 📚
          - strong [ref=e36]: My tests
          - generic [ref=e37]: Open active assessments
    - paragraph [ref=e38]: Loading…
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { loginStudent, logoutStudent, TEST_STUDENT, findOpenTest } from './helpers.js';
  3   | import { E2E_CONFIG } from './test-config.js';
  4   | 
  5   | test.describe('Student portal - complete functional flow', () => {
  6   |   test('public student login rejects invalid DOB/credentials', async ({ page }) => {
  7   |     await page.goto('/student/login');
  8   |     await page.locator('#klass').selectOption(TEST_STUDENT.className);
  9   |     await page.locator('#roll').fill(TEST_STUDENT.roll);
  10  |     await page.locator('#dob').fill('2000-01-01');
  11  |     await page.getByRole('button', { name: /log in/i }).click();
  12  |     await expect(page.locator('.error-box')).toBeVisible();
  13  |     await expect(page).toHaveURL(/\/student\/login$/);
  14  |   });
  15  | 
  16  |   test('student can login and dashboard loads', async ({ page }) => {
  17  |     await loginStudent(page);
  18  |     await expect(page.getByText(/student self-service/i)).toBeVisible();
> 19  |     await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  20  |     await expect(page.getByRole('link', { name: /ranking/i })).toBeVisible();
  21  |     await logoutStudent(page);
  22  |   });
  23  | 
  24  |   test('student profile and leaderboard pages are reachable', async ({ page }) => {
  25  |     await loginStudent(page);
  26  | 
  27  |     await page.goto('/student/profile');
  28  |     await expect(page).not.toHaveURL(/\/student\/login$/);
  29  |     await expect(page.locator('body')).not.toContainText('PAGE ERROR');
  30  | 
  31  |     await page.goto('/student/leaderboard');
  32  |     await expect(page).not.toHaveURL(/\/student\/login$/);
  33  |     await expect(page.locator('body')).not.toContainText('PAGE ERROR');
  34  | 
  35  |     await logoutStudent(page);
  36  |   });
  37  | 
  38  |   test('assigned test has correct opening state and can be opened', async ({ page }) => {
  39  |     await loginStudent(page);
  40  | 
  41  |     const titlePattern = process.env.PYTHON_TEST_TITLE || 'Python';
  42  |     const row = await findOpenTest(page, titlePattern);
  43  |     test.skip(!row, 'No matching OPEN test. Set PYTHON_TEST_TITLE or open the test window before running the full student test.');
  44  | 
  45  |     await row.getByRole('button', { name: /start test/i }).click();
  46  |     await expect(page).toHaveURL(/\/student\/test\//);
  47  |     await expect(page.locator('.timer')).toBeVisible();
  48  |     await expect(page.getByRole('button', { name: /submit test/i })).toBeVisible();
  49  |   });
  50  | 
  51  |   test('Grade IX Python practical is assigned one variant per question and runs in-browser', async ({ page }) => {
  52  |     await loginStudent(page);
  53  | 
  54  |     const titlePattern = process.env.PYTHON_TEST_TITLE || 'Python';
  55  |     const row = await findOpenTest(page, titlePattern);
  56  |     test.skip(!row, 'No matching OPEN Python test.');
  57  | 
  58  |     await row.getByRole('button', { name: /start test/i }).click();
  59  |     await expect(page).toHaveURL(/\/student\/test\//);
  60  | 
  61  |     const blocks = page.locator('.question-block');
  62  |     await expect(blocks).toHaveCount(5);
  63  | 
  64  |     // The supplied Grade 9 paper is 5 questions x 10 marks = 50.
  65  |     await expect(page.getByText(/50 marks/i).first()).toBeVisible();
  66  | 
  67  |     const text = await blocks.allInnerTexts();
  68  |     expect(text.join('\n')).toMatch(/city|population|temperature/i);
  69  |     expect(text.join('\n')).toMatch(/even numbers between 1 and 20/i);
  70  |     expect(text.join('\n')).toMatch(/reverse.*1234|1234.*reverse/i);
  71  |     expect(text.join('\n')).toMatch(/45.*3.*5|divisible by both/i);
  72  |     expect(text.join('\n')).toMatch(/minimum number/i);
  73  | 
  74  |     const editors = page.locator('.python-code-editor');
  75  |     await expect(editors).toHaveCount(5);
  76  | 
  77  |     // Q1 Variant 5: Data Types.
  78  |     await editors.nth(0).fill([
  79  |       'city = "Delhi"',
  80  |       'population = 20000000',
  81  |       'temperature = 28.5',
  82  |       'print(city, type(city))',
  83  |       'print(population, type(population))',
  84  |       'print(temperature, type(temperature))',
  85  |     ].join('\n'));
  86  |     await editors.nth(0).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
  87  |       .getByRole('button', { name: /run python/i }).click();
  88  |     await expect(editors.nth(0).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
  89  |       .toContainText('Delhi', { timeout: 30_000 });
  90  | 
  91  |     // Q2 Variant 5: even numbers 1..20.
  92  |     await editors.nth(1).fill('for i in range(2, 21, 2):\\n    print(i)');
  93  |     await editors.nth(1).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
  94  |       .getByRole('button', { name: /run python/i }).click();
  95  |     await expect(editors.nth(1).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
  96  |       .toContainText('20', { timeout: 30_000 });
  97  | 
  98  |     // Q3 Variant 5: reverse 1234 -> 4321.
  99  |     await editors.nth(2).fill([
  100 |       'number = 1234',
  101 |       'reversed_number = 0',
  102 |       'while number > 0:',
  103 |       '    digit = number % 10',
  104 |       '    reversed_number = reversed_number * 10 + digit',
  105 |       '    number //= 10',
  106 |       'print(reversed_number)',
  107 |     ].join('\n'));
  108 |     await editors.nth(2).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
  109 |       .getByRole('button', { name: /run python/i }).click();
  110 |     await expect(editors.nth(2).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
  111 |       .toContainText('4321', { timeout: 30_000 });
  112 | 
  113 |     // Q4 Variant 5: 45 divisible by both 3 and 5.
  114 |     await editors.nth(3).fill([
  115 |       'number = 45',
  116 |       'if number % 3 == 0 and number % 5 == 0:',
  117 |       '    print("Divisible by both")',
  118 |       'else:',
  119 |       '    print("Not divisible by both")',
```