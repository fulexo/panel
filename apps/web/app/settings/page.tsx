"use client";

import { logger } from "@/lib/logger";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Settings, Shield, Link, Palette } from 'lucide-react';
import { SectionShell } from "@/components/patterns/SectionShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  useAuth();
  useRBAC();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    general: {
      siteName: "Fulexo Panel",
      timezone: "Europe/Istanbul",
      language: "tr",
      dateFormat: "DD/MM/YYYY",
      currency: "EUR",
      notifications: true,
      emailNotifications: true,
      smsNotifications: false,
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAttempts: 5,
      ipWhitelist: "",
    },
    integrations: {
      woocommerce: {
        enabled: true,
        autoSync: true,
        syncInterval: 15,
      },
      email: {
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: "",
      },
    },
    appearance: {
      theme: "dark",
      sidebarCollapsed: false,
      compactMode: false,
      showAnimations: true,
    },
  });

  const tabs = [
    { id: "general", label: "Genel Ayarlar", icon: Settings },
    { id: "security", label: "Güvenlik", icon: Shield },
    { id: "integrations", label: "Entegrasyonlar", icon: Link },
    { id: "appearance", label: "Görünüm", icon: Palette },
  ];

  const handleSave = (section: string) => {
    logger.info(`Saving ${section} settings:`, settings[section as keyof typeof settings]);
    // API call to save settings
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Settings</h1>
              <p className="text-muted-foreground mobile-text">
                Manage your account settings and preferences
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <SectionShell
                title="Settings Navigation"
                description="Manage your application settings"
              >
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon as React.ComponentType<{ className?: string }>;
                    return (
                      <Button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        variant={activeTab === tab.id ? "outline" : "ghost"}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors justify-start",
                          activeTab === tab.id
                            ? "bg-background text-foreground"
                            : "hover:bg-accent text-foreground"
                        )}
                      >
                        <IconComponent className="w-5 h-5" />
                        <span className="font-medium">{tab.label}</span>
                      </Button>
                    );
                  })}
                </nav>
              </SectionShell>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <SectionShell
                title="Settings Content"
                description="Configure your application settings"
              >
                {/* General Settings */}
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Genel Ayarlar</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="form-label">Site Adı</label>
                        <input
                          type="text"
                          value={settings.general.siteName}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, siteName: e.target.value }
                          })}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">Saat Dilimi</label>
                        <select
                          value={settings.general.timezone}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, timezone: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="Europe/Istanbul">Europe/Istanbul</option>
                          <option value="Europe/London">Europe/London</option>
                          <option value="America/New_York">America/New_York</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Dil</label>
                        <select
                          value={settings.general.language}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, language: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="tr">Türkçe</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Para Birimi</label>
                        <select
                          value={settings.general.currency}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, currency: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="EUR">€ EUR</option>
                          <option value="USD">$ USD</option>
                          <option value="TRY">TRY</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Bildirimler</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.general.notifications}
                            onChange={(e) => setSettings({
                              ...settings,
                              general: { ...settings.general, notifications: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>Bildirimleri etkinleştir</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.general.emailNotifications}
                            onChange={(e) => setSettings({
                              ...settings,
                              general: { ...settings.general, emailNotifications: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>E-posta bildirimleri</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.general.smsNotifications}
                            onChange={(e) => setSettings({
                              ...settings,
                              general: { ...settings.general, smsNotifications: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>SMS bildirimleri</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave("general")}
                        variant="outline"
                      >
                        Kaydet
                      </Button>
                      <Button variant="outline">
                        Sıfırla
                      </Button>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Güvenlik Ayarları</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">İki Faktörlü Kimlik Doğrulama</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.security.twoFactorAuth}
                            onChange={(e) => setSettings({
                              ...settings,
                              security: { ...settings.security, twoFactorAuth: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>2FA'yı etkinleştir</span>
                          {settings.security.twoFactorAuth && (
                            <span className="text-foreground text-sm">✓ Etkin</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Oturum Zaman Aşımı (dakika)</label>
                        <input
                          type="number"
                          value={settings.security.sessionTimeout}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                          })}
                          className="form-input w-32"
                        />
                      </div>

                      <div>
                        <label className="form-label">Şifre Geçerlilik Süresi (gün)</label>
                        <input
                          type="number"
                          value={settings.security.passwordExpiry}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, passwordExpiry: parseInt(e.target.value) }
                          })}
                          className="form-input w-32"
                        />
                      </div>

                      <div>
                        <label className="form-label">Maksimum Giriş Denemesi</label>
                        <input
                          type="number"
                          value={settings.security.loginAttempts}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, loginAttempts: parseInt(e.target.value) }
                          })}
                          className="form-input w-32"
                        />
                      </div>

                      <div>
                        <label className="form-label">IP Beyaz Liste (virgülle ayırın)</label>
                        <textarea
                          value={settings.security.ipWhitelist}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, ipWhitelist: e.target.value }
                          })}
                          className="form-textarea"
                          rows={3}
                          placeholder="192.168.1.1, 10.0.0.1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave("security")}
                        variant="outline"
                      >
                        Kaydet
                      </Button>
                      <Button variant="outline">
                        Sıfırla
                      </Button>
                    </div>
                  </div>
                )}

                {/* Integrations Settings */}
                {activeTab === "integrations" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Entegrasyonlar</h2>
                    
                    <div className="space-y-6">
                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">WooCommerce</h3>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={settings.integrations.woocommerce.enabled}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  woocommerce: { ...settings.integrations.woocommerce, enabled: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>WooCommerce entegrasyonunu etkinleştir</span>
                          </label>
                          <label className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={settings.integrations.woocommerce.autoSync}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  woocommerce: { ...settings.integrations.woocommerce, autoSync: e.target.checked }
                                }
                              })}
                              className="form-checkbox"
                            />
                            <span>Otomatik senkronizasyon</span>
                          </label>
                          <div>
                            <label className="form-label">Senkronizasyon Aralığı (dakika)</label>
                            <input
                              type="number"
                              value={settings.integrations.woocommerce.syncInterval}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  woocommerce: { ...settings.integrations.woocommerce, syncInterval: parseInt(e.target.value) }
                                }
                              })}
                              className="form-input w-32"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-foreground mb-4">E-posta SMTP</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">SMTP Host</label>
                            <input
                              type="text"
                              value={settings.integrations.email.smtpHost}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  email: { ...settings.integrations.email, smtpHost: e.target.value }
                                }
                              })}
                              className="form-input"
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div>
                            <label className="form-label">SMTP Port</label>
                            <input
                              type="number"
                              value={settings.integrations.email.smtpPort}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  email: { ...settings.integrations.email, smtpPort: parseInt(e.target.value) }
                                }
                              })}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">SMTP Kullanıcı</label>
                            <input
                              type="text"
                              value={settings.integrations.email.smtpUser}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  email: { ...settings.integrations.email, smtpUser: e.target.value }
                                }
                              })}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="form-label">SMTP Şifre</label>
                            <input
                              type="password"
                              value={settings.integrations.email.smtpPass}
                              onChange={(e) => setSettings({
                                ...settings,
                                integrations: {
                                  ...settings.integrations,
                                  email: { ...settings.integrations.email, smtpPass: e.target.value }
                                }
                              })}
                              className="form-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave("integrations")}
                        variant="outline"
                      >
                        Kaydet
                      </Button>
                      <Button variant="outline">
                        Sıfırla
                      </Button>
                    </div>
                  </div>
                )}

                {/* Appearance Settings */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Görünüm Ayarları</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Tema</label>
                        <select
                          value={settings.appearance.theme}
                          onChange={(e) => setSettings({
                            ...settings,
                            appearance: { ...settings.appearance, theme: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="light">Açık</option>
                          <option value="dark">Koyu</option>
                          <option value="system">Sistem</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.appearance.sidebarCollapsed}
                            onChange={(e) => setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, sidebarCollapsed: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>Sidebar'ı varsayılan olarak daralt</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.appearance.compactMode}
                            onChange={(e) => setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, compactMode: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>Kompakt mod</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={settings.appearance.showAnimations}
                            onChange={(e) => setSettings({
                              ...settings,
                              appearance: { ...settings.appearance, showAnimations: e.target.checked }
                            })}
                            className="form-checkbox"
                          />
                          <span>Animasyonları göster</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave("appearance")}
                        variant="outline"
                      >
                        Kaydet
                      </Button>
                      <Button variant="outline">
                        Sıfırla
                      </Button>
                    </div>
                  </div>
                )}
              </SectionShell>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
