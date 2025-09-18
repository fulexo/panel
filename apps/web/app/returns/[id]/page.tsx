"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useReturn, useUpdateReturnStatus } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function ReturnDetailPage() {
  const params = useParams();
  const { } = useAuth();
  const { } = useRBAC();
  const returnId = params['id'] as string;
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const { 
    data: returnData, 
    isLoading,
    error
  } = useReturn(returnId) as { data: { 
    id: string; 
    returnNumber: string; 
    orderId: string; 
    orderNumber: string; 
    status: string; 
    reason: string; 
    description: string; 
    requestedAt: string; 
    processedAt?: string; 
    refundAmount: number; 
    items: Array<{ 
      id: string; 
      productName: string; 
      sku: string; 
      quantity: number; 
      price: number; 
      reason: string; 
    }>; 
    customer: { 
      firstName: string; 
      lastName: string; 
      email: string; 
      phone: string; 
    }; 
    store?: { name: string } 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const updateReturnStatus = useUpdateReturnStatus();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading return details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !returnData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading return</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Return not found'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleStatusUpdate = async () => {
    try {
      await updateReturnStatus.mutateAsync({
        id: returnId,
        status: newStatus
      });
      setShowStatusModal(false);
      setNewStatus("");
    } catch (error) {
      console.error('Failed to update return status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Return #{returnData.returnNumber}</h1>
              <p className="text-muted-foreground mobile-text">
                Return request details and management
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline">Print</button>
              <button className="btn btn-outline">Export</button>
              <ProtectedComponent permission="returns.manage">
                <button 
                  onClick={() => setShowStatusModal(true)}
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Return Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Return Status */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Return Status</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(returnData.status)}`}>
                    {returnData.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Return Date</p>
                    <p className="font-medium">{new Date(returnData.requestedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-medium">{returnData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund Amount</p>
                    <p className="font-medium">₺{returnData.refundAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{returnData.items.length}</p>
                  </div>
                </div>
              </div>

              {/* Return Items */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Return Items</h3>
                <div className="space-y-4">
                  {returnData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productName}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        <p className="text-sm text-muted-foreground">Reason: {item.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₺{item.price.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₺{(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Details */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Return Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Return Reason</label>
                    <p className="text-foreground">{returnData.reason}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-foreground">{returnData.description || 'No additional description provided'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Requested At</label>
                      <p className="font-medium">{new Date(returnData.requestedAt).toLocaleString()}</p>
                    </div>
                    {returnData.processedAt && (
                      <div>
                        <label className="text-sm text-muted-foreground">Processed At</label>
                        <p className="font-medium">{new Date(returnData.processedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{returnData.customer.firstName} {returnData.customer.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{returnData.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{returnData.customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Store</p>
                    <p className="font-medium">{returnData.store?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Return Summary */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Return Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{returnData.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span>{returnData.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg">
                    <span>Refund Amount</span>
                    <span>₺{returnData.refundAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <ProtectedComponent permission="returns.manage">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-outline w-full">Print Label</button>
                    <button className="btn btn-outline w-full">Process Refund</button>
                    <button className="btn btn-outline w-full">View Order</button>
                  </div>
                </div>
              </ProtectedComponent>

              {/* Return Timeline */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Return Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Return Requested</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(returnData.requestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {returnData.status === 'approved' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Return Approved</p>
                        <p className="text-xs text-muted-foreground">
                          {returnData.processedAt ? new Date(returnData.processedAt).toLocaleString() : 'Pending'}
                        </p>
                      </div>
                    </div>
                  )}
                  {returnData.status === 'completed' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Return Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {returnData.processedAt ? new Date(returnData.processedAt).toLocaleString() : 'Pending'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Modal */}
          {showStatusModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Return Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">New Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Select status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleStatusUpdate}
                    className="btn btn-primary"
                  >
                    Update Status
                  </button>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="btn btn-outline"
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