"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

interface Shipment {
  id: string;
  orderId: string;
  carrier?: string;
  trackingNo?: string;
  status?: string;
  labelUrl?: string;
  protocolUrl?: string;
  weight?: number;
  dimensions?: any;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    externalOrderNo?: string;
    customerEmail?: string;
    total: number;
    currency: string;
  };
}

export default function ShipmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalShipments, setTotalShipments] = useState(0);
  const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  
  // Create shipment modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    orderId: '',
    carrier: '',
    trackingNo: '',
    weight: '',
    status: 'pending',
  });

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadShipments = async () => {
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
        ...(carrierFilter !== 'all' && { carrier: carrierFilter }),
        ...(dateFilter !== 'all' && { dateFilter }),
        ...(storeFilter !== 'all' && { storeId: storeFilter }),
      });

      const r = await api(`/shipments?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch shipments');
      }
      
      const data = await r.json();
      setShipments(data?.data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalShipments(data?.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const r = await api('/woo/stores');
      if (r.ok) {
        const data = await r.json();
        setStores(data || []);
      }
    } catch (err) {
      // Ignore store fetch errors
    }
  };

  const createShipment = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: createForm.orderId,
          carrier: createForm.carrier || undefined,
          trackingNo: createForm.trackingNo || undefined,
          weight: createForm.weight ? parseFloat(createForm.weight) : undefined,
          status: createForm.status,
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create shipment');
      }

      setSuccess('Shipment created successfully');
      setShowCreateModal(false);
      setCreateForm({
        orderId: '',
        carrier: '',
        trackingNo: '',
        weight: '',
        status: 'pending',
      });
      await loadShipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, newStatus: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/shipments/${shipmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update shipment');
      }

      setSuccess('Shipment updated successfully');
      await loadShipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteShipment = async (shipmentId: string) => {
    if (!confirm('Bu kargo kaydını silmek istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/shipments/${shipmentId}`, { method: 'DELETE' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete shipment');
      }

      setSuccess('Shipment deleted successfully');
      await loadShipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedShipments.length === 0) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/shipments/bulk', {
        method: 'PUT',
        body: JSON.stringify({ 
          shipmentIds: selectedShipments, 
          updates: { status: newStatus } 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update shipments');
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedShipments([]);
      await loadShipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedShipments.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedShipments.length} shipments? This action cannot be undone.`)) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/shipments/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ shipmentIds: selectedShipments })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete shipments');
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedShipments([]);
      await loadShipments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectShipment = (shipmentId: string) => {
    setSelectedShipments(prev => 
      prev.includes(shipmentId) 
        ? prev.filter(id => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedShipments(
      selectedShipments.length === shipments.length 
        ? [] 
        : shipments.map(shipment => shipment.id)
    );
  };

  useEffect(() => {
    if (user) {
      loadShipments();
      if (user.role === 'ADMIN') {
        fetchStores();
      }
    } else {
      router.push('/login');
    }
  }, [user, currentPage, search, statusFilter, carrierFilter, dateFilter, storeFilter]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'shipped': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_transit': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'returned': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'pending': return '📦';
      case 'shipped': return '🚚';
      case 'in_transit': return '🚛';
      case 'delivered': return '✅';
      case 'failed': return '❌';
      case 'returned': return '↩️';
      default: return '📦';
    }
  };

  const getCarrierIcon = (carrier?: string) => {
    switch (carrier?.toLowerCase()) {
      case 'ups': return '📦';
      case 'fedex': return '🚚';
      case 'dhl': return '✈️';
      case 'usps': return '📮';
      case 'aramex': return '🚛';
      default: return '📦';
    }
  };

  const formatWeight = (weight?: number) => {
    if (!weight) return 'N/A';
    return `${weight} kg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading shipments...</div>
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
            <h1 className="mobile-heading text-foreground">Shipment Management</h1>
            <p className="text-muted-foreground mobile-text">
              Track and manage shipments, labels, and delivery status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalShipments} shipments total
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
            >
              + New Shipment
            </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search shipments by tracking number, carrier, order..."
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
                <option value="shipped">Shipped</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="returned">Returned</option>
              </select>
            </div>

            {/* Carrier Filter */}
            <div>
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Carriers</option>
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="dhl">DHL</option>
                <option value="usps">USPS</option>
                <option value="aramex">Aramex</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Store Filter (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                >
                  <option value="all">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedShipments.length > 0 && (
          <div className="bg-accent/20 p-4 rounded-lg border border-accent animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedShipments.length} shipment(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => bulkUpdateStatus(e.target.value)}
                  className="px-3 py-1 bg-background border border-border rounded text-sm"
                  disabled={saving}
                >
                  <option value="">Bulk Actions</option>
                  <option value="pending">Mark as Pending</option>
                  <option value="in_transit">Mark as In Transit</option>
                  <option value="delivered">Mark as Delivered</option>
                  <option value="failed">Mark as Failed</option>
                </select>
                <button
                  onClick={bulkDelete}
                  disabled={saving}
                  className="px-3 py-1 bg-destructive/10 text-destructive rounded text-sm hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  Delete All
                </button>
                <button
                  onClick={() => setSelectedShipments([])}
                  className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="text-xl">📦</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-xl font-bold text-foreground">{totalShipments}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold text-foreground">
                  {shipments.filter(s => s.status === 'delivered').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xl">🚚</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-xl font-bold text-foreground">
                  {shipments.filter(s => s.status === 'in_transit').length}
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
                  {shipments.filter(s => s.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipments List */}
        <div className="space-y-4 animate-slide-up">
          {shipments.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No shipments found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== 'all' || carrierFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first shipment'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All Header */}
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedShipments.length === shipments.length && shipments.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    Select all shipments ({shipments.length})
                  </span>
                </div>
              </div>

              {/* Shipments */}
              <div className="grid gap-4">
                {shipments.map((shipment, index) => (
                  <div
                    key={shipment.id}
                    className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedShipments.includes(shipment.id)}
                        onChange={() => handleSelectShipment(shipment.id)}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                      />
                    {/* Shipment Icon */}
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{getStatusIcon(shipment.status)}</span>
                    </div>

                    {/* Shipment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {shipment.trackingNo || `Shipment ${shipment.id.slice(0, 8)}`}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(shipment.status)}`}>
                          {shipment.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        {shipment.carrier && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground border border-accent/20">
                            {getCarrierIcon(shipment.carrier)} {shipment.carrier.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>Order: {shipment.orderId}</span>
                        {shipment.order?.externalOrderNo && (
                          <span>External: {shipment.order.externalOrderNo}</span>
                        )}
                        {shipment.order?.customerEmail && (
                          <span>Customer: {shipment.order.customerEmail}</span>
                        )}
                        {shipment.weight && (
                          <span>Weight: {formatWeight(shipment.weight)}</span>
                        )}
                        {shipment.shippedAt && (
                          <span>Shipped: {new Date(shipment.shippedAt).toLocaleDateString()}</span>
                        )}
                        {shipment.deliveredAt && (
                          <span>Delivered: {new Date(shipment.deliveredAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`/shipments/${shipment.id}`}
                        className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                      >
                        View
                      </a>
                      {shipment.status === 'pending' && (
                        <button
                          onClick={() => updateShipmentStatus(shipment.id, 'shipped')}
                          disabled={saving}
                          className="px-3 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          Ship
                        </button>
                      )}
                      {shipment.status === 'shipped' && (
                        <button
                          onClick={() => updateShipmentStatus(shipment.id, 'in_transit')}
                          disabled={saving}
                          className="px-3 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          In Transit
                        </button>
                      )}
                      {shipment.status === 'in_transit' && (
                        <button
                          onClick={() => updateShipmentStatus(shipment.id, 'delivered')}
                          disabled={saving}
                          className="px-3 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          Delivered
                        </button>
                      )}
                      {shipment.labelUrl && (
                        <a
                          href={shipment.labelUrl}
                          target="_blank"
                          className="px-3 py-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors btn-animate"
                        >
                          Label
                        </a>
                      )}
                      <button
                        onClick={() => deleteShipment(shipment.id)}
                        disabled={saving}
                        className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Delete
                      </button>
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

        {/* Create Shipment Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Create New Shipment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Order ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.orderId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, orderId: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    placeholder="Order ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Carrier
                  </label>
                  <select
                    value={createForm.carrier}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, carrier: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  >
                    <option value="">Select Carrier</option>
                    <option value="ups">UPS</option>
                    <option value="fedex">FedEx</option>
                    <option value="dhl">DHL</option>
                    <option value="usps">USPS</option>
                    <option value="aramex">Aramex</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={createForm.trackingNo}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, trackingNo: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    placeholder="Tracking Number"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={createForm.weight}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, weight: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Status
                    </label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createShipment}
                  disabled={saving || !createForm.orderId}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 btn-animate"
                >
                  {saving ? 'Creating...' : 'Create Shipment'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
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
  );
}