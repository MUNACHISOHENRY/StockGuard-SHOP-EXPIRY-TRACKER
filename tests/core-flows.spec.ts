import { expect, test } from '@playwright/test';

test.describe('E2E: StockGuard Flows', () => {

    test('should add a new product and verify it appears in inventory and dashboard', async ({ page }) => {
        test.setTimeout(60000);

        // Go to dashboard
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Ensure Dashboard loaded
        await expect(page.locator('h1').filter({ hasText: 'StockGuard' }).first()).toBeVisible();

        // Navigate to Add Item via sidebar link
        await page.locator('button', { hasText: 'Add Item' }).first().click();
        await page.waitForURL(/.*\/inventory\/add/);

        // Check if we are on Add Item step 1
        await expect(page.locator('h2', { hasText: 'Add New Item' }).first()).toBeVisible();

        // Fill Step 1 details
        await page.fill('input[name="name"]', 'Playwright Test Product');
        await page.locator('select[name="category"]').selectOption({ label: 'Produce' });
        await page.fill('input[name="price"]', '49.99');
        await page.fill('textarea[name="description"]', 'This is a test product created by standard browser automation.');

        // Go to Next Step
        await page.locator('button', { hasText: 'Continue' }).first().click();
        await page.waitForTimeout(500);

        // Fill Step 2 details (Stock & Expiry)
        await page.fill('input[name="quantity"]', '120');
        await page.fill('input[name="expiryDate"]', '2030-12-31');

        // Click Continue — the form auto-submits and redirects to inventory
        await page.locator('button', { hasText: 'Continue' }).first().click();

        // Should redirect to Inventory automatically and show a toast
        await expect(page).toHaveURL(/.*\/inventory/, { timeout: 10000 });

        // Verify toast appeared
        await expect(page.getByText('added to inventory')).toBeVisible({ timeout: 5000 });

        // Verify it is visible in the list
        await expect(page.getByText('Playwright Test Product').first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow routing across all pages without crashing', async ({ page }) => {
        test.setTimeout(60000);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Dashboard should show Overview heading
        await expect(page.locator('h2', { hasText: 'Overview' }).first()).toBeVisible({ timeout: 10000 });

        // Navigate to Inventory
        await page.locator('button', { hasText: 'Inventory' }).first().click();
        await expect(page).toHaveURL(/.*\/inventory/);
        await expect(page.locator('h2', { hasText: 'Inventory' }).first()).toBeVisible();

        // Navigate to Add Item
        await page.locator('button', { hasText: 'Add Item' }).first().click();
        await expect(page).toHaveURL(/.*\/inventory\/add/);
        await expect(page.locator('h2', { hasText: 'Add New Item' }).first()).toBeVisible();
    });

});
