"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { logger } from "@/lib/logger";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [profile, setProfile] = useState({
    personal: {
      firstName: "John",
      lastName: "Doe",
      email: user?.email || "",
      phone: "+90 555 123 4567",
      avatar: "",
      bio: "",
    },
    security: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      twoFactorEnabled: user?.twofaEnabled || false,
    },
    preferences: {
      language: "tr",
      timezone: "Europe/Istanbul",
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showPhone: false,
      },
    },
  });

  const tabs = [
    { id: "personal", label: "Kişisel Bilgiler", icon: "👤" },
    { id: "security", label: "Güvenlik", icon: "🔒" },
    { id: "preferences", label: "Tercihler", icon: "⚙️" },
  ];

  const handleSave = (section: string) => {
    logger.info(`Saving ${section} profile:`, profile[section as keyof typeof profile]);
    // API call to save profile
  };

  const handlePasswordChange = () => {
    if (profile.security.newPassword !== profile.security.confirmPassword) {
      logger.error("Yeni şifreler eşleşmiyor!");
      return;
    }
    if (profile.security.newPassword.length < 8) {
      logger.error("Şifre en az 8 karakter olmalı!");
      return;
    }
    logger.info("Changing password...");
    // API call to change password
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Profile</h1>
              <p className="text-muted-foreground mobile-text">
                Manage your personal information and account settings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Profile Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-card p-4 rounded-lg border border-border">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Profile Content */}
            <div className="lg:col-span-3">
              <div className="bg-card p-6 rounded-lg border border-border">
                {/* Personal Information */}
                {activeTab === "personal" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Kişisel Bilgiler</h2>
                    
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                        {profile.personal.avatar ? (
                          <img
                            src={profile.personal.avatar}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl text-primary-foreground font-bold">
                            {profile.personal.firstName.charAt(0)}{profile.personal.lastName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <button className="btn btn-outline btn-sm">Fotoğraf Değiştir</button>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPG, PNG veya GIF (max 2MB)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="form-label">Ad</label>
                        <input
                          type="text"
                          value={profile.personal.firstName}
                          onChange={(e) => setProfile({
                            ...profile,
                            personal: { ...profile.personal, firstName: e.target.value }
                          })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">Soyad</label>
                        <input
                          type="text"
                          value={profile.personal.lastName}
                          onChange={(e) => setProfile({
                            ...profile,
                            personal: { ...profile.personal, lastName: e.target.value }
                          })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">E-posta</label>
                        <input
                          type="email"
                          value={profile.personal.email}
                          onChange={(e) => setProfile({
                            ...profile,
                            personal: { ...profile.personal, email: e.target.value }
                          })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">Telefon</label>
                        <input
                          type="tel"
                          value={profile.personal.phone}
                          onChange={(e) => setProfile({
                            ...profile,
                            personal: { ...profile.personal, phone: e.target.value }
                          })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Hakkında</label>
                      <textarea
                        value={profile.personal.bio}
                        onChange={(e) => setProfile({
                          ...profile,
                          personal: { ...profile.personal, bio: e.target.value }
                        })}
                        className="form-textarea"
                        rows={4}
                        placeholder="Kendiniz hakkında kısa bir açıklama yazın..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("personal")}
                        className="btn btn-primary"
                      >
                        Kaydet
                      </button>
                      <button className="btn btn-outline">
                        İptal
                      </button>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Güvenlik</h2>
                    
                    <div className="space-y-6">
                      {/* Password Change */}
                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Şifre Değiştir</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="form-label">Mevcut Şifre</label>
                            <input
                              type="password"
                              value={profile.security.currentPassword}
                              onChange={(e) => setProfile({
                                ...profile,
                                security: { ...profile.security, currentPassword: e.target.value }
                              })}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">Yeni Şifre</label>
                            <input
                              type="password"
                              value={profile.security.newPassword}
                              onChange={(e) => setProfile({
                                ...profile,
                                security: { ...profile.security, newPassword: e.target.value }
                              })}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">Yeni Şifre Tekrar</label>
                            <input
                              type="password"
                              value={profile.security.confirmPassword}
                              onChange={(e) => setProfile({
                                ...profile,
                                security: { ...profile.security, confirmPassword: e.target.value }
                              })}
                              className="form-input"
                            />
                          </div>
                          <button
                            onClick={handlePasswordChange}
                            className="btn btn-primary"
                          >
                            Şifre Değiştir
                          </button>
                        </div>
                      </div>

                      {/* Two Factor Authentication */}
                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">İki Faktörlü Kimlik Doğrulama</h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">2FA Durumu</p>
                            <p className="text-sm text-muted-foreground">
                              {profile.security.twoFactorEnabled ? "Etkin" : "Devre dışı"}
                            </p>
                          </div>
                          <button
                            onClick={() => setProfile({
                              ...profile,
                              security: { ...profile.security, twoFactorEnabled: !profile.security.twoFactorEnabled }
                            })}
                            className={`btn ${profile.security.twoFactorEnabled ? 'btn-destructive' : 'btn-primary'}`}
                          >
                            {profile.security.twoFactorEnabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                          </button>
                        </div>
                      </div>

                      {/* Login History */}
                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Giriş Geçmişi</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <div>
                              <p className="font-medium">Mevcut Oturum</p>
                              <p className="text-sm text-muted-foreground">Chrome • Windows • İstanbul</p>
                            </div>
                            <span className="text-green-600 text-sm">Aktif</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <div>
                              <p className="font-medium">Mobil Uygulama</p>
                              <p className="text-sm text-muted-foreground">iOS • iPhone • 2 saat önce</p>
                            </div>
                            <button className="btn btn-sm btn-outline">Sonlandır</button>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <div>
                              <p className="font-medium">Chrome</p>
                              <p className="text-sm text-muted-foreground">Windows • 1 gün önce</p>
                            </div>
                            <button className="btn btn-sm btn-outline">Sonlandır</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences */}
                {activeTab === "preferences" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Tercihler</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Dil ve Bölge</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Dil</label>
                            <select
                              value={profile.preferences.language}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: { ...profile.preferences, language: e.target.value }
                              })}
                              className="form-select"
                            >
                              <option value="tr">Türkçe</option>
                              <option value="en">English</option>
                            </select>
                          </div>
                          <div>
                            <label className="form-label">Saat Dilimi</label>
                            <select
                              value={profile.preferences.timezone}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: { ...profile.preferences, timezone: e.target.value }
                              })}
                              className="form-select"
                            >
                              <option value="Europe/Istanbul">Europe/Istanbul</option>
                              <option value="Europe/London">Europe/London</option>
                              <option value="America/New_York">America/New_York</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Bildirimler</h3>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={profile.preferences.notifications.email}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  notifications: { ...profile.preferences.notifications, email: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>E-posta bildirimleri</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={profile.preferences.notifications.push}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  notifications: { ...profile.preferences.notifications, push: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>Push bildirimleri</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={profile.preferences.notifications.sms}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  notifications: { ...profile.preferences.notifications, sms: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>SMS bildirimleri</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Gizlilik</h3>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={profile.preferences.privacy.profileVisible}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  privacy: { ...profile.preferences.privacy, profileVisible: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>Profilimi herkese görünür yap</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={profile.preferences.privacy.showEmail}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  privacy: { ...profile.preferences.privacy, showEmail: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>E-posta adresimi göster</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={profile.preferences.privacy.showPhone}
                              onChange={(e) => setProfile({
                                ...profile,
                                preferences: {
                                  ...profile.preferences,
                                  privacy: { ...profile.preferences.privacy, showPhone: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>Telefon numaramı göster</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave("preferences")}
                        className="btn btn-primary"
                      >
                        Kaydet
                      </button>
                      <button className="btn btn-outline">
                        İptal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}