// Admin kullanıcısını oluşturan/güncelleyen script
// Node.js ile çalıştırılır

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🔧 Admin kullanıcısını oluşturuyor/güncelliyor...');

  try {
    // Tenant'ı bul veya oluştur
    let tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo' }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Fulexo Company',
          slug: 'demo',
        }
      });
      console.log('✅ Tenant oluşturuldu:', tenant.name);
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash('Adem_123*', 10);

    // Admin kullanıcısını oluştur/güncelle
    const admin = await prisma.user.upsert({
      where: { email: 'fulexo@fulexo.com' },
      update: {
        passwordHash: passwordHash,
        role: 'FULEXO_ADMIN',
        tenantId: tenant.id,
      },
      create: {
        email: 'fulexo@fulexo.com',
        passwordHash: passwordHash,
        role: 'FULEXO_ADMIN',
        tenantId: tenant.id,
      },
    });

    console.log('✅ Admin kullanıcısı hazırlandı:');
    console.log('   Email: fulexo@fulexo.com');
    console.log('   Şifre: Adem_123*');
    console.log('   Rol: FULEXO_ADMIN');

    // Eski admin kullanıcısını sil (varsa)
    await prisma.user.deleteMany({
      where: {
        email: 'admin@example.com',
        tenantId: tenant.id
      }
    });

    console.log('✅ Eski varsayılan admin kullanıcısı temizlendi');

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
