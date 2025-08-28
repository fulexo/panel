import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo',
    },
  });
  console.log('✅ Created tenant:', tenant.name);

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'FULEXO_ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash('Staff123!', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: {
      email: 'staff@example.com',
      passwordHash: staffPassword,
      role: 'FULEXO_STAFF',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Created staff user:', staff.email);

  // Create customer admin user
  const customerAdminPassword = await bcrypt.hash('Customer123!', 10);
  const customerAdmin = await prisma.user.upsert({
    where: { email: 'customer.admin@example.com' },
    update: {},
    create: {
      email: 'customer.admin@example.com',
      passwordHash: customerAdminPassword,
      role: 'CUSTOMER_ADMIN',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Created customer admin:', customerAdmin.email);

  // Create customer user
  const customerPassword = await bcrypt.hash('Customer123!', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: customerPassword,
      role: 'CUSTOMER_USER',
      tenantId: tenant.id,
    },
  });
  console.log('✅ Created customer user:', customer.email);

  // Create default policy
  const policy = await prisma.policy.create({
    data: {
      tenantId: tenant.id,
      name: 'Default Policy',
      description: 'Default visibility and action policy',
      modules: {
        orders: true,
        shipments: true,
        returns: true,
        invoices: true,
        products: true,
        customers: true,
        analytics: true,
      },
      actions: {
        allowDownloadLabels: true,
        allowInvoicePDF: true,
        allowExportCSV: true,
        allowLiveRefresh: true,
      },
      dataScope: {
        allowedStatuses: ['all'],
        allowedOrderSources: ['all'],
        allowedWarehouses: ['all'],
      },
      piiSettings: {
        maskEmail: false,
        maskPhone: false,
        showPrices: true,
      },
      active: true,
    },
  });
  console.log('✅ Created default policy:', policy.name);

  // Create sample ownership rule
  const rule = await prisma.ownershipRule.create({
    data: {
      tenantId: tenant.id,
      entityType: 'order',
      priority: 10,
      conditionsJson: {
        conditions: [
          { field: 'order.order_source', op: 'in', value: ['shop', 'amazon'] },
        ],
      },
      actionJson: {
        action: 'assign',
        tenantId: tenant.id,
      },
      active: true,
    },
  });
  console.log('✅ Created sample ownership rule');

  // Create sample customers
  const sampleCustomers = [
    {
      tenantId: tenant.id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      emailNormalized: 'john.doe@example.com',
      phoneE164: '+905551234567',
      company: 'Acme Corp',
      city: 'Istanbul',
      country: 'TR',
    },
    {
      tenantId: tenant.id,
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      emailNormalized: 'jane.smith@example.com',
      phoneE164: '+905559876543',
      company: 'Tech Solutions',
      city: 'Ankara',
      country: 'TR',
    },
  ];

  for (const customerData of sampleCustomers) {
    const customer = await prisma.customer.create({
      data: customerData,
    });
    console.log('✅ Created sample customer:', customer.name);
  }

  // Create sample products
  const sampleProducts = [
    {
      tenantId: tenant.id,
      sku: 'PROD-001',
      name: 'Sample Product 1',
      description: 'This is a sample product',
      price: 99.99,
      stock: 100,
      active: true,
    },
    {
      tenantId: tenant.id,
      sku: 'PROD-002',
      name: 'Sample Product 2',
      description: 'Another sample product',
      price: 149.99,
      stock: 50,
      active: true,
    },
  ];

  for (const productData of sampleProducts) {
    const product = await prisma.product.create({
      data: productData,
    });
    console.log('✅ Created sample product:', product.name);
  }

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('Admin: admin@example.com / Admin123!');
  console.log('Staff: staff@example.com / Staff123!');
  console.log('Customer Admin: customer.admin@example.com / Customer123!');
  console.log('Customer: customer@example.com / Customer123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });