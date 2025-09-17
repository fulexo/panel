"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface BillingBatch {
  id: string;
  status: 'created' | 'issued' | 'paid' | 'cancelled';
  total: number;
  periodFrom?: string;
  periodTo?: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    amount: number;
    invoice: {
      id: string;
      number?: string;
      orderId: string;
      currency?: string;
      issuedAt?: string;
    };
  }>;
}

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [batch, setBatch] = useState<BillingBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [invoiceIds, setInvoiceIds] = useState('');

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  const loadBatch = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api(`/billing/batches/${params.id}`);
      if (r.ok) {
        const data = await r.json();
        setBatch(data);
      } else if (r.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to load batch');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      setLoading(false);
    }
  };

  const addInvoices = async () => {
    const ids = invoiceIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/billing/batches/${params.id}/add-invoices`, {
        method: 'POST',
        body: JSON.stringify({ invoiceIds: ids })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to add invoices');
      }

      setSuccess(`${ids.length} invoices added successfully`);
      setShowAddModal(false);
      setInvoiceIds('');
      await loadBatch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm('Bu faturayı batch\'ten çıkarmak istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/billing/batches/${params.id}/items/${itemId}`, { method: 'DELETE' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to remove item');
      }

      setSuccess('Invoice removed successfully');
      await loadBatch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const issueBatch = async () => {
    if (!confirm('Bu batch\'i yayınlamak istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/billing/batches/${params.id}/issue`, { method: 'POST' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to issue batch');
      }

      setSuccess('Batch issued successfully');
      await loadBatch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteBatch = async () => {
    if (!confirm('Bu batch\'i silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/billing/batches/${params.id}`, { method: 'DELETE' });
      
      if (r.ok) {
        setSuccess('Batch deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/billing');
        }, 1500);
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete batch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBatch();
    } else {
      router.push('/login');
    }
  }, [user, params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'issued': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'paid': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created': return '📝';
      case 'issued': return '📤';
      case 'paid': return '✅';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading batch details...</div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Batch Not Found</h2>
          <p className="text-muted-foreground mb-4">The batch you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/billing')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'invoices', name: 'Invoices', icon: '📄' },
    { id: 'export', name: 'Export', icon: '📤' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/billing')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-2xl">{getStatusIcon(batch.status)}</span>
              </div>
              <div>
                <h1 className="mobile-heading text-foreground">
                  Batch {batch.id.slice(0, 8)}...
                </h1>
                <p className="text-muted-foreground mobile-text">
                  {formatCurrency(batch.total)} • {batch.items.length} invoices
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(batch.status)}`}>
              {batch.status.toUpperCase()}
            </span>
            <div className="flex items-center gap-2">
              {batch.status === 'created' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                >
                  Add Invoices
                </button>
              )}
              {batch.status === 'created' && (
                <button
                  onClick={issueBatch}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 btn-animate"
                >
                  Issue Batch
                </button>
              )}
              <button
                onClick={deleteBatch}
                disabled={saving}
                className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
              >
                Delete
              </button>
            </div>
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Batch Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="text-foreground font-mono">{batch.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(batch.status)}`}>
                          {batch.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-foreground font-bold">{formatCurrency(batch.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items:</span>
                        <span className="text-foreground">{batch.items.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Period Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Period</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From:</span>
                        <span className="text-foreground">
                          {batch.periodFrom ? new Date(batch.periodFrom).toLocaleDateString() : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To:</span>
                        <span className="text-foreground">
                          {batch.periodTo ? new Date(batch.periodTo).toLocaleDateString() : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-foreground">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="text-foreground">
                          {new Date(batch.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Batch Invoices</h3>
                  {batch.status === 'created' && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                    >
                      Add Invoices
                    </button>
                  )}
                </div>
                
                {batch.items.length === 0 ? (
                  <div className="bg-accent/20 p-8 rounded-lg text-center">
                    <div className="text-4xl mb-4">📄</div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No invoices in this batch</h4>
                    <p className="text-muted-foreground mb-4">
                      Add invoices to this batch to get started
                    </p>
                    {batch.status === 'created' && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                      >
                        Add Invoices
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batch.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-accent/20 p-4 rounded-lg animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-foreground">
                                Invoice {item.invoice.number || item.invoice.id.slice(0, 8)}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                Order: {item.invoice.orderId}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span>Amount: {formatCurrency(item.amount)}</span>
                              {item.invoice.currency && (
                                <span>Currency: {item.invoice.currency}</span>
                              )}
                              {item.invoice.issuedAt && (
                                <span>
                                  Issued: {new Date(item.invoice.issuedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {batch.status === 'created' && (
                            <button
                              onClick={() => removeItem(item.id)}
                              disabled={saving}
                              className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Export Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-accent/20 p-6 rounded-lg text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h4 className="font-semibold text-foreground mb-2">CSV Export</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Detailed invoice data in CSV format
                    </p>
                    <a
                      href={`/api/billing/batches/${batch.id}/export.csv`}
                      target="_blank"
                      className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors btn-animate"
                    >
                      Download CSV
                    </a>
                  </div>

                  <div className="bg-accent/20 p-6 rounded-lg text-center">
                    <div className="text-4xl mb-4">📄</div>
                    <h4 className="font-semibold text-foreground mb-2">PDF Export</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Summary report in PDF format
                    </p>
                    <a
                      href={`/api/billing/batches/${batch.id}/export.pdf`}
                      target="_blank"
                      className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors btn-animate"
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Invoices Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Add Invoices to Batch</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Invoice IDs (comma-separated)
                  </label>
                  <textarea
                    value={invoiceIds}
                    onChange={(e) => setInvoiceIds(e.target.value)}
                    placeholder="invoice1, invoice2, invoice3"
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={addInvoices}
                  disabled={saving || !invoiceIds.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 btn-animate"
                >
                  {saving ? 'Adding...' : 'Add Invoices'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </ProtectedRoute>
);
}