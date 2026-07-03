import { test, expect } from '@playwright/test';

const TARGET_ENV = process.env.TEST_ENV || 'QA';
const targetUrl = 'https://www.google.com';

test.describe(`Website Checks for ${TARGET_ENV}`, () => {
  test('Homepage has title', async ({ page }) => {
    await page.goto(targetUrl);
    const title = await page.title();
    expect(title).toContain('Google');
  });

  test('Has search input', async ({ page }) => {
    await page.goto(targetUrl);
    const searchInput = page.locator('textarea[name="q"], input[name="q"]');
    await expect(searchInput).toBeVisible();
  });
  
  test('Page loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto(targetUrl);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });
});
