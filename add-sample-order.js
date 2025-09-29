// Örnek order ekleme scripti
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleOrder() {
  try {
    console.log('🛒 Örnek order ekleniyor...');

    // Önce tenant ve store bilgilerini alalım
    const tenant = await prisma.tenant.findFirst();
    const store = await prisma.store.findFirst();
    
    if (!tenant || !store) {
      console.error('❌ Tenant veya Store bulunamadı!');
      return;
    }

    console.log(`✅ Tenant: ${tenant.name}, Store: ${store.name}`);

    // Örnek customer oluştur
    const customer = await prisma.customer.upsert({
      where: {
        email: 'sample@customer.com'
      },
      update: {},
      create: {
        tenantId: tenant.id,
        storeId: store.id,
        email: 'sample@customer.com',
        emailNormalized: 'sample@customer.com',
        name: 'Sample Customer',
        firstName: 'Sample',
        lastName: 'Customer',
        phoneE164: '+905551234567',
        addressLine1: 'Örnek Mahallesi, Test Sokak No:123',
        city: 'İstanbul',
        state: 'İstanbul',
        postalCode: '34000',
        country: 'TR',
        billingInfo: {
          first_name: 'Sample',
          last_name: 'Customer',
          address_1: 'Örnek Mahallesi, Test Sokak No:123',
          city: 'İstanbul',
          state: 'İstanbul',
          postcode: '34000',
          country: 'TR',
          phone: '+905551234567',
          email: 'sample@customer.com'
        },
        shippingInfo: {
          first_name: 'Sample',
          last_name: 'Customer',
          address_1: 'Örnek Mahallesi, Test Sokak No:123',
          city: 'İstanbul',
          state: 'İstanbul',
          postcode: '34000',
          country: 'TR',
          phone: '+905551234567'
        }
      }
    });

    console.log(`✅ Customer oluşturuldu: ${customer.name}`);

    // Order numarası için sequence güncelle
    await prisma.$executeRaw`
      INSERT INTO "_OrderNoSeq" ("tenantId", "value") 
      VALUES (${tenant.id}, 1001) 
      ON CONFLICT ("tenantId") 
      DO UPDATE SET "value" = "_OrderNoSeq"."value" + 1, "updatedAt" = NOW()
    `;

    // Örnek order oluştur
    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        customerId: customer.id,
        orderNumber: 'ORD-2024-001',
        orderNo: 1001,
        externalOrderNo: 'EXT-001',
        orderSource: 'manual',
        status: 'pending_approval',
        approvalStatus: 'pending',
        currency: 'TRY',
        total: 449.97,
        customerEmail: customer.email,
        customerPhone: customer.phoneE164,
        billingAddress: customer.billingInfo,
        shippingAddress: customer.shippingInfo,
        paymentMethod: 'credit_card',
        paymentMethodTitle: 'Kredi Kartı',
        notes: 'Örnek sipariş - Test amaçlı oluşturuldu',
        tags: ['sample', 'test', 'demo'],
        confirmedAt: new Date(),
        items: {
          create: [
            {
              sku: 'SAMPLE-PHONE-001',
              name: 'Samsung Galaxy S24 Ultra',
              qty: 1,
              price: 299.99
            },
            {
              sku: 'SAMPLE-CASE-001',
              name: 'Premium Phone Case',
              qty: 2,
              price: 74.99
            }
          ]
        }
      },
      include: {
        items: true,
        customer: true
      }
    });

    console.log(`✅ Örnek order oluşturuldu!`);
    console.log(`📋 Order ID: ${order.id}`);
    console.log(`📋 Order Number: ${order.orderNumber}`);
    console.log(`💰 Total: ${order.total} ${order.currency}`);
    console.log(`👤 Customer: ${order.customer?.name}`);
    console.log(`📦 Items: ${order.items.length} adet`);

    // İkinci örnek order
    const order2 = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        customerId: customer.id,
        orderNumber: 'ORD-2024-002',
        orderNo: 1002,
        externalOrderNo: 'EXT-002',
        orderSource: 'woocommerce',
        status: 'processing',
        approvalStatus: 'approved',
        currency: 'TRY',
        total: 199.99,
        customerEmail: customer.email,
        customerPhone: customer.phoneE164,
        billingAddress: customer.billingInfo,
        shippingAddress: customer.shippingInfo,
        paymentMethod: 'bank_transfer',
        paymentMethodTitle: 'Banka Havalesi',
        notes: 'WooCommerce\'ten gelen sipariş',
        tags: ['woocommerce', 'approved'],
        confirmedAt: new Date(),
        datePaid: new Date(),
        items: {
          create: [
            {
              sku: 'SAMPLE-LAPTOP-001',
              name: 'MacBook Air M2',
              qty: 1,
              price: 199.99
            }
          ]
        }
      },
      include: {
        items: true
      }
    });

    console.log(`✅ İkinci örnek order oluşturuldu!`);
    console.log(`📋 Order Number: ${order2.orderNumber}`);
    console.log(`💰 Total: ${order2.total} ${order2.currency}`);

    console.log(`\n🎉 Toplam 2 adet örnek order başarıyla eklendi!`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleOrder();
