"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

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
    shippingAddress?: any;
    billingAddress?: any;
  };
}

export default function ShipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    carrier: '',
    trackingNo: '',
    weight: '',
    status: '',
  });

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadShipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api(`/shipments/${params.id}`);
      if (r.ok) {
        const data = await r.json();
        setShipment(data);
        setEditForm({
          carrier: data.carrier || '',
          trackingNo: data.trackingNo || '',
          weight: data.weight?.toString() || '',
          status: data.status || '',
        });
      } else if (r.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to load shipment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipment');
    } finally {
      setLoading(false);
    }
  };

  const updateShipment = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/shipments/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          carrier: editForm.carrier || undefined,
          trackingNo: editForm.trackingNo || undefined,
          weight: editForm.weight ? parseFloat(editForm.weight) : undefined,
          status: editForm.status,
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update shipment');
      }

      setSuccess('Shipment updated successfully');
      setShowEditModal(false);
      await loadShipment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/shipments/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      setSuccess('Status updated successfully');
      await loadShipment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteShipment = async () => {
    if (!confirm('Bu kargo kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/shipments/${params.id}`, { method: 'DELETE' });
      
      if (r.ok) {
        setSuccess('Shipment deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/shipments');
        }, 1500);
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete shipment');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadShipment();
    } else {
      router.push('/login');
    }
  }, [user, params.id]);

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

  const formatDimensions = (dimensions?: any) => {
    if (!dimensions) return 'N/A';
    if (typeof dimensions === 'object') {
      return `${dimensions.length || 0} x ${dimensions.width || 0} x ${dimensions.height || 0} cm`;
    }
    return dimensions.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading shipment details...</div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Shipment Not Found</h2>
          <p className="text-muted-foreground mb-4">The shipment you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/shipments')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Shipments
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'tracking', name: 'Tracking', icon: '📍' },
    { id: 'details', name: 'Details', icon: '📄' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/shipments')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-2xl">{getStatusIcon(shipment.status)}</span>
              </div>
              <div>
                <h1 className="mobile-heading text-foreground">
                  {shipment.trackingNo || `Shipment ${shipment.id.slice(0, 8)}`}
                </h1>
                <p className="text-muted-foreground mobile-text">
                  {shipment.carrier ? `${shipment.carrier.toUpperCase()}` : 'No Carrier'} • {formatWeight(shipment.weight)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(shipment.status)}`}>
              {shipment.status?.toUpperCase() || 'UNKNOWN'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
              >
                Edit
              </button>
              <button
                onClick={deleteShipment}
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
                    <h3 className="font-semibold text-foreground mb-3">Shipment Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="text-foreground font-mono">{shipment.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(shipment.status)}`}>
                          {shipment.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carrier:</span>
                        <span className="text-foreground">{shipment.carrier || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tracking:</span>
                        <span className="text-foreground">{shipment.trackingNo || 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Order Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="text-foreground font-mono">{shipment.orderId}</span>
                      </div>
                      {shipment.order?.externalOrderNo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">External:</span>
                          <span className="text-foreground">{shipment.order.externalOrderNo}</span>
                        </div>
                      )}
                      {shipment.order?.customerEmail && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="text-foreground">{shipment.order.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-foreground font-bold">
                          {shipment.order?.total ? `${shipment.order.total} ${shipment.order.currency}` : 'N/A'}
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
                          {new Date(shipment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {shipment.shippedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipped:</span>
                          <span className="text-foreground">
                            {new Date(shipment.shippedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {shipment.deliveredAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivered:</span>
                          <span className="text-foreground">
                            {new Date(shipment.deliveredAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="text-foreground">
                          {new Date(shipment.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    {shipment.status === 'pending' && (
                      <button
                        onClick={() => updateStatus('shipped')}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {shipment.status === 'shipped' && (
                      <button
                        onClick={() => updateStatus('in_transit')}
                        disabled={saving}
                        className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Mark as In Transit
                      </button>
                    )}
                    {shipment.status === 'in_transit' && (
                      <button
                        onClick={() => updateStatus('delivered')}
                        disabled={saving}
                        className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    {shipment.labelUrl && (
                      <a
                        href={shipment.labelUrl}
                        target="_blank"
                        className="px-4 py-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors btn-animate"
                      >
                        Download Label
                      </a>
                    )}
                    {shipment.protocolUrl && (
                      <a
                        href={shipment.protocolUrl}
                        target="_blank"
                        className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors btn-animate"
                      >
                        View Protocol
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tracking Tab */}
            {activeTab === 'tracking' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-6xl mb-4">📍</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Tracking Information</h3>
                  <p className="text-muted-foreground">
                    {shipment.trackingNo 
                      ? `Track this shipment with number: ${shipment.trackingNo}`
                      : 'No tracking number available'
                    }
                  </p>
                </div>

                {shipment.trackingNo && (
                  <div className="bg-accent/20 p-6 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-4">Tracking Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tracking Number:</span>
                        <span className="text-foreground font-mono">{shipment.trackingNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carrier:</span>
                        <span className="text-foreground">{shipment.carrier || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(shipment.status)}`}>
                          {shipment.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-accent/20 p-6 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-4">Track with Carrier</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use the tracking number to check the status on the carrier's website:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shipment.carrier?.toLowerCase() === 'ups' && (
                      <a
                        href={`https://www.ups.com/track?track=yes&tracknum=${shipment.trackingNo}`}
                        target="_blank"
                        className="px-4 py-2 bg-brown-500/10 text-brown-500 rounded-lg hover:bg-brown-500/20 transition-colors btn-animate"
                      >
                        Track on UPS
                      </a>
                    )}
                    {shipment.carrier?.toLowerCase() === 'fedex' && (
                      <a
                        href={`https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNo}`}
                        target="_blank"
                        className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors btn-animate"
                      >
                        Track on FedEx
                      </a>
                    )}
                    {shipment.carrier?.toLowerCase() === 'dhl' && (
                      <a
                        href={`https://www.dhl.com/tracking?trackingNumber=${shipment.trackingNo}`}
                        target="_blank"
                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors btn-animate"
                      >
                        Track on DHL
                      </a>
                    )}
                    {shipment.carrier?.toLowerCase() === 'usps' && (
                      <a
                        href={`https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${shipment.trackingNo}`}
                        target="_blank"
                        className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors btn-animate"
                      >
                        Track on USPS
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Physical Details */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Physical Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="text-foreground">{formatWeight(shipment.weight)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="text-foreground">{formatDimensions(shipment.dimensions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* URLs */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Documents & URLs</h3>
                    <div className="space-y-2 text-sm">
                      {shipment.labelUrl && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Label:</span>
                          <a
                            href={shipment.labelUrl}
                            target="_blank"
                            className="text-primary hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      )}
                      {shipment.protocolUrl && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Protocol:</span>
                          <a
                            href={shipment.protocolUrl}
                            target="_blank"
                            className="text-primary hover:underline"
                          >
                            View
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                {shipment.order && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Order Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="text-foreground font-mono">{shipment.order.id}</span>
                      </div>
                      {shipment.order.externalOrderNo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">External Order:</span>
                          <span className="text-foreground">{shipment.order.externalOrderNo}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-foreground font-bold">
                          {shipment.order.total} {shipment.order.currency}
                        </span>
                      </div>
                      {shipment.order.customerEmail && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="text-foreground">{shipment.order.customerEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Address Information */}
                {shipment.order?.shippingAddress && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Shipping Address</h3>
                    <div className="text-sm text-foreground">
                      {typeof shipment.order.shippingAddress === 'string' 
                        ? shipment.order.shippingAddress
                        : JSON.stringify(shipment.order.shippingAddress, null, 2)
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Edit Shipment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Carrier
                  </label>
                  <select
                    value={editForm.carrier}
                    onChange={(e) => setEditForm(prev => ({ ...prev, carrier: e.target.value }))}
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
                    value={editForm.trackingNo}
                    onChange={(e) => setEditForm(prev => ({ ...prev, trackingNo: e.target.value }))}
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
                      value={editForm.weight}
                      onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed">Failed</option>
                      <option value="returned">Returned</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateShipment}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 btn-animate"
                >
                  {saving ? 'Updating...' : 'Update Shipment'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
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