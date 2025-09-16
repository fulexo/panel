"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  method: 'card' | 'bank_transfer' | 'paypal' | 'stripe' | 'other';
  transactionId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  invoice?: {
    id: string;
    number?: string;
    orderId: string;
    total: number;
    currency: string;
  };
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  
  // Stats
  const [stats, setStats] = useState({
    totalAmount: 0,
    completedAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
  });

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const t = token();
      if (!t) { 
        router.push('/login'); 
        return; 
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(methodFilter !== 'all' && { method: methodFilter }),
        ...(dateFilter !== 'all' && { dateFilter }),
      });

      const r = await api(`/billing/payments?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch payments');
      }
      
      const data = await r.json();
      setPayments(data?.data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalPayments(data?.pagination?.total || 0);
      
      // Calculate stats
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const completedAmount = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
      const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
      const failedAmount = payments.filter(p => p.status === 'failed').reduce((sum, p) => sum + p.amount, 0);
      
      setStats({
        totalAmount,
        completedAmount,
        pendingAmount,
        failedAmount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/billing/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update payment');
      }

      setSuccess('Payment updated successfully');
      await loadPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const refundPayment = async (paymentId: string) => {
    if (!confirm('Bu ödemeyi iade etmek istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/billing/payments/${paymentId}/refund`, { method: 'POST' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to refund payment');
      }

      setSuccess('Payment refunded successfully');
      await loadPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPayments();
    } else {
      router.push('/login');
    }
  }, [user, currentPage, search, statusFilter, methodFilter, dateFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'cancelled': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'refunded': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      case 'refunded': return '↩️';
      default: return '❓';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return '💳';
      case 'bank_transfer': return '🏦';
      case 'paypal': return '🅿️';
      case 'stripe': return '💳';
      case 'other': return '💰';
      default: return '💳';
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading payments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="mobile-heading text-foreground">Payment Tracking</h1>
            <p className="text-muted-foreground mobile-text">
              Monitor payments, refunds, and transaction status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalPayments} payments total
            </span>
            <a
              href="/billing/invoices"
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
            >
              View Invoices
            </a>
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

        {/* Filters */}
        <div className="bg-card p-4 rounded-lg border border-border animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search payments by transaction ID, invoice number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Method Filter */}
            <div>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payment Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(stats.completedAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xl">⏳</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <span className="text-xl">❌</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(stats.failedAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="space-y-4 animate-slide-up">
          {payments.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No payments have been processed yet'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Payment Icon */}
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{getMethodIcon(payment.method)}</span>
                    </div>

                    {/* Payment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          Payment {payment.id.slice(0, 8)}...
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                          {payment.status.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground border border-accent/20">
                          {payment.method.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>Amount: {formatCurrency(payment.amount, payment.currency)}</span>
                        {payment.transactionId && (
                          <span>TXN: {payment.transactionId}</span>
                        )}
                        {payment.invoice && (
                          <span>Invoice: {payment.invoice.number || payment.invoice.id.slice(0, 8)}</span>
                        )}
                        {payment.processedAt && (
                          <span>Processed: {new Date(payment.processedAt).toLocaleDateString()}</span>
                        )}
                        <span>Created: {new Date(payment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`/billing/payments/${payment.id}`}
                        className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                      >
                        View
                      </a>
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => updatePaymentStatus(payment.id, 'completed')}
                          disabled={saving}
                          className="px-3 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          Complete
                        </button>
                      )}
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => updatePaymentStatus(payment.id, 'failed')}
                          disabled={saving}
                          className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          Mark Failed
                        </button>
                      )}
                      {payment.status === 'completed' && (
                        <button
                          onClick={() => refundPayment(payment.id)}
                          disabled={saving}
                          className="px-3 py-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 animate-slide-up">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}