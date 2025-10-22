const http = require('http');

let cookies = [];

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
      
      // Save cookies from response
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

async function testEndpoints() {
  console.log('=== FULEXO API COMPREHENSIVE TEST ===\n');
  
  // 1. Login
  console.log('1. LOGIN');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@fulexo.com',
    password: 'demo123'
  });
  console.log(`   Status: ${loginResult.status} ${loginResult.status === 200 ? '✓' : '✗'}`);
  console.log(`   User: ${loginResult.data.data?.email} (${loginResult.data.data?.role})\n`);
  
  // 2. Dashboard Stats
  console.log('2. DASHBOARD STATS');
  const dashResult = await makeRequest('/api/dashboard/stats');
  console.log(`   Status: ${dashResult.status} ${dashResult.status === 200 ? '✓' : '✗'}`);
  if (dashResult.status === 200) {
    console.log(`   Orders: ${dashResult.data.data?.totalOrders || 0}`);
    console.log(`   Products: ${dashResult.data.data?.totalProducts || 0}`);
    console.log(`   Customers: ${dashResult.data.data?.totalCustomers || 0}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(dashResult.data)}\n`);
  }
  
  // 3. Orders
  console.log('3. ORDERS');
  const ordersResult = await makeRequest('/api/orders?page=1&limit=10');
  console.log(`   Status: ${ordersResult.status} ${ordersResult.status === 200 ? '✓' : '✗'}`);
  if (ordersResult.status === 200) {
    console.log(`   Count: ${ordersResult.data.data?.length || 0}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(ordersResult.data)}\n`);
  }
  
  // 4. Products
  console.log('4. PRODUCTS');
  const productsResult = await makeRequest('/api/products?page=1&limit=10');
  console.log(`   Status: ${productsResult.status} ${productsResult.status === 200 ? '✓' : '✗'}`);
  if (productsResult.status === 200) {
    console.log(`   Count: ${productsResult.data.data?.length || 0}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(productsResult.data)}\n`);
  }
  
  // 5. Customers
  console.log('5. CUSTOMERS');
  const customersResult = await makeRequest('/api/customers?page=1&limit=10');
  console.log(`   Status: ${customersResult.status} ${customersResult.status === 200 ? '✓' : '✗'}`);
  if (customersResult.status === 200) {
    console.log(`   Count: ${customersResult.data.data?.length || 0}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(customersResult.data)}\n`);
  }
  
  // 6. Stores
  console.log('6. STORES');
  const storesResult = await makeRequest('/api/stores');
  console.log(`   Status: ${storesResult.status} ${storesResult.status === 200 ? '✓' : '✗'}`);
  if (storesResult.status === 200) {
    console.log(`   Count: ${storesResult.data.data?.length || 0}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(storesResult.data)}\n`);
  }
  
  // 7. Inventory
  console.log('7. INVENTORY');
  const inventoryResult = await makeRequest('/api/inventory');
  console.log(`   Status: ${inventoryResult.status} ${inventoryResult.status === 200 ? '✓' : '✗'}`);
  if (inventoryResult.status === 200) {
    console.log(`   Count: ${inventoryResult.data.data?.length || 0}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(inventoryResult.data)}\n`);
  }
  
  // 8. Shipping
  console.log('8. SHIPPING');
  const shippingResult = await makeRequest('/api/shipping/rates');
  console.log(`   Status: ${shippingResult.status} ${shippingResult.status === 200 ? '✓' : '✗'}\n`);
  
  // 9. Returns
  console.log('9. RETURNS');
  const returnsResult = await makeRequest('/api/returns');
  console.log(`   Status: ${returnsResult.status} ${returnsResult.status === 200 ? '✓' : '✗'}\n`);
  
  // 10. Notifications
  console.log('10. NOTIFICATIONS');
  const notificationsResult = await makeRequest('/api/notifications');
  console.log(`   Status: ${notificationsResult.status} ${notificationsResult.status === 200 ? '✓' : '✗'}\n`);
  
  // 11. Profile
  console.log('11. PROFILE');
  const profileResult = await makeRequest('/api/auth/profile');
  console.log(`   Status: ${profileResult.status} ${profileResult.status === 200 ? '✓' : '✗'}`);
  if (profileResult.status === 200) {
    console.log(`   Email: ${profileResult.data.data?.email}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(profileResult.data)}\n`);
  }
  
  // 12. Health Check
  console.log('12. HEALTH CHECK');
  const healthResult = await makeRequest('/health');
  console.log(`   Status: ${healthResult.status} ${healthResult.status === 200 ? '✓' : '✗'}`);
  if (healthResult.status === 200) {
    console.log(`   Service: ${healthResult.data.service}`);
    console.log(`   Database: ${healthResult.data.checks?.database ? '✓' : '✗'}`);
    console.log(`   Redis: ${healthResult.data.checks?.redis ? '✓' : '✗'}\n`);
  } else {
    console.log(`   Error: ${JSON.stringify(healthResult.data)}\n`);
  }
  
  console.log('=== TEST TAMAMLANDI ===');
}

testEndpoints().catch(console.error);

