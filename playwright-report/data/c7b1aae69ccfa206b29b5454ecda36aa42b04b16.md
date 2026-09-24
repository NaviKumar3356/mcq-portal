# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student.spec.js >> Student portal - complete functional flow >> normal session locking blocks a second browser using the SAME student account
- Location: tests\student.spec.js:154:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.error-box')
Expected pattern: /already|logged|session|active/i
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('.error-box') with timeout 10000ms
  - waiting for locator('.error-box')

```

```yaml
- img "SNSVM logo"
- text: SNSVM Test Portal Student panel
- button "Log out of student portal": ↪ Log out
- img "Parth Poonia"
- text: Sant Nandlal Smriti Vidya Mandir
- heading "Hi, Parth Poonia" [level=2]
- text: Roll 5 · Class IX
- link "👤 My profile":
  - /url: /student/profile
- link "🏆 My ranking":
  - /url: /student/leaderboard
- text: STUDENT SELF-SERVICE
- heading "Manage your own learning record" [level=3]
- paragraph: Safely update your profile photo, review published results, download report cards and view your class ranking. Personal marks, class, roll number and tests remain protected from student editing.
- link "📸 Profile & photo Update your own photo":
  - /url: /student/profile
  - text: 📸
  - strong: Profile & photo
  - text: Update your own photo
- link "🏆 My ranking See class leaderboard":
  - /url: /student/leaderboard
  - text: 🏆
  - strong: My ranking
  - text: See class leaderboard
- link "📚 My tests Open active assessments":
  - /url: "#my-tests"
  - text: 📚
  - strong: My tests
  - text: Open active assessments
- text: Mid Term Practical Paper Computer · 30 min · Total 50 marks closed Submitted — awaiting result Class Test - I Computer · 25 min · Total 30 marks closed
- link "View result (11 / 30)":
  - /url: /student/result/aad28bb5-db8c-48ed-9aec-1f36a7f22a56
  - button "View result (11 / 30)"
```

# Test source

```ts
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
  120 |     ].join('\n'));
  121 |     await editors.nth(3).locator('xpath=ancestor::div[contains(@class,"python-runner")]')
  122 |       .getByRole('button', { name: /run python/i }).click();
  123 |     await expect(editors.nth(3).locator('xpath=ancestor::div[contains(@class,"python-runner")]').locator('.python-output'))
  124 |       .toContainText(/Divisible by both/i, { timeout: 30_000 });
  125 | 
  126 |     // Q5 Variant 5: input five numbers and print minimum.
  127 |     await editors.nth(4).fill([
  128 |       'numbers = []',
  129 |       'for _ in range(5):',
  130 |       '    numbers.append(int(input()))',
  131 |       'print(min(numbers))',
  132 |     ].join('\n'));
  133 |     const runner5 = editors.nth(4).locator('xpath=ancestor::div[contains(@class,"python-runner")]');
  134 |     await runner5.locator('.python-input').fill('25\\n12\\n40\\n7\\n19');
  135 |     await runner5.getByRole('button', { name: /run python/i }).click();
  136 |     await expect(runner5.locator('.python-output')).toContainText('7', { timeout: 30_000 });
  137 |   });
  138 | 
  139 |   test('answers survive a refresh before submission', async ({ page }) => {
  140 |     await loginStudent(page);
  141 |     const row = await findOpenTest(page, process.env.PYTHON_TEST_TITLE || 'Python');
  142 |     test.skip(!row, 'No matching OPEN test.');
  143 |     await row.getByRole('button', { name: /start test/i }).click();
  144 | 
  145 |     const editors = page.locator('.python-code-editor');
  146 |     await expect(editors.first()).toBeVisible();
  147 |     const marker = '# STUDENT_REFRESH_PERSISTENCE_TEST';
  148 |     await editors.first().fill(marker);
  149 |     await page.reload();
  150 |     await expect(editors.first()).toHaveValue(marker);
  151 |   });
  152 | 
  153 | 
  154 |   test('normal session locking blocks a second browser using the SAME student account', async ({ browser, page }) => {
  155 |     test.skip(!(process.env.E2E_TEST_SECRET || E2E_CONFIG.e2eSecret), 'Configure the E2E test secret to enable repeatable same-student session tests.');
  156 | 
  157 |     // First browser uses the E2E override only to make this test repeatable.
  158 |     await loginStudent(page, { student: TEST_STUDENT, e2e: true });
  159 | 
  160 |     const second = await browser.newPage();
  161 |     try {
  162 |       // Deliberately omit the E2E header: this must behave exactly like a real second device.
  163 |       await second.goto('/student/login');
  164 |       await second.locator('#klass').selectOption(TEST_STUDENT.className);
  165 |       await second.locator('#roll').fill(TEST_STUDENT.roll);
  166 |       await second.locator('#dob').fill(TEST_STUDENT.dob);
  167 |       await second.getByRole('button', { name: /log in/i }).click();
> 168 |       await expect(second.locator('.error-box')).toContainText(/already|logged|session|active/i);
      |                                                  ^ Error: expect(locator).toContainText(expected) failed
  169 |       await expect(second).toHaveURL(/\/student\/login$/);
  170 |     } finally {
  171 |       await second.close();
  172 |       await logoutStudent(page);
  173 |     }
  174 |   });
  175 | 
  176 |   test('E2E mode can safely replace the SAME student active session without changing production locking', async ({ browser, page }) => {
  177 |     test.skip(!(process.env.E2E_TEST_SECRET || E2E_CONFIG.e2eSecret), 'Configure the E2E test secret to enable repeatable session reset testing.');
  178 | 
  179 |     await loginStudent(page, { student: TEST_STUDENT, e2e: true });
  180 |     const second = await browser.newPage();
  181 |     try {
  182 |       // Same student, second browser, E2E header enabled: the test harness may replace the old test session.
  183 |       await loginStudent(second, { student: TEST_STUDENT, e2e: true });
  184 |       await expect(second).toHaveURL(/\/student\/dashboard$/);
  185 |       await logoutStudent(second);
  186 |     } finally {
  187 |       await second.close();
  188 |       // The first browser's token is intentionally stale after replacement; do not call its logout endpoint.
  189 |       await page.close();
  190 |     }
  191 |   });
  192 | 
  193 |   test('file-based practical can accept a student upload without proctoring lock', async ({ page }) => {
  194 |     await loginStudent(page);
  195 |     const titlePattern = process.env.FILE_TEST_TITLE;
  196 |     test.skip(!titlePattern, 'Set FILE_TEST_TITLE to an OPEN file-based practical test to exercise answer-file upload.');
  197 | 
  198 |     const row = await findOpenTest(page, titlePattern);
  199 |     test.skip(!row, 'No matching OPEN file-based practical test.');
  200 | 
  201 |     await row.getByRole('button', { name: /start test/i }).click();
  202 |     await expect(page).toHaveURL(/\/student\/test\//);
  203 |     const fileInputs = page.locator('input[type="file"]');
  204 |     test.skip(await fileInputs.count() === 0, 'The selected test has no file-upload question.');
  205 | 
  206 |     await fileInputs.first().setInputFiles('tests/fixtures/student-upload-test.txt');
  207 |     await expect(page.getByText(/Uploaded: student-upload-test\.txt/i)).toBeVisible({ timeout: 30_000 });
  208 |     await expect(page.getByText(/file work enabled.*tab switching allowed/i)).toBeVisible();
  209 |   });
  210 | 
  211 |   test('student logout clears access to protected dashboard', async ({ page }) => {
  212 |     await loginStudent(page);
  213 |     await logoutStudent(page);
  214 |     await page.goto('/student/dashboard');
  215 |     await expect(page).toHaveURL(/\/student\/login$/);
  216 |   });
  217 | });
  218 | 
```