const http = require('http');

let cookies = [];
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join('; ')
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = bodyStr.length;
    }

    const req = http.request(options, (res) => {
      let data = '';
      
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'];
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function logResult(name, result, expected = 200) {
  results.total++;
  const success = result.status === expected;
  if (success) {
    results.passed++;
    console.log(`✓ ${name} - Status: ${result.status}`);
  } else {
    results.failed++;
    console.log(`✗ ${name} - Status: ${result.status} (Expected: ${expected})`);
  }
  return success;
}

async function testEndpoints() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   FULEXO API COMPREHENSIVE ENDPOINT TEST              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  // === AUTHENTICATION ===
  console.log('┌─ AUTHENTICATION ──────────────────────────────────────┐');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@fulexo.com',
    password: 'demo123'
  });
  logResult('Login', loginResult);
  if (loginResult.status === 200) {
    console.log(`  User: ${loginResult.data.data?.email} (${loginResult.data.data?.role})`);
    console.log(`  Tenant: ${loginResult.data.data?.tenantName}`);
  }
  
  const profileResult = await makeRequest('/api/auth/profile');
  logResult('Profile', profileResult);
  console.log('└───────────────────────────────────────────────────────┘\n');
  
  // === CORE RESOURCES ===
  console.log('┌─ CORE RESOURCES ──────────────────────────────────────┐');
  
  const ordersResult = await makeRequest('/api/orders?page=1&limit=10');
  logResult('Orders List', ordersResult);
  if (ordersResult.status === 200) {
    console.log(`  Count: ${ordersResult.data.data?.length || 0}`);
  }
  
  const orderStatsResult = await makeRequest('/api/orders/stats/summary');
  logResult('Orders Stats', orderStatsResult);
  
  const productsResult = await makeRequest('/api/products?page=1&limit=10');
  logResult('Products List', productsResult);
  if (productsResult.status === 200) {
    console.log(`  Count: ${productsResult.data.data?.length || 0}`);
  }
  
  const customersResult = await makeRequest('/api/customers?page=1&limit=10');
  logResult('Customers List', customersResult);
  if (customersResult.status === 200) {
    console.log(`  Count: ${customersResult.data.data?.length || 0}`);
  }
  
  const storesResult = await makeRequest('/api/stores');
  logResult('Stores List', storesResult);
  if (storesResult.status === 200) {
    console.log(`  Count: ${storesResult.data.data?.length || 0}`);
  }
  
  console.log('└───────────────────────────────────────────────────────┘\n');
  
  // === INVENTORY ===
  console.log('┌─ INVENTORY ───────────────────────────────────────────┐');
  
  const approvalsResult = await makeRequest('/api/inventory/approvals?page=1&limit=10');
  logResult('Inventory Approvals', approvalsResult);
  
  const stockLevelsResult = await makeRequest('/api/inventory/stock-levels');
  logResult('Stock Levels', stockLevelsResult);
  
  const invRequestsStatsResult = await makeRequest('/api/inventory-requests/stats');
  logResult('Inventory Requests Stats', invRequestsStatsResult);
  
  console.log('└───────────────────────────────────────────────────────┘\n');
  
  // === SHIPPING ===
  console.log('┌─ SHIPPING ────────────────────────────────────────────┐');
  
  const shippingZonesResult = await makeRequest('/api/shipping/zones');
  logResult('Shipping Zones', shippingZonesResult);
  
  const shippingPricesResult = await makeRequest('/api/shipping/prices');
  logResult('Shipping Prices', shippingPricesResult);
  
  const shippingOptionsResult = await makeRequest('/api/shipping/options');
  logResult('Shipping Options', shippingOptionsResult);
  
  console.log('└───────────────────────────────────────────────────────┘\n');
  
  // === FULFILLMENT & RETURNS ===
  console.log('┌─ FULFILLMENT & RETURNS ───────────────────────────────┐');
  
  const returnsResult = await makeRequest('/api/returns');
  logResult('Returns List', returnsResult);
  
  const fulfillmentStatsResult = await makeRequest('/api/fulfillment-billing/stats');
  logResult('Fulfillment Stats', fulfillmentStatsResult);
  
  console.log('└───────────────────────────────────────────────────────┘\n');
  
  // === SYSTEM ===
  console.log('┌─ SYSTEM ──────────────────────────────────────────────┐');
  
  const healthResult = await makeRequest('/health');
  logResult('Health Check', healthResult);
  if (healthResult.status === 200) {
    console.log(`  Service: ${healthResult.data.service}`);
    console.log(`  Database: ${healthResult.data.checks?.database ? '✓' : '✗'}`);
    console.log(`  Redis: ${healthResult.data.checks?.redis ? '✓' : '✗'}`);
  }
  
  console.log('└───────────────────────────────────────────────────────┘\n');
  
  // === SUMMARY ===
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   TEST SUMMARY                                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`  Total Tests:   ${results.total}`);
  console.log(`  Passed:        ${results.passed} ✓`);
  console.log(`  Failed:        ${results.failed} ✗`);
  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  console.log(`  Success Rate:  ${percentage}%`);
  console.log('');
  
  if (results.failed === 0) {
    console.log('  🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log(`  ⚠️  ${results.failed} test(s) failed`);
  }
  console.log('');
}

testEndpoints().catch(console.error);

