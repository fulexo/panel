const fs = require('fs');
const path = require('path');

// Hatalı dosyaların listesi
const problematicFiles = [
  'apps/web/app/billing/page.tsx',
  'apps/web/app/billing/payments/page.tsx',
  'apps/web/app/customers/page.tsx',
  'apps/web/app/customers/[id]/page.tsx',
  'apps/web/app/orders/[id]/page.tsx',
  'apps/web/app/products/[id]/page.tsx',
  'apps/web/app/profile/page.tsx',
  'apps/web/app/returns/page.tsx',
  'apps/web/app/settings/page.tsx',
  'apps/web/app/shipments/[id]/page.tsx',
  'apps/web/app/shipments/page.tsx',
  'apps/web/app/stores/page.tsx',
  'apps/web/app/support/page.tsx',
  'apps/web/app/tenants/page.tsx',
  'apps/web/app/users/[id]/page.tsx',
  'apps/web/app/users/create/page.tsx',
  'apps/web/app/users/page.tsx',
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Yaygın hataları düzelt
    content = content
      // Fazladan } karakterlerini kaldır
      .replace(/\s*}\s*\)\s*;\s*}\s*$/, ');\n}')
      // Eksik kapanış etiketlerini düzelt
      .replace(/(<div[^>]*>)(?!.*<\/div>)/g, '$1</div>')
      // JSX syntax hatalarını düzelt
      .replace(/\s*}\s*\)\s*;\s*}\s*$/gm, ');\n}')
      // Fazladan parantezleri kaldır
      .replace(/\s*\)\s*;\s*}\s*$/gm, ');\n}')
      // Eksik kapanış etiketlerini ekle
      .replace(/(<ProtectedRoute[^>]*>)(?!.*<\/ProtectedRoute>)/g, '$1</ProtectedRoute>')
      // Fazladan virgülleri kaldır
      .replace(/,\s*}/g, '}')
      .replace(/,\s*\)/g, ')')
      // Eksik kapanış parantezlerini ekle
      .replace(/(<main[^>]*>)(?!.*<\/main>)/g, '$1</main>')
      .replace(/(<div[^>]*className="min-h-screen[^"]*">)(?!.*<\/div>)/g, '$1</div>');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Tüm hatalı dosyaları düzelt
problematicFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  } else {
    console.log(`File not found: ${fullPath}`);
  }
});

console.log('TypeScript error fixing completed!');