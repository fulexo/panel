"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface BillingBatch {
  id: string;
  status: 'created' | 'issued' | 'paid' | 'cancelled';
  totalAmount: number;
  invoiceCount: number;
  createdAt: string;
  issuedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  notes?: string;
  invoices: BillingInvoice[];
}

interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  paidAt?: string;
}

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [batch, setBatch] = useState<BillingBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (params.id) {
      fetchBatchDetails(params.id as string);
    }
  }, [params.id]);

  const fetchBatchDetails = async (batchId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/batches/${batchId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch details');
      }
      
      const data = await response.json();
      setBatch(data.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!batch) return;
    
    try {
      const response = await fetch(`/api/billing/batches/${batch.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update batch status');
      }
      
      const data = await response.json();
      setBatch(data.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleExport = async () => {
    if (!batch) return;
    
    try {
      const response = await fetch(`/api/billing/batches/${batch.id}/export`);
      
      if (!response.ok) {
        throw new Error('Failed to export batch');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${batch.id}-export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      </ProtectedRoute>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Batch Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested batch could not be found.</p>
          <button
            onClick={() => router.push('/billing')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">Batch Details</h1>
            <p className="text-muted-foreground mt-1">Batch ID: {batch.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/billing')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Back to Billing
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Export Batch
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-4 animate-fade-in">
          <div className={`badge badge-lg ${
            batch.status === 'paid' ? 'badge-success' :
            batch.status === 'issued' ? 'badge-warning' :
            batch.status === 'cancelled' ? 'badge-error' :
            'badge-info'
          }`}>
            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
          </div>
          <div className="text-sm text-muted-foreground">
            Created: {new Date(batch.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(batch.totalAmount)}</p>
                    </div>
                    <div className="text-3xl">💰</div>
                  </div>
                </div>
                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Invoice Count</p>
                      <p className="text-2xl font-bold text-foreground">{batch.invoiceCount}</p>
                    </div>
                    <div className="text-3xl">📄</div>
                  </div>
                </div>
                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="text-2xl font-bold text-foreground capitalize">{batch.status}</p>
                    </div>
                    <div className="text-3xl">
                      {batch.status === 'paid' ? '✅' :
                       batch.status === 'issued' ? '📤' :
                       batch.status === 'cancelled' ? '❌' : '📝'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Details */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Batch Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Batch ID</label>
                    <p className="text-foreground font-mono">{batch.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-foreground">{new Date(batch.createdAt).toLocaleString()}</p>
                  </div>
                  {batch.issuedAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Issued At</label>
                      <p className="text-foreground">{new Date(batch.issuedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {batch.paidAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Paid At</label>
                      <p className="text-foreground">{new Date(batch.paidAt).toLocaleString()}</p>
                    </div>
                  )}
                  {batch.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Notes</label>
                      <p className="text-foreground">{batch.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              {batch.status === 'created' && (
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleStatusChange('issued')}
                      className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors"
                    >
                      Issue Batch
                    </button>
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      className="px-4 py-2 bg-error text-error-foreground rounded-lg hover:bg-error/90 transition-colors"
                    >
                      Cancel Batch
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Invoices in this Batch</h3>
                <div className="text-sm text-muted-foreground">
                  {batch.invoices.length} invoice(s)
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {batch.invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {invoice.invoiceNumber}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(invoice.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {invoice.customerName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {invoice.customerEmail}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {formatCurrency(invoice.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${
                              invoice.status === 'paid' ? 'badge-success' :
                              invoice.status === 'overdue' ? 'badge-error' :
                              invoice.status === 'sent' ? 'badge-warning' :
                              'badge-info'
                            }`}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => router.push(`/billing/invoices/${invoice.id}`)}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Export Options</h3>
                <p className="text-muted-foreground mb-6">
                  Export this batch data in various formats for external use.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="text-2xl">📊</div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">Excel Export</div>
                      <div className="text-sm text-muted-foreground">Export as .xlsx file</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {/* PDF export logic */}}
                    className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="text-2xl">📄</div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">PDF Export</div>
                      <div className="text-sm text-muted-foreground">Export as .pdf file</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}