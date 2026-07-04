import { test, expect } from '@playwright/test';

const TARGET_ENV = process.env.TEST_ENV || 'QA';
const ENV_URLS: Record<string, string> = {
  'QA': 'https://example.com',
  'UAT': 'https://example.net',
  'Prod': 'https://example.org'
};
const targetUrl = ENV_URLS[TARGET_ENV] || 'https://example.com';

test.describe(`Website Checks for ${TARGET_ENV}`, () => {
  test('Homepage has title', async ({ page }) => {
    await page.goto(targetUrl);
    const title = await page.title();
    expect(title).not.toBe('');
  });

  test('Has expected domain text', async ({ page }) => {
    await page.goto(targetUrl);
    const text = await page.locator('body').innerText();
    expect(text).toContain('Example');
  });
  
  test('Page loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto(targetUrl);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
