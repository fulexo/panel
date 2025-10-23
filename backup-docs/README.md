# Test Organization

Bu klasör tüm test dosyalarının merkezi organizasyonunu içerir.

## 📁 Klasör Yapısı

```
tests/
├── unit/                 # Unit testleri
│   ├── api/             # Backend API testleri
│   ├── web/             # Frontend component testleri
│   └── worker/          # Worker service testleri
├── integration/         # Entegrasyon testleri
├── e2e/                # End-to-end testleri
├── fixtures/           # Test verileri ve mock'lar
├── utils/              # Test yardımcı fonksiyonları
└── README.md           # Bu dosya
```

## 🧪 Test Türleri

### Unit Tests (`tests/unit/`)
- **API Tests**: Backend servislerinin unit testleri
- **Web Tests**: React component'lerinin unit testleri  
- **Worker Tests**: Background job'ların unit testleri

### Integration Tests (`tests/integration/`)
- API endpoint'lerinin entegrasyon testleri
- Servisler arası etkileşim testleri
- Database entegrasyon testleri

### E2E Tests (`tests/e2e/`)
- Playwright ile end-to-end testleri
- Kullanıcı senaryolarının tam testleri

## 🚀 Test Çalıştırma

### Tüm Testleri Çalıştır
```bash
npm test
```

### Belirli Test Türlerini Çalıştır
```bash
# Sadece unit testleri
npm run test:unit

# Sadece entegrasyon testleri
npm run test:integration

# Sadece E2E testleri
npm run test:e2e
```

### Belirli Servis Testlerini Çalıştır
```bash
# API testleri
npm run test:unit:api

# Web testleri
npm run test:unit:web

# Worker testleri
npm run test:unit:worker
```

### Coverage Raporu
```bash
npm run test:coverage
```

## 📋 Test Standartları

### Dosya Adlandırma
- Unit testler: `*.test.ts` veya `*.test.tsx`
- Integration testler: `*.test.ts`
- E2E testler: `*.test.ts`

### Test Yapısı
```typescript
describe('Component/Service Name', () => {
  describe('Method/Feature Name', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Mock Kullanımı
- Test verileri için `fixtures/test-data.ts` kullanın
- Yardımcı fonksiyonlar için `utils/test-helpers.ts` kullanın
- Servis mock'ları için `createMock*` fonksiyonlarını kullanın

## 🔧 Test Konfigürasyonu

### Jest Konfigürasyonu
- `jest.config.cjs` - Ana Jest konfigürasyonu
- `jest.setup.js` - Test setup dosyası

### Playwright Konfigürasyonu
- `playwright.config.ts` - E2E test konfigürasyonu

## 📊 Coverage Hedefleri

- **Unit Tests**: %90+ coverage
- **Integration Tests**: %80+ coverage
- **E2E Tests**: Kritik user journey'ler %100

## 🐛 Test Debugging

### Verbose Output
```bash
npm test -- --verbose
```

### Specific Test
```bash
npm test -- --testNamePattern="specific test name"
```

### Watch Mode
```bash
npm test -- --watch
```

## 📝 Test Yazma Rehberi

### 1. Test Yazmadan Önce
- Test edilecek fonksiyon/component'i anlayın
- Gerekli mock'ları hazırlayın
- Test senaryolarını planlayın

### 2. Test Yazarken
- Açıklayıcı test isimleri kullanın
- Her test tek bir şeyi test etsin
- Arrange-Act-Assert pattern'ini takip edin

### 3. Test Yazdıktan Sonra
- Test'in çalıştığından emin olun
- Coverage'a katkısını kontrol edin
- Gereksiz testleri temizleyin

## 🔄 Test Maintenance

### Düzenli Kontroller
- Haftalık test çalıştırma
- Aylık coverage raporu inceleme
- Çeyreklik test organizasyonu gözden geçirme

### Test Temizliği
- Kullanılmayan test dosyalarını silin
- Duplicate testleri birleştirin
- Outdated testleri güncelleyin

## 📚 Faydalı Kaynaklar

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)