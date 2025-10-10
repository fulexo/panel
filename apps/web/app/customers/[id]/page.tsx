"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useCustomer, useUpdateCustomer, useDeleteCustomer, useCustomerStats, useCustomerOrders } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { formatCurrency } from "@/lib/formatters";
import { SectionShell } from "@/components/patterns/SectionShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormField } from "@/components/forms/FormField";

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

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6">
            <SectionShell
              title="Loading customer details..."
              description="Please wait while we fetch customer information"
            >
              <div className="spinner"></div>
            </SectionShell>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !customer) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6">
            <SectionShell
              title="Error loading customer"
              description={error instanceof ApiError ? error.message : 'Customer not found'}
              className="max-w-md mx-auto"
            >
              <button
                onClick={() => window.location.reload()}
                className="btn btn-outline"
              >
                Retry
              </button>
            </SectionShell>
          </main>
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
                  className="btn btn-outline"
                >
                  Edit Customer
                </button>
              </ProtectedComponent>
              <ProtectedComponent permission="customers.manage">
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-outline"
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
              <SectionShell
                title="Customer Profile"
                description="Basic customer information and contact details"
              >
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-foreground rounded-full flex items-center justify-center">
                    <span className="text-3xl text-background font-bold">
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
              </SectionShell>

              {/* Contact Information */}
              <SectionShell
                title="Contact Information"
                description="Address and contact details"
              >
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
              </SectionShell>

              {/* Recent Orders */}
              <SectionShell
                title="Recent Orders"
                description="Latest orders from this customer"
              >
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
                        <p className="font-medium">{formatCurrency(order.total, currencyOptions)}</p>
                        <StatusPill
                          label={order.status.toUpperCase()}
                          tone={
                            order.status === 'pending' ? 'default' :
                            order.status === 'processing' ? 'default' :
                            order.status === 'shipped' ? 'default' :
                            order.status === 'delivered' ? 'default' :
                            order.status === 'cancelled' ? 'default' :
                            'muted'
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionShell>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Statistics */}
              <SectionShell
                title="Customer Statistics"
                description="Order history and spending metrics"
              >
                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{displayStats.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">orders placed</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Spent</span>
                      <span className="font-medium">{formatCurrency(displayStats.totalSpent, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Order</span>
                      <span className="font-medium">{formatCurrency(displayStats.averageOrderValue, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Order</span>
                      <span className="font-medium">
                        {displayStats.lastOrderDate ? new Date(displayStats.lastOrderDate).toLocaleDateString() : 'No orders'}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionShell>

              {/* Customer Actions */}
              <ProtectedComponent permission="customers.manage">
                <SectionShell
                  title="Quick Actions"
                  description="Common actions for customer management"
                >
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">View All Orders</button>
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-outline w-full">Create Order</button>
                    <button className="btn btn-outline w-full">Export Data</button>
                  </div>
                </SectionShell>
              </ProtectedComponent>

              {/* Customer Notes */}
                <SectionShell
                  title="Customer Notes"
                  description="Additional notes and preferences"
                >
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
              </SectionShell>
            </div>
          </div>

          {/* Edit Customer Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Edit Customer</h3>
                <FormLayout>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="First Name"
                      value={editData.firstName}
                      onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="Last Name"
                      value={editData.lastName}
                      onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="Email"
                      value={editData.email}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      type="email"
                    />
                    <FormField
                      label="Phone"
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      type="tel"
                    />
                    <FormField
                      label="Company"
                      value={editData.company}
                      onChange={(e) => setEditData({...editData, company: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="Address"
                      value={editData.address}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="City"
                      value={editData.city}
                      onChange={(e) => setEditData({...editData, city: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="State"
                      value={editData.state}
                      onChange={(e) => setEditData({...editData, state: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="Postcode"
                      value={editData.postcode}
                      onChange={(e) => setEditData({...editData, postcode: e.target.value})}
                      type="text"
                    />
                    <FormField
                      label="Country"
                      value={editData.country}
                      onChange={(e) => setEditData({...editData, country: e.target.value})}
                      type="text"
                    />
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleUpdate}
                      className="btn btn-outline"
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
                </FormLayout>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border w-full max-w-md shadow-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Delete Customer</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete "{customer.firstName} {customer.lastName}"? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="btn btn-outline"
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
