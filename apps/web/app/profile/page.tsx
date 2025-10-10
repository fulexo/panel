"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User, Shield, Settings } from 'lucide-react';
import { logger } from "@/lib/logger";
import { SectionShell } from "@/components/patterns/SectionShell";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormCheckbox } from "@/components/forms/FormCheckbox";

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
    { id: "personal", label: "Kişisel Bilgiler", icon: User },
    { id: "security", label: "Güvenlik", icon: Shield },
    { id: "preferences", label: "Tercihler", icon: Settings },
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
              <SectionShell
                title="Profile Settings"
                description="Manage your account settings"
              >
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon as React.ComponentType<{ className?: string }>;
                    return (
                      <Button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        variant={activeTab === tab.id ? "outline" : "ghost"}
                        className="w-full justify-start"
                      >
                        <IconComponent className="w-5 h-5 mr-3" />
                        <span className="font-medium">{tab.label}</span>
                      </Button>
                    );
                  })}
                </nav>
              </SectionShell>
            </div>

            {/* Profile Content */}
            <div className="lg:col-span-3">
              <SectionShell
                title="Profile Information"
                description="Manage your personal and account information"
              >
                {/* Personal Information */}
                {activeTab === "personal" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Kişisel Bilgiler</h2>
                    
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-foreground rounded-full flex items-center justify-center">
                        {profile.personal.avatar ? (
                          <img
                            src={profile.personal.avatar}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl text-background font-bold">
                            {profile.personal.firstName.charAt(0)}{profile.personal.lastName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <Button variant="outline" size="sm">Fotoğraf Değiştir</Button>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPG, PNG veya GIF (max 2MB)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        label="Ad"
                        type="text"
                        value={profile.personal.firstName}
                        onChange={(e) => setProfile({
                          ...profile,
                          personal: { ...profile.personal, firstName: e.target.value }
                        })}
                      />
                      <FormField
                        label="Soyad"
                        type="text"
                        value={profile.personal.lastName}
                        onChange={(e) => setProfile({
                          ...profile,
                          personal: { ...profile.personal, lastName: e.target.value }
                        })}
                      />
                      <FormField
                        label="E-posta"
                        type="email"
                        value={profile.personal.email}
                        onChange={(e) => setProfile({
                          ...profile,
                          personal: { ...profile.personal, email: e.target.value }
                        })}
                      />
                      <FormField
                        label="Telefon"
                        type="tel"
                        value={profile.personal.phone}
                        onChange={(e) => setProfile({
                          ...profile,
                          personal: { ...profile.personal, phone: e.target.value }
                        })}
                      />
                    </div>

                    <FormField
                      label="Hakkında"
                      type="textarea"
                      value={profile.personal.bio}
                      onChange={(e) => setProfile({
                        ...profile,
                        personal: { ...profile.personal, bio: e.target.value }
                      })}
                      placeholder="Kendiniz hakkında kısa bir açıklama yazın..."
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave("personal")}
                        variant="outline"
                      >
                        Kaydet
                      </Button>
                      <Button variant="outline">
                        İptal
                      </Button>
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
                          <FormField
                            label="Mevcut Şifre"
                            type="password"
                            value={profile.security.currentPassword}
                            onChange={(e) => setProfile({
                              ...profile,
                              security: { ...profile.security, currentPassword: e.target.value }
                            })}
                          />
                          <FormField
                            label="Yeni Şifre"
                            type="password"
                            value={profile.security.newPassword}
                            onChange={(e) => setProfile({
                              ...profile,
                              security: { ...profile.security, newPassword: e.target.value }
                            })}
                          />
                          <FormField
                            label="Yeni Şifre Tekrar"
                            type="password"
                            value={profile.security.confirmPassword}
                            onChange={(e) => setProfile({
                              ...profile,
                              security: { ...profile.security, confirmPassword: e.target.value }
                            })}
                          />
                          <Button
                            onClick={handlePasswordChange}
                            variant="outline"
                          >
                            Şifre Değiştir
                          </Button>
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
                          <Button
                            onClick={() => setProfile({
                              ...profile,
                              security: { ...profile.security, twoFactorEnabled: !profile.security.twoFactorEnabled }
                            })}
                            variant={profile.security.twoFactorEnabled ? "outline" : "outline"}
                          >
                            {profile.security.twoFactorEnabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                          </Button>
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
                            <span className="text-foreground text-sm">Aktif</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border">
                            <div>
                              <p className="font-medium">Mobil Uygulama</p>
                              <p className="text-sm text-muted-foreground">iOS • iPhone • 2 saat önce</p>
                            </div>
                            <Button variant="outline" size="sm">Sonlandır</Button>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <div>
                              <p className="font-medium">Chrome</p>
                              <p className="text-sm text-muted-foreground">Windows • 1 gün önce</p>
                            </div>
                            <Button variant="outline" size="sm">Sonlandır</Button>
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
                          <FormSelect
                            label="Dil"
                            value={profile.preferences.language}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, language: e.target.value }
                            })}
                            options={[
                              { value: "tr", label: "Türkçe" },
                              { value: "en", label: "English" }
                            ]}
                          />
                          <FormSelect
                            label="Saat Dilimi"
                            value={profile.preferences.timezone}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, timezone: e.target.value }
                            })}
                            options={[
                              { value: "Europe/Istanbul", label: "Europe/Istanbul" },
                              { value: "Europe/London", label: "Europe/London" },
                              { value: "America/New_York", label: "America/New_York" }
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Bildirimler</h3>
                        <div className="space-y-3">
                          <FormCheckbox
                            checked={profile.preferences.notifications.email}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: {
                                ...profile.preferences,
                                notifications: { ...profile.preferences.notifications, email: e.target.checked }
                              }
                            })}
                            label="E-posta bildirimleri"
                          />
                          <FormCheckbox
                            checked={profile.preferences.notifications.push}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: {
                                ...profile.preferences,
                                notifications: { ...profile.preferences.notifications, push: e.target.checked }
                              }
                            })}
                            label="Push bildirimleri"
                          />
                          <FormCheckbox
                            checked={profile.preferences.notifications.sms}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: {
                                ...profile.preferences,
                                notifications: { ...profile.preferences.notifications, sms: e.target.checked }
                              }
                            })}
                            label="SMS bildirimleri"
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Gizlilik</h3>
                        <div className="space-y-3">
                          <FormCheckbox
                            checked={profile.preferences.privacy.profileVisible}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: {
                                ...profile.preferences,
                                privacy: { ...profile.preferences.privacy, profileVisible: e.target.checked }
                              }
                            })}
                            label="Profilimi herkese görünür yap"
                          />
                          <FormCheckbox
                            checked={profile.preferences.privacy.showEmail}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: {
                                ...profile.preferences,
                                privacy: { ...profile.preferences.privacy, showEmail: e.target.checked }
                              }
                            })}
                            label="E-posta adresimi göster"
                          />
                          <FormCheckbox
                            checked={profile.preferences.privacy.showPhone}
                            onChange={(e) => setProfile({
                              ...profile,
                              preferences: {
                                ...profile.preferences,
                                privacy: { ...profile.preferences.privacy, showPhone: e.target.checked }
                              }
                            })}
                            label="Telefon numaramı göster"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave("preferences")}
                        variant="outline"
                      >
                        Kaydet
                      </Button>
                      <Button variant="outline">
                        İptal
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