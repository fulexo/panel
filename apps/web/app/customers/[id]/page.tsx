"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useCustomer, useUpdateCustomer, useDeleteCustomer, useCustomerStats, useCustomerOrders } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";
import { logger } from "@/lib/logger";

export default function CustomerDetailPage() {
  const params = useParams();
  useAuth();
  useRBAC();
  const customerId = params['id'] as string;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
  });

  const { 
    data: customer, 
    isLoading,
    error
  } = useCustomer(customerId) as { data: { 
    id: string; 
    firstName: string; 
    lastName: string; 
    email: string; 
    phone: string; 
    company?: string; 
    address?: string; 
    city?: string; 
    state?: string; 
    postcode?: string; 
    country?: string; 
    createdAt: string; 
    updatedAt: string; 
    store?: { name: string } 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading customer details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !customer) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading customer</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Customer not found'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleEdit = () => {
    setEditData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      company: customer.company || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      postcode: customer.postcode || "",
      country: customer.country || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      await updateCustomer.mutateAsync({
        id: customerId,
        data: editData
      });
      setShowEditModal(false);
    } catch (error) {
      logger.error('Failed to update customer:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(customerId);
      // Redirect to customers list
      window.location.href = '/customers';
    } catch (error) {
      logger.error('Failed to delete customer:', error);
    }
  };

  // Get real customer statistics from API
  const { data: customerStats } = useCustomerStats(customerId);
  const { data: recentOrders } = useCustomerOrders(customerId, { limit: 5 });

  // Fallback data structure for display
  const displayStats = {
    totalOrders: (customerStats as any)?.totalOrders || 0,
    totalSpent: (customerStats as any)?.totalSpent || 0,
    averageOrderValue: (customerStats as any)?.averageOrderValue || 0,
    lastOrderDate: (customerStats as any)?.lastOrderDate || null,
    memberSince: customer.createdAt,
  };

  const displayOrders = Array.isArray(recentOrders) ? recentOrders : [];

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
              <h1 className="mobile-heading text-foreground">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="text-muted-foreground mobile-text">
                Customer details and order history
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline">Export</button>
              <button className="btn btn-outline">Send Email</button>
              <ProtectedComponent permission="customers.manage">
                <button 
                  onClick={handleEdit}
                  className="btn btn-primary"
                >
                  Edit Customer
                </button>
              </ProtectedComponent>
              <ProtectedComponent permission="customers.manage">
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-destructive"
                >
                  Delete
                </button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Profile */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-3xl text-primary-foreground font-bold">
                      {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {customer.firstName} {customer.lastName}
                    </h3>
                    <p className="text-muted-foreground mb-4">{customer.email}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{customer.company || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Billing Address</h4>
                    <div className="text-sm text-muted-foreground">
                      {customer.address ? (
                        <>
                          <p>{customer.address}</p>
                          <p>{customer.city}, {customer.state} {customer.postcode}</p>
                          <p>{customer.country}</p>
                        </>
                      ) : (
                        <p>No address on file</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Contact Details</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Email: {customer.email}</p>
                      <p>Phone: {customer.phone}</p>
                      <p>Member since: {new Date(customer.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h3>
                <div className="space-y-4">
                  {displayOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium">{order.orderNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₺{order.total.toFixed(2)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Statistics */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Statistics</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {displayStats.totalOrders}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Spent</span>
                      <span className="font-medium">₺{displayStats.totalSpent.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Order</span>
                      <span className="font-medium">₺{displayStats.averageOrderValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Order</span>
                      <span className="font-medium">
                        {displayStats.lastOrderDate ? new Date(displayStats.lastOrderDate).toLocaleDateString() : 'No orders'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Actions */}
              <ProtectedComponent permission="customers.manage">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">View All Orders</button>
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-outline w-full">Create Order</button>
                    <button className="btn btn-outline w-full">Export Data</button>
                  </div>
                </div>
              </ProtectedComponent>

              {/* Customer Notes */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Notes</h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">VIP Customer</p>
                    <p className="text-muted-foreground">High-value customer with excellent payment history</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Preferred Contact</p>
                    <p className="text-muted-foreground">Email communication preferred</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Customer Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Edit Customer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      value={editData.firstName}
                      onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      value={editData.lastName}
                      onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      value={editData.company}
                      onChange={(e) => setEditData({...editData, company: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      value={editData.address}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={editData.city}
                      onChange={(e) => setEditData({...editData, city: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      value={editData.state}
                      onChange={(e) => setEditData({...editData, state: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Postcode</label>
                    <input
                      type="text"
                      value={editData.postcode}
                      onChange={(e) => setEditData({...editData, postcode: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      value={editData.country}
                      onChange={(e) => setEditData({...editData, country: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleUpdate}
                    className="btn btn-primary"
                  >
                    Update Customer
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Delete Customer</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete "{customer.firstName} {customer.lastName}"? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="btn btn-destructive"
                  >
                    Delete Customer
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
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