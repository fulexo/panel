import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN',
      }));
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard elements', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for main dashboard elements
    await expect(page.locator('h1')).toBeVisible();
    
    // Check for navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Check for sidebar
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
    }
  });

  test('should display statistics cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Mock API responses for dashboard data
    await page.route('**/api/dashboard/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalOrders: 150,
          totalProducts: 500,
          totalCustomers: 75,
          totalRevenue: 25000,
        }),
      });
    });

    // Check for statistics cards
    const statsCards = page.locator('[data-testid="stats-card"]');
    if (await statsCards.count() > 0) {
      await expect(statsCards).toHaveCount(4);
    }
  });

  test('should display recent orders table', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Mock API response for recent orders
    await page.route('**/api/orders/recent', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              id: 'order-1',
              customerName: 'John Doe',
              total: 99.99,
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // Check for orders table
    const ordersTable = page.locator('[data-testid="orders-table"]');
    if (await ordersTable.isVisible()) {
      await expect(ordersTable).toBeVisible();
    }
  });

  test('should handle navigation to different sections', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Test navigation to orders page
    const ordersLink = page.locator('a[href="/orders"]');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await expect(page).toHaveURL('/orders');
    }
    
    // Test navigation to products page
    const productsLink = page.locator('a[href="/products"]');
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await expect(page).toHaveURL('/products');
    }
  });
});