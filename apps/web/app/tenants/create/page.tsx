"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CreateTenantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    settings: {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      theme: 'dark',
      notifications: true,
      analytics: true,
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Tenant name is required');
      return false;
    }
    if (!formData.slug.trim()) {
      setError('Tenant slug is required');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }
    if (formData.domain && !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      setError('Please enter a valid domain');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const r = await api('/tenants', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create tenant');
      }

      setSuccess('Tenant created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/tenants');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user]);

  if (loading && !error) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Creating tenant...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 animate-fade-in">
          <button
            onClick={() => router.push('/tenants')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="mobile-heading text-foreground">Create New Tenant</h1>
            <p className="text-muted-foreground mobile-text">
              Add a new tenant to the system
            </p>
          </div>
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

        {/* Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg border border-border animate-slide-up">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tenant Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                        placeholder="My Company"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The display name for this tenant
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Slug *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                        placeholder="my-company"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        URL-friendly identifier (auto-generated from name)
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Domain (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                      className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                      placeholder="example.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Custom domain for this tenant (optional)
                    </p>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground">Default Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.settings.timezone}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, timezone: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Asia/Shanghai">Shanghai</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.settings.currency}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, currency: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="CHF">CHF - Swiss Franc</option>
                        <option value="CNY">CNY - Chinese Yuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Language
                      </label>
                      <select
                        value={formData.settings.language}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, language: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ru">Russian</option>
                        <option value="ja">Japanese</option>
                        <option value="ko">Korean</option>
                        <option value="zh">Chinese</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Theme
                      </label>
                      <select
                        value={formData.settings.theme}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, theme: e.target.value }
                        }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-foreground">Features</h4>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.settings.notifications}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            settings: { ...prev.settings, notifications: e.target.checked }
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Enable Notifications</span>
                      </label>
                      
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.settings.analytics}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            settings: { ...prev.settings, analytics: e.target.checked }
                          }))}
                          className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Enable Analytics</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="spinner w-4 h-4"></div>
                        <span>Creating Tenant...</span>
                      </div>
                    ) : (
                      'Create Tenant'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/tenants')}
                    className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      </div>
    </ProtectedRoute>
  );
}