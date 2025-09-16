"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import { useToast } from "../../../components/ui/toast";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function CreateUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER',
    tenantId: ''
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadTenants = async () => {
    try {
      const r = await api('/tenants');
      if (r.ok) {
        const data = await r.json();
        setTenants(data?.data || []);
        if (data?.data?.length > 0) {
          setFormData(prev => ({ ...prev, tenantId: data.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const validateForm = () => {
    if (!formData.email) {
      showError('Validation Error', 'Email is required');
      return false;
    }
    if (!formData.password) {
      showError('Validation Error', 'Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      showError('Validation Error', 'Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showError('Validation Error', 'Passwords do not match');
      return false;
    }
    if (!formData.tenantId) {
      showError('Validation Error', 'Please select a tenant');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const r = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          tenantId: formData.tenantId
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      showSuccess('Success', 'User created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/users');
      }, 1500);
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadTenants();
    } else {
      router.push('/dashboard');
    }
  }, [user]);

  const roleOptions = [
    { value: 'ADMIN', label: 'Admin', description: 'Full system access', disabled: user?.role !== 'ADMIN' },
    { value: 'CUSTOMER', label: 'Customer', description: 'Limited access to own data', disabled: false }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Creating user...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 animate-fade-in">
          <button
            onClick={() => router.push('/users')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="mobile-heading text-foreground">Create New User</h1>
            <p className="text-muted-foreground mobile-text">
              Add a new user to the system
            </p>
          </div>
        </div>


        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border animate-slide-up">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                    placeholder="user@example.com"
                    autoComplete="email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be used for login and notifications
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must be at least 8 characters long
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Role
                  </label>
                  <div className="space-y-3">
                    {roleOptions.map(option => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          formData.role === option.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent/50'
                        } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={formData.role === option.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                          disabled={option.disabled}
                          className="w-4 h-4 text-primary bg-input border-border focus:ring-primary mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                        <div className="text-2xl">
                          {option.value === 'ADMIN' ? '👑' : '👤'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tenant */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tenant
                  </label>
                  <select
                    value={formData.tenantId}
                    onChange={(e) => setFormData(prev => ({ ...prev, tenantId: e.target.value }))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                    required
                  >
                    <option value="">Select a tenant</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.slug})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The tenant this user will belong to
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="spinner w-4 h-4"></div>
                        <span>Creating User...</span>
                      </div>
                    ) : (
                      'Create User'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/users')}
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
  );
}
