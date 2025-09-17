import { test, expect } from '@playwright/test';

test.describe('Basic E2E Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page title exists
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should have basic navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if there's a navigation element
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    expect(response?.status()).toBe(404);
  });
});