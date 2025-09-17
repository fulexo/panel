"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface ReturnItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  status: 'pending' | 'received' | 'processing' | 'completed' | 'rejected';
  photos: string[];
  notes: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  refundAmount?: number;
}

export default function ReturnsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);
  
  // Bulk operations
  const [selectedReturns, setSelectedReturns] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Photo upload
  const [selectedReturn, setSelectedReturn] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoNote, setPhotoNote] = useState('');

  // Admin actions
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: search,
        status: statusFilter !== 'all' ? statusFilter : '',
      });

      const response = await api(`/returns?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load returns');
      }

      const data = await response.json();
      setReturns(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalReturns(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (returnId: string) => {
    if (!photoFile) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('photo', photoFile);
      if (photoNote) formData.append('note', photoNote);

      const response = await api(`/returns/${returnId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload photo');
      }

      setSuccess('Photo uploaded successfully');
      setPhotoFile(null);
      setPhotoNote('');
      setSelectedReturn('');
      await loadReturns();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateReturnStatus = async (returnId: string, status: string, notes?: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await api(`/returns/${returnId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status, 
          adminNotes: notes || adminNotes,
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
          trackingNumber: trackingNumber || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update return');
      }

      setSuccess('Return updated successfully');
      setAdminNotes('');
      setRefundAmount('');
      setTrackingNumber('');
      await loadReturns();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedReturns.length === 0) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/returns/bulk', {
        method: 'PUT',
        body: JSON.stringify({ 
          returnIds: selectedReturns, 
          updates: { status: newStatus } 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update returns');
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedReturns([]);
      await loadReturns();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'received': return '📦';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  useEffect(() => {
    loadReturns();
  }, [currentPage, search, statusFilter]);

  if (loading) {
    return (
  <ProtectedRoute>
    
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg">Loading returns...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Returns Management</h1>
            <p className="text-muted-foreground">Manage product returns and refunds</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {totalReturns} total returns
            </span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search returns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedReturns.length > 0 && (
          <div className="bg-accent border border-border rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedReturns.length} returns selected
                </span>
                <button
                  onClick={() => setSelectedReturns([])}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => bulkUpdateStatus('received')}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 btn-mobile-sm"
                >
                  Mark as Received
                </button>
                <button
                  onClick={() => bulkUpdateStatus('processing')}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 btn-mobile-sm"
                >
                  Mark as Processing
                </button>
                <button
                  onClick={() => bulkUpdateStatus('completed')}
                  disabled={saving}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 btn-mobile-sm"
                >
                  Mark as Completed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Returns List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="table-responsive">
            <table className="table-mobile">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedReturns.length === returns.length && returns.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReturns(returns.map(r => r.id));
                        } else {
                          setSelectedReturns([]);
                        }
                      }}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Return
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Photos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedReturns.includes(returnItem.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReturns([...selectedReturns, returnItem.id]);
                          } else {
                            setSelectedReturns(selectedReturns.filter(id => id !== returnItem.id));
                          }
                        }}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          #{returnItem.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Order #{returnItem.orderId.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(returnItem.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {returnItem.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Reason: {returnItem.reason}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {returnItem.customerName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {returnItem.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                        <span>{getStatusIcon(returnItem.status)}</span>
                        {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {returnItem.photos.length > 0 ? (
                          <div className="flex -space-x-1">
                            {returnItem.photos.slice(0, 3).map((photo, index) => (
                              <div key={index} className="w-6 h-6 bg-muted rounded-full border-2 border-background flex items-center justify-center text-xs">
                                📷
                              </div>
                            ))}
                            {returnItem.photos.length > 3 && (
                              <div className="w-6 h-6 bg-muted rounded-full border-2 border-background flex items-center justify-center text-xs">
                                +{returnItem.photos.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No photos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedReturn(returnItem.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Upload Photo
                        </button>
                        <button
                          onClick={() => updateReturnStatus(returnItem.id, 'received')}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Mark Received
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalReturns)} of {totalReturns} returns
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Photo Upload Modal */}
        {selectedReturn && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Upload Photo</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    value={photoNote}
                    onChange={(e) => setPhotoNote(e.target.value)}
                    placeholder="Add a note about this photo..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => uploadPhoto(selectedReturn)}
                  disabled={!photoFile || saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 btn-mobile"
                >
                  {saving ? 'Uploading...' : 'Upload Photo'}
                </button>
                <button
                  onClick={() => {
                    setSelectedReturn('');
                    setPhotoFile(null);
                    setPhotoNote('');
                  }}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 btn-mobile"
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
  );
}