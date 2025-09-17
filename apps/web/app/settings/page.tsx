'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import ProtectedRoute from "@/components/ProtectedRoute";

interface Settings {
  [key: string]: string | boolean | number;
}

interface SettingsResponse {
  [key: string]: Settings;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    company_name: '',
    support_email: '',
    timezone: 'Europe/Istanbul',
    date_format: 'DD/MM/YYYY',
    currency: 'TRY',
  });

  const [emailSettings, setEmailSettings] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_secure: 'true',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: 'true',
    order_notifications: 'true',
    product_notifications: 'true',
    system_notifications: 'true',
  });

  const [securitySettings, setSecuritySettings] = useState({
    session_timeout: '30',
    max_login_attempts: '5',
    password_min_length: '8',
    require_2fa: 'false',
    auto_logout: 'true',
  });

  const [woocommerceSettings, setWooCommerceSettings] = useState({
    default_woo_version: 'v3',
    sync_interval: '15',
    webhook_timeout: '30',
    retry_attempts: '3',
    enable_auto_sync: 'true',
    auto_create_products: 'true',
    auto_update_products: 'true',
    sync_categories: 'true',
    sync_customers: 'true',
  });

  const [securitySettings, setSecuritySettings] = useState({
    session_timeout: '30',
    max_login_attempts: '5',
    password_min_length: '8',
    require_2fa: 'false',
    auto_logout: 'true',
  });

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'woocommerce', name: 'WooCommerce', icon: '🛒' },
  ];

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      router.push('/login');
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [generalRes, emailRes, notificationRes, woocommerceRes, securityRes] = await Promise.all([
        fetch('/api/settings/general', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/settings/email', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/settings/notification', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/settings/woocommerce', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/settings/security', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
      ]);

      const general = generalRes.ok ? await generalRes.json() : {};
      const email = emailRes.ok ? await emailRes.json() : {};
      const notification = notificationRes.ok ? await notificationRes.json() : {};
      const woocommerce = woocommerceRes.ok ? await woocommerceRes.json() : {};
      const security = securityRes.ok ? await securityRes.json() : {};

      setSettings({ general, email, notification, woocommerce, security });
      
      // Set form states
      if (general) setGeneralSettings(prev => ({ ...prev, ...general }));
      if (email) setEmailSettings(prev => ({ ...prev, ...email }));
      if (notification) setNotificationSettings(prev => ({ ...prev, ...notification }));
      if (woocommerce) setWooCommerceSettings(prev => ({ ...prev, ...woocommerce }));
      if (security) setSecuritySettings(prev => ({ ...prev, ...security }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (category: string, data: any) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/settings/${category}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setSuccess(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`);
        await loadSettings();
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to save ${category} settings`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${category} settings`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service: string) => {
    try {
      setTesting(service);
      setError(null);
      
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ service })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Test connection failed');
      }

      const result = await response.json();
      
      if (result.connected) {
        setSuccess(`✅ ${service.charAt(0).toUpperCase() + service.slice(1)} connection test successful!`);
      } else {
        setError(`❌ ${service.charAt(0).toUpperCase() + service.slice(1)} connection test failed: ${result.message}`);
      }
    } catch (err) {
      setError(`❌ ${service} connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleGeneralSave = () => saveSettings('general', generalSettings);
  const handleEmailSave = () => saveSettings('email', emailSettings);
  const handleNotificationSave = () => saveSettings('notification', notificationSettings);
  const handleWooCommerceSave = () => saveSettings('woocommerce', woocommerceSettings);
  const handleSecuritySave = () => saveSettings('security', securitySettings);

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="mobile-heading text-foreground">Settings</h1>
          <p className="text-muted-foreground mobile-text">
            Configure your application settings and preferences
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card rounded-lg border border-border animate-slide-up">
          <div className="flex flex-wrap border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">General Settings</h3>
                  <p className="text-sm text-muted-foreground">Basic application configuration</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
                    <input
                      value={generalSettings.company_name}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Support Email</label>
                    <input
                      type="email"
                      value={generalSettings.support_email}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, support_email: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="support@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                    <select
                      value={generalSettings.timezone}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="Europe/Istanbul">Europe/Istanbul</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Date Format</label>
                    <select
                      value={generalSettings.date_format}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, date_format: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                    <select
                      value={generalSettings.currency}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="TRY">TRY - Turkish Lira</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleGeneralSave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {saving ? 'Saving...' : 'Save General Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeTab === 'email' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Email Settings</h3>
                    <p className="text-sm text-muted-foreground">SMTP configuration for email notifications</p>
                  </div>
                  <button
                    onClick={() => testConnection('email')}
                    disabled={testing === 'email'}
                    className="px-3 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing === 'email' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">SMTP Host</label>
                    <input
                      value={emailSettings.smtp_host}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">SMTP Port</label>
                    <input
                      type="number"
                      value={emailSettings.smtp_port}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">SMTP Username</label>
                    <input
                      value={emailSettings.smtp_user}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_user: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">SMTP Password</label>
                    <input
                      type="password"
                      value={emailSettings.smtp_pass}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_pass: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">From Email</label>
                    <input
                      type="email"
                      value={emailSettings.smtp_from}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_from: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="noreply@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Use TLS/SSL</label>
                    <select
                      value={emailSettings.smtp_secure}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_secure: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleEmailSave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {saving ? 'Saving...' : 'Save Email Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Notification Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure notification preferences for different events</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-foreground mb-3">Email Notifications</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.email_notifications === 'true'}
                          onChange={(e) => setNotificationSettings(prev => ({ 
                            ...prev, 
                            email_notifications: e.target.checked ? 'true' : 'false' 
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Enable Email Notifications</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.order_notifications === 'true'}
                          onChange={(e) => setNotificationSettings(prev => ({ 
                            ...prev, 
                            order_notifications: e.target.checked ? 'true' : 'false' 
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Order Updates</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.product_notifications === 'true'}
                          onChange={(e) => setNotificationSettings(prev => ({ 
                            ...prev, 
                            product_notifications: e.target.checked ? 'true' : 'false' 
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Product Changes</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.system_notifications === 'true'}
                          onChange={(e) => setNotificationSettings(prev => ({ 
                            ...prev, 
                            system_notifications: e.target.checked ? 'true' : 'false' 
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-foreground">System Alerts</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleNotificationSave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {saving ? 'Saving...' : 'Save Notification Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Security Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure security policies and authentication</p>
                </div>

                <div className="space-y-6">
                  {/* Session & Authentication */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-foreground mb-3">Session & Authentication</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
                        <input
                          type="number"
                          value={securitySettings.session_timeout}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, session_timeout: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                          min="5"
                          max="480"
                        />
                        <p className="text-xs text-muted-foreground mt-1">How long before session expires (5-480 minutes)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Max Login Attempts</label>
                        <input
                          type="number"
                          value={securitySettings.max_login_attempts}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, max_login_attempts: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                          min="3"
                          max="10"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Maximum failed login attempts before lockout</p>
                      </div>
                    </div>
                  </div>

                  {/* Password Policy */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-foreground mb-3">Password Policy</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Password Min Length</label>
                        <input
                          type="number"
                          value={securitySettings.password_min_length}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, password_min_length: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                          min="6"
                          max="32"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Minimum password length (6-32 characters)</p>
                      </div>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-foreground mb-3">Security Features</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={securitySettings.require_2fa === 'true'}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            require_2fa: e.target.checked ? 'true' : 'false' 
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">Require 2FA</span>
                          <p className="text-xs text-muted-foreground">Force all users to enable two-factor authentication</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={securitySettings.auto_logout === 'true'}
                          onChange={(e) => setSecuritySettings(prev => ({ 
                            ...prev, 
                            auto_logout: e.target.checked ? 'true' : 'false' 
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <div>
                          <span className="text-sm font-medium text-foreground">Auto Logout on Inactivity</span>
                          <p className="text-xs text-muted-foreground">Automatically log out users after period of inactivity</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSecuritySave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {saving ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </div>
              </div>
            )}

            {/* WooCommerce Settings */}
            {activeTab === 'woocommerce' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">WooCommerce Integration</h3>
                  <p className="text-sm text-muted-foreground">Configure WooCommerce synchronization and API settings</p>
                </div>

                <div className="space-y-6">
                  {/* API Configuration */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-foreground mb-3">API Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Default WooCommerce API Version</label>
                        <select
                          value={woocommerceSettings.default_woo_version}
                          onChange={(e) => setWooCommerceSettings(prev => ({ ...prev, default_woo_version: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        >
                          <option value="v3">v3 (Recommended)</option>
                          <option value="v2">v2</option>
                          <option value="v1">v1</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Webhook Timeout (seconds)</label>
                        <input
                          type="number"
                          value={woocommerceSettings.webhook_timeout}
                          onChange={(e) => setWooCommerceSettings(prev => ({ ...prev, webhook_timeout: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                          min="5"
                          max="300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Retry Attempts</label>
                        <input
                          type="number"
                          value={woocommerceSettings.retry_attempts}
                          onChange={(e) => setWooCommerceSettings(prev => ({ ...prev, retry_attempts: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sync Configuration */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-foreground mb-3">Synchronization Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Sync Interval (minutes)</label>
                        <input
                          type="number"
                          value={woocommerceSettings.sync_interval}
                          onChange={(e) => setWooCommerceSettings(prev => ({ ...prev, sync_interval: e.target.value }))}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                          min="5"
                          max="1440"
                        />
                        <p className="text-xs text-muted-foreground mt-1">How often to sync data with WooCommerce (5-1440 minutes)</p>
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={woocommerceSettings.enable_auto_sync === 'true'}
                            onChange={(e) => setWooCommerceSettings(prev => ({ 
                              ...prev, 
                              enable_auto_sync: e.target.checked ? 'true' : 'false' 
                            }))}
                            className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-foreground">Enable Automatic Synchronization</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={woocommerceSettings.auto_create_products === 'true'}
                            onChange={(e) => setWooCommerceSettings(prev => ({ 
                              ...prev, 
                              auto_create_products: e.target.checked ? 'true' : 'false' 
                            }))}
                            className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-foreground">Auto Create New Products</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={woocommerceSettings.auto_update_products === 'true'}
                            onChange={(e) => setWooCommerceSettings(prev => ({ 
                              ...prev, 
                              auto_update_products: e.target.checked ? 'true' : 'false' 
                            }))}
                            className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-foreground">Auto Update Existing Products</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={woocommerceSettings.sync_categories === 'true'}
                            onChange={(e) => setWooCommerceSettings(prev => ({ 
                              ...prev, 
                              sync_categories: e.target.checked ? 'true' : 'false' 
                            }))}
                            className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-foreground">Sync Product Categories</span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={woocommerceSettings.sync_customers === 'true'}
                            onChange={(e) => setWooCommerceSettings(prev => ({ 
                              ...prev, 
                              sync_customers: e.target.checked ? 'true' : 'false' 
                            }))}
                            className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-foreground">Sync Customer Data</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleWooCommerceSave}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {saving ? 'Saving...' : 'Save WooCommerce Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  </ProtectedRoute>
);
}