import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    // The Login page title is "Welcome back" from en.json login.welcome
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should show validation errors on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Validation messages from en.json: login.invalidEmail and login.passwordRequired
    await expect(page.locator('text=Invalid email address')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrong123');
    await page.click('button[type="submit"]');
    // Toast or inline error should appear
    // Both inline error and toast appear — just check the inline one
    await expect(
      page.locator('.bg-red-50', { hasText: 'Invalid credentials' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully as admin', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    // Should be redirected to Dashboard — allow extra time for API
    await expect(page).toHaveURL('/', { timeout: 15000 });
    // Dashboard shows "Total Products" from en.json dashboard.totalProducts
    await expect(page.locator('text=Total Products').first()).toBeVisible({ timeout: 10000 });
  });
});
