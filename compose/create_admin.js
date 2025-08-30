const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const prisma = new PrismaClient();
  try {
    console.log('🔌 Veritabanına bağlanıyor...');
    
    // Mevcut tenantları listeleyelim
    const tenants = await prisma.tenant.findMany();
    console.log('📋 Mevcut tenantlar:', tenants.map(t => t.slug));
    
    // Admin tenant oluştur veya mevcut olanı kullan
    let adminTenant = tenants.find(t => t.slug === 'admin');
    if (adminTenant) {
      console.log('ℹ️ Admin tenant zaten var:', adminTenant.slug);
    } else {
      adminTenant = await prisma.tenant.create({
        data: {
          name: 'Admin Tenant',
          slug: 'admin'
        }
      });
      console.log('✅ Admin tenant oluşturuldu:', adminTenant.slug);
    }

    // Admin kullanıcı oluştur
    const hashedPassword = await bcrypt.hash('Adem_123*', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'fulexo@fulexo.com' },
      update: { passwordHash: hashedPassword },
      create: {
        email: 'fulexo@fulexo.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        tenantId: adminTenant.id
      }
    });
    console.log('✅ Admin kullanıcı oluşturuldu:', adminUser.email);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
