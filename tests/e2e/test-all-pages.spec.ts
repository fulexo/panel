import { test, expect } from '@playwright/test';

test.describe('Fulexo Platform - All Pages Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'admin@fulexo.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  const pages = [
    { name: 'Dashboard', url: '/dashboard' },
    { name: 'Orders', url: '/orders' },
    { name: 'Products', url: '/products' },
    { name: 'Customers', url: '/customers' },
    { name: 'Inventory', url: '/inventory' },
    { name: 'Shipping', url: '/shipping' },
    { name: 'Returns', url: '/returns' },
    { name: 'Stores', url: '/stores' },
    { name: 'Calendar', url: '/calendar' },
    { name: 'Fulfillment', url: '/fulfillment' },
    { name: 'Notifications', url: '/notifications' },
    { name: 'Profile', url: '/profile' },
    { name: 'Reports', url: '/reports' },
    { name: 'Settings', url: '/settings' },
    { name: 'Support', url: '/support' },
  ];

  for (const pageInfo of pages) {
    test(`should load ${pageInfo.name} page without errors`, async ({ page }) => {
      console.log(`Testing page: ${pageInfo.name} (${pageInfo.url})`);
      
      const errors: string[] = [];
      
      // Listen for console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(`Console error: ${msg.text()}`);
        }
      });
      
      // Listen for page errors
      page.on('pageerror', error => {
        errors.push(`Page error: ${error.message}`);
      });
      
      // Navigate to page
      const response = await page.goto(`http://localhost:3001${pageInfo.url}`);
      
      // Check response status
      expect(response?.status()).toBeLessThan(400);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Check for errors
      if (errors.length > 0) {
        console.error(`Errors on ${pageInfo.name}:`, errors);
      }
      
      expect(errors).toHaveLength(0);
    });
  }
});

