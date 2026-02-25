import { test, expect } from '@playwright/test';

test.describe('Dashboard flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    // Wait for redirect to Dashboard with generous timeout
    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('should display total stats cards', async ({ page }) => {
    // en.json dashboard.totalProducts / dashboard.totalWarehouses
    await expect(page.locator('text=Total Products')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Total Warehouses')).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.click('text=Products');
    await expect(page).toHaveURL('/products', { timeout: 10000 });
  });

  test('should navigate to warehouses page', async ({ page }) => {
    await page.click('text=Warehouses');
    await expect(page).toHaveURL('/warehouses', { timeout: 10000 });
  });

  test('should log out correctly', async ({ page }) => {
    // Click the Logout button in the header
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });
});
