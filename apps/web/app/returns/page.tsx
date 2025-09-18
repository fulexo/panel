"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useReturns, useCreateReturn, useUpdateReturnStatus } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function ReturnsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch returns data
  const { 
    data: returnsData, 
    isLoading,
    error
  } = useReturns({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  const createReturn = useCreateReturn();
  const updateReturnStatus = useUpdateReturnStatus();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading returns...</div>
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
            <div className="text-red-500 text-lg">Error loading returns</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const returns = returnsData?.data || [];
  const totalReturns = returnsData?.pagination?.total || 0;
  const totalPages = returnsData?.pagination?.pages || 1;

  // Calculate statistics
  const statusCounts = returns.reduce((acc: Record<string, number>, returnItem: { id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }) => {
    acc[returnItem.status] = (acc[returnItem.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingReturns = returns.filter((returnItem: { id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }) => returnItem.status === 'pending');
  const approvedReturns = returns.filter((returnItem: { id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }) => returnItem.status === 'approved');
  const rejectedReturns = returns.filter((returnItem: { id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }) => returnItem.status === 'rejected');

  const handleStatusUpdate = async (returnId: string, newStatus: string) => {
    try {
      await updateReturnStatus.mutateAsync({
        id: returnId,
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update return status:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Returns Management</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all returns across all stores' : 'View your store returns'}
              </p>
            </div>
            <ProtectedComponent permission="returns.manage">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create Return
              </button>
            </ProtectedComponent>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search returns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="processed">Processed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Returns</h3>
              <div className="text-3xl font-bold text-primary">
                {totalReturns}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Pending</h3>
              <div className="text-3xl font-bold text-yellow-600">
                {statusCounts['pending'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Awaiting review</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Approved</h3>
              <div className="text-3xl font-bold text-green-600">
                {statusCounts['approved'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Approved returns</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Rejected</h3>
              <div className="text-3xl font-bold text-red-600">
                {statusCounts['rejected'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Rejected returns</p>
            </div>
          </div>

          {/* Pending Returns (Admin only) */}
          {isAdmin() && pendingReturns.length > 0 && (
            <div className="bg-card p-6 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">Pending Returns ({pendingReturns.length})</h3>
              <div className="space-y-3">
                {pendingReturns.slice(0, 5).map((returnItem: { id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }) => (
                  <div key={returnItem.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-yellow-800">Order #{returnItem.orderNumber}</div>
                      <div className="text-sm text-yellow-600">{returnItem.productName} (Qty: {returnItem.quantity})</div>
                      <div className="text-sm text-yellow-600">Reason: {returnItem.reason}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusUpdate(returnItem.id, 'approved')}
                        className="btn btn-sm btn-success"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(returnItem.id, 'rejected')}
                        className="btn btn-sm btn-destructive"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">All Returns</h3>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">Export</button>
                <button className="btn btn-outline btn-sm">Filter</button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Order #</th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">Quantity</th>
                    <th className="text-left p-3">Reason</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Requested</th>
                    {isAdmin() && <th className="text-left p-3">Store</th>}
                    <ProtectedComponent permission="returns.manage">
                      <th className="text-left p-3">Actions</th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((returnItem: { id: string; orderNumber: string; productName: string; quantity: number; reason: string; status: string; requestedAt: string; processedAt?: string; notes?: string; store?: { name: string } }) => (
                    <tr key={returnItem.id} className="border-b border-border">
                      <td className="p-3">
                        <div className="font-medium">#{returnItem.orderNumber}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{returnItem.productName}</div>
                      </td>
                      <td className="p-3">{returnItem.quantity}</td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">{returnItem.reason}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          returnItem.status === 'approved' ? 'bg-green-100 text-green-800' :
                          returnItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          returnItem.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {returnItem.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(returnItem.requestedAt).toLocaleDateString()}
                        </div>
                      </td>
                      {isAdmin() && (
                        <td className="p-3">{returnItem.store?.name || 'N/A'}</td>
                      )}
                      <ProtectedComponent permission="returns.manage">
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedReturn(returnItem.id)}
                              className="btn btn-sm btn-outline"
                            >
                              View
                            </button>
                            {returnItem.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(returnItem.id, 'approved')}
                                  className="btn btn-sm btn-success"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(returnItem.id, 'rejected')}
                                  className="btn btn-sm btn-destructive"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {returns.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin() ? 8 : 7} className="p-8 text-center text-muted-foreground">
                        No returns found
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