# Ayarlar Yönetimi Dokümantasyonu

Fulexo platformunda tüm önemli yapılandırmalar artık web paneli üzerinden yönetilebilir. Bu dokümantasyon, ayarlar sisteminin nasıl çalıştığını ve nasıl kullanılacağını açıklar.

## 🎯 Genel Bakış

Ayarlar sistemi, her tenant (kiracı) için izole edilmiş yapılandırma imkanı sunar. Hassas veriler (API anahtarları, şifreler) otomatik olarak şifrelenir.

## 📋 Ayar Kategorileri

### 1. E-posta Ayarları
SMTP yapılandırması ile sistem e-postalarının gönderimini sağlar.

**Gerekli Alanlar:**
- **SMTP Sunucu**: E-posta sağlayıcınızın SMTP adresi
- **Port**: Genellikle 587 (TLS) veya 465 (SSL)
- **Kullanıcı Adı**: E-posta adresiniz
- **Şifre**: E-posta şifreniz veya uygulama şifresi
- **Gönderen Adresi**: Sistem e-postalarında görünecek adres

**Popüler Sağlayıcılar:**
- **Gmail**: smtp.gmail.com:587 (Uygulama şifresi gerekir)
- **Outlook**: smtp-mail.outlook.com:587
- **Yandex**: smtp.yandex.com:465
- **SendGrid**: smtp.sendgrid.net:587

### 2. BaseLinker Entegrasyonu
BaseLinker ile veri senkronizasyonu için gerekli ayarlar.

**Alanlar:**
- **API Anahtarı**: BaseLinker panelinden alınan API key
- **API URL**: Varsayılan olarak dolu gelir
- **Senkronizasyon Aralığı**: Otomatik senkronizasyon periyodu
- **Otomatik Senkronizasyon**: Aktif/Pasif

**API Anahtarı Alma:**
1. BaseLinker hesabınıza giriş yapın
2. Ayarlar → API bölümüne gidin
3. "Yeni API Anahtarı Oluştur" butonuna tıklayın
4. Oluşan anahtarı kopyalayıp yapıştırın

### 3. Bildirim Ayarları
Sistem olayları için bildirim tercihleri.

**Desteklenen Kanallar:**
- **Slack Webhook**: Slack kanalına bildirim
- **Discord Webhook**: Discord kanalına bildirim
- **E-posta Bildirimleri**: Kritik olaylar için e-posta

### 4. Genel Ayarlar
Sistem genelinde kullanılan temel yapılandırmalar.

**Alanlar:**
- **Şirket Adı**: E-postalarda ve bildirimlerde kullanılır
- **Destek E-postası**: Sistem bildirimlerinin gönderileceği adres
- **Saat Dilimi**: Tarih/saat gösterimleri için
- **Tarih Formatı**: DD/MM/YYYY veya MM/DD/YYYY
- **Para Birimi**: TRY, USD, EUR vb.

## 🔧 API Kullanımı

### Ayarları Getirme
```bash
GET /api/settings/email
Authorization: Bearer {token}
```

### Ayarları Güncelleme
```bash
PUT /api/settings/email
Content-Type: application/json
Authorization: Bearer {token}

{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": "587",
  "smtp_user": "your-email@gmail.com",
  "smtp_pass": "your-app-password",
  "smtp_from": "noreply@yourdomain.com",
  "smtp_secure": "true"
}
```

### Bağlantı Testi
```bash
POST /api/settings/test-connection
Content-Type: application/json
Authorization: Bearer {token}

{
  "service": "email" // veya "baselinker"
}
```

## 🔐 Güvenlik

1. **Şifreleme**: Tüm hassas veriler (şifreler, API anahtarları) AES-256-GCM ile şifrelenir
2. **Yetkilendirme**: Sadece admin rolüne sahip kullanıcılar ayarları değiştirebilir
3. **Denetim**: Tüm ayar değişiklikleri loglanır
4. **İzolasyon**: Her tenant'ın ayarları birbirinden tamamen izole

## 🚀 Kod İçinde Kullanım

### E-posta Gönderme
```typescript
// Email service otomatik olarak tenant ayarlarını kullanır
await emailService.sendEmail(tenantId, {
  to: 'customer@example.com',
  subject: 'Hoş Geldiniz',
  html: '<h1>Merhaba!</h1>'
});
```

### BaseLinker API Çağrısı
```typescript
// BaseLinker service otomatik olarak tenant API key'ini kullanır
const orders = await baseLinkerService.getOrders(tenantId);
```

## 📊 Ayar Durumu İzleme

Panel üzerinden ayarların durumunu görebilirsiniz:
- ✅ Yeşil: Ayar yapılandırılmış ve test edilmiş
- ⚠️ Sarı: Ayar yapılandırılmış ama test edilmemiş
- ❌ Kırmızı: Ayar yapılandırılmamış veya hatalı

## 🔄 Migration

Eski sistemden yeni ayarlar sistemine geçiş için:

1. Mevcut .env değerlerini not alın
2. Panel üzerinden ilgili ayarlara girin
3. Bağlantıları test edin
4. .env dosyasından eski değerleri kaldırın

## ❓ Sık Sorulan Sorular

**S: Gmail ile e-posta gönderemiyorum?**
C: Gmail için uygulama şifresi oluşturmanız gerekir. 2FA'yı etkinleştirip, güvenlik ayarlarından uygulama şifresi oluşturun.

**S: BaseLinker bağlantı testi başarısız oluyor?**
C: API anahtarınızın doğru olduğundan ve BaseLinker hesabınızın aktif olduğundan emin olun.

**S: Ayarlar nerede saklanıyor?**
C: Tüm ayarlar PostgreSQL veritabanında, tenant bazlı olarak saklanır. Hassas veriler şifrelenmiş olarak tutulur.

**S: Birden fazla e-posta hesabı kullanabilir miyim?**
C: Şu an için her tenant tek bir SMTP yapılandırması kullanabilir. Gelecek sürümlerde çoklu hesap desteği eklenecek.