"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useOrder, useUpdateOrderStatus, useUpdateOrderShipping } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function OrderDetailPage() {
  const params = useParams();
  const { } = useAuth();
  const { } = useRBAC();
  const orderId = params['id'] as string;
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [shippingData, setShippingData] = useState({
    trackingNumber: "",
    carrier: "",
    status: "",
  });

  const { 
    data: order, 
    isLoading,
    error
  } = useOrder(orderId) as { data: { 
    id: string; 
    orderNumber: string; 
    status: string; 
    total: number; 
    createdAt: string; 
    customerEmail: string; 
    billingInfo: { 
      first_name: string; 
      last_name: string; 
      address_1: string; 
      city: string; 
      state: string; 
      postcode: string; 
      country: string; 
      phone: string; 
    }; 
    shippingInfo: { 
      first_name: string; 
      last_name: string; 
      address_1: string; 
      city: string; 
      state: string; 
      postcode: string; 
      country: string; 
    }; 
    items: Array<{ 
      id: string; 
      name: string; 
      quantity: number; 
      price: number; 
      total: number; 
      sku: string; 
    }>; 
    shipping: { 
      method: string; 
      cost: number; 
      trackingNumber?: string; 
      carrier?: string; 
      status?: string; 
    }; 
    store?: { name: string } 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const updateOrderStatus = useUpdateOrderStatus();
  const updateOrderShipping = useUpdateOrderShipping();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading order details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading order</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Order not found'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleStatusUpdate = async () => {
    try {
      await updateOrderStatus.mutateAsync({
        id: orderId,
        status: newStatus
      });
      setShowStatusModal(false);
      setNewStatus("");
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleShippingUpdate = async () => {
    try {
      await updateOrderShipping.mutateAsync({
        id: orderId,
        data: shippingData
      });
      setShowShippingModal(false);
      setShippingData({ trackingNumber: "", carrier: "", status: "" });
    } catch (error) {
      console.error('Failed to update shipping:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Order #{order.orderNumber}</h1>
              <p className="text-muted-foreground mobile-text">
                Order details and management
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline">Print</button>
              <button className="btn btn-outline">Export</button>
              <ProtectedComponent permission="orders.manage">
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
            {/* Order Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Status */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Order Status</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">₺{order.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{order.items.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Store</p>
                    <p className="font-medium">{order.store?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Order Items</h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₺{item.price.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₺{item.total.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Shipping Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Shipping Address</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>{order.shippingInfo.first_name} {order.shippingInfo.last_name}</p>
                      <p>{order.shippingInfo.address_1}</p>
                      <p>{order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.postcode}</p>
                      <p>{order.shippingInfo.country}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Shipping Method</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>Method: {order.shipping.method}</p>
                      <p>Cost: ₺{order.shipping.cost.toFixed(2)}</p>
                      {order.shipping.trackingNumber && (
                        <p>Tracking: {order.shipping.trackingNumber}</p>
                      )}
                      {order.shipping.carrier && (
                        <p>Carrier: {order.shipping.carrier}</p>
                      )}
                    </div>
                    <ProtectedComponent permission="orders.manage">
                      <button 
                        onClick={() => setShowShippingModal(true)}
                        className="btn btn-sm btn-outline mt-2"
                      >
                        Update Shipping
                      </button>
                    </ProtectedComponent>
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
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{order.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.billingInfo.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Address</p>
                    <div className="text-sm text-muted-foreground">
                      <p>{order.billingInfo.first_name} {order.billingInfo.last_name}</p>
                      <p>{order.billingInfo.address_1}</p>
                      <p>{order.billingInfo.city}, {order.billingInfo.state} {order.billingInfo.postcode}</p>
                      <p>{order.billingInfo.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₺{(order.total - order.shipping.cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>₺{order.shipping.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>₺{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <ProtectedComponent permission="orders.manage">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">Send Invoice</button>
                    <button className="btn btn-outline w-full">Print Label</button>
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-destructive w-full">Cancel Order</button>
                  </div>
                </div>
              </ProtectedComponent>
            </div>
          </div>

          {/* Status Update Modal */}
          {showStatusModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Order Status</h3>
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
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
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

          {/* Shipping Update Modal */}
          {showShippingModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Shipping</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Tracking Number</label>
                    <input
                      type="text"
                      value={shippingData.trackingNumber}
                      onChange={(e) => setShippingData({...shippingData, trackingNumber: e.target.value})}
                      className="form-input"
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <div>
                    <label className="form-label">Carrier</label>
                    <input
                      type="text"
                      value={shippingData.carrier}
                      onChange={(e) => setShippingData({...shippingData, carrier: e.target.value})}
                      className="form-input"
                      placeholder="Enter carrier name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      value={shippingData.status}
                      onChange={(e) => setShippingData({...shippingData, status: e.target.value})}
                      className="form-select"
                    >
                      <option value="">Select status</option>
                      <option value="pending">Pending</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleShippingUpdate}
                    className="btn btn-primary"
                  >
                    Update Shipping
                  </button>
                  <button
                    onClick={() => setShowShippingModal(false)}
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