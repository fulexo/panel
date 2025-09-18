"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function CustomersPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch customers data
  const { 
    data: customersData, 
    isLoading,
    error
  } = useCustomers({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; firstName: string; lastName: string; email: string; phone?: string; totalOrders: number; totalSpent: number; createdAt: string; store?: { name: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading customers...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading customers</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const customers = customersData?.data || [];
  const totalCustomers = customersData?.pagination?.total || 0;
  const totalPages = customersData?.pagination?.pages || 1;

  // Calculate statistics
  const totalSpent = customers.reduce((sum: number, customer: { id: string; firstName: string; lastName: string; email: string; phone?: string; totalOrders: number; totalSpent: number; createdAt: string; store?: { name: string } }) => sum + customer.totalSpent, 0);
  const totalOrders = customers.reduce((sum: number, customer: { id: string; firstName: string; lastName: string; email: string; phone?: string; totalOrders: number; totalSpent: number; createdAt: string; store?: { name: string } }) => sum + customer.totalOrders, 0);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Customers Management</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all customers across all stores' : 'View your store customers'}
              </p>
            </div>
            <ProtectedComponent permission="customers.manage">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Add Customer
              </button>
            </ProtectedComponent>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Customers</h3>
              <div className="text-3xl font-bold text-primary">
                {totalCustomers}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Orders</h3>
              <div className="text-3xl font-bold text-green-600">
                {totalOrders}
              </div>
              <p className="text-sm text-muted-foreground">All time</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Spent</h3>
              <div className="text-3xl font-bold text-blue-600">
                ${totalSpent.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">All time</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Avg Order Value</h3>
              <div className="text-3xl font-bold text-purple-600">
                ${avgOrderValue.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Per order</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">All Customers</h3>
              <ProtectedComponent permission="customers.manage">
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm">Export</button>
                  <button className="btn btn-outline btn-sm">Import</button>
                </div>
              </ProtectedComponent>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Orders</th>
                    <th className="text-left p-3">Total Spent</th>
                    <th className="text-left p-3">Joined</th>
                    {isAdmin() && <th className="text-left p-3">Store</th>}
                    <ProtectedComponent permission="customers.manage">
                      <th className="text-left p-3">Actions</th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer: { id: string; firstName: string; lastName: string; email: string; phone?: string; totalOrders: number; totalSpent: number; createdAt: string; store?: { name: string } }) => (
                    <tr key={customer.id} className="border-b border-border">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">
                              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-muted-foreground">ID: {customer.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{customer.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{customer.phone || 'N/A'}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{customer.totalOrders}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">${customer.totalSpent.toFixed(2)}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      {isAdmin() && (
                        <td className="p-3">{customer.store?.name || 'N/A'}</td>
                      )}
                      <ProtectedComponent permission="customers.manage">
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingCustomer(customer.id)}
                              className="btn btn-sm btn-outline"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => deleteCustomer.mutate(customer.id)}
                              className="btn btn-sm btn-destructive"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin() ? 8 : 7} className="p-8 text-center text-muted-foreground">
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
