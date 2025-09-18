"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useInventory, useUpdateInventory, useInventoryApprovals, useApproveInventoryChange } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function InventoryPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [reason, setReason] = useState("");
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch inventory data
  const { 
    data: inventoryData, 
    isLoading,
    error
  } = useInventory({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(showLowStock ? { lowStock: true } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; productName: string; sku: string; currentStock: number; minStock: number; maxStock: number; lastUpdated: string; store?: { name: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  // Fetch pending approvals (admin only)
  const { 
    data: approvalsData
  } = useInventoryApprovals({
    status: 'pending'
  }) as { data: { data: Array<{ id: string; productName: string; sku: string; currentStock: number; requestedStock: number; reason: string; requestedBy: string; requestedAt: string; store?: { name: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  const updateInventory = useUpdateInventory();
  const approveInventoryChange = useApproveInventoryChange();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading inventory data...</div>
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
            <div className="text-red-500 text-lg">Error loading inventory</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const inventory = inventoryData?.data || [];
  const totalItems = inventoryData?.pagination?.total || 0;
  const totalPages = inventoryData?.pagination?.pages || 1;
  const pendingApprovals = approvalsData?.data || [];

  // Calculate statistics
  const lowStockItems = inventory.filter((item: { id: string; productName: string; sku: string; currentStock: number; minStock: number; maxStock: number; lastUpdated: string; store?: { name: string } }) => item.currentStock <= item.minStock);
  const outOfStockItems = inventory.filter((item: { id: string; productName: string; sku: string; currentStock: number; minStock: number; maxStock: number; lastUpdated: string; store?: { name: string } }) => item.currentStock === 0);
  const totalValue = inventory.reduce((sum: number, item: { id: string; productName: string; sku: string; currentStock: number; minStock: number; maxStock: number; lastUpdated: string; store?: { name: string } }) => sum + item.currentStock, 0);

  const handleUpdateStock = async (productId: string, quantity: number, reason: string) => {
    try {
      await updateInventory.mutateAsync({
        id: productId,
        data: { quantity, reason }
      });
      setShowUpdateModal(false);
      setSelectedProduct(null);
      setNewQuantity("");
      setReason("");
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const handleApproveChange = async (approvalId: string, approved: boolean) => {
    try {
      await approveInventoryChange.mutateAsync({
        id: approvalId,
        approved
      });
    } catch (error) {
      console.error('Failed to approve change:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Inventory Management</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all inventory across all stores' : 'Manage your store inventory (changes require approval)'}
              </p>
            </div>
            <ProtectedComponent permission="inventory.manage">
              <button 
                onClick={() => setShowUpdateModal(true)}
                className="btn btn-primary"
              >
                Update Stock
              </button>
            </ProtectedComponent>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="form-checkbox"
              />
              <span className="text-sm">Show low stock only</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Items</h3>
              <div className="text-3xl font-bold text-primary">
                {totalItems}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Low Stock</h3>
              <div className="text-3xl font-bold text-yellow-600">
                {lowStockItems.length}
              </div>
              <p className="text-sm text-muted-foreground">≤ min stock level</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Out of Stock</h3>
              <div className="text-3xl font-bold text-red-600">
                {outOfStockItems.length}
              </div>
              <p className="text-sm text-muted-foreground">0 units</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Units</h3>
              <div className="text-3xl font-bold text-blue-600">
                {totalValue}
              </div>
              <p className="text-sm text-muted-foreground">In stock</p>
            </div>
          </div>

          {/* Pending Approvals (Admin only) */}
          {isAdmin() && pendingApprovals.length > 0 && (
            <div className="bg-card p-6 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">Pending Approvals ({pendingApprovals.length})</h3>
              <div className="space-y-3">
                {pendingApprovals.slice(0, 5).map((approval: { id: string; productName: string; sku: string; currentStock: number; requestedStock: number; reason: string; requestedBy: string; requestedAt: string; store?: { name: string } }) => (
                  <div key={approval.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-yellow-800">{approval.productName}</div>
                      <div className="text-sm text-yellow-600">SKU: {approval.sku}</div>
                      <div className="text-sm text-yellow-600">
                        {approval.currentStock} → {approval.requestedStock} units
                      </div>
                      <div className="text-sm text-yellow-600">Reason: {approval.reason}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveChange(approval.id, true)}
                        className="btn btn-sm btn-success"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveChange(approval.id, false)}
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

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="bg-card p-6 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800 mb-4">Low Stock Alerts ({lowStockItems.length})</h3>
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item: { id: string; productName: string; sku: string; currentStock: number; minStock: number; maxStock: number; lastUpdated: string; store?: { name: string } }) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-red-800">{item.productName}</div>
                      <div className="text-sm text-red-600">SKU: {item.sku}</div>
                      <div className="text-sm text-red-600">Min: {item.minStock}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-800">{item.currentStock} left</div>
                      <div className="text-sm text-red-600">Critical</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Inventory</h3>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">Export</button>
                <button className="btn btn-outline btn-sm">Import</button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Current Stock</th>
                    <th className="text-left p-3">Min Stock</th>
                    <th className="text-left p-3">Max Stock</th>
                    <th className="text-left p-3">Last Updated</th>
                    {isAdmin() && <th className="text-left p-3">Store</th>}
                    <ProtectedComponent permission="inventory.manage">
                      <th className="text-left p-3">Actions</th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item: { id: string; productName: string; sku: string; currentStock: number; minStock: number; maxStock: number; lastUpdated: string; store?: { name: string } }) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="p-3">
                        <div className="font-medium">{item.productName}</div>
                      </td>
                      <td className="p-3">{item.sku}</td>
                      <td className="p-3">
                        <div className={`font-medium ${
                          item.currentStock <= item.minStock ? 'text-red-600' : 
                          item.currentStock <= item.minStock * 1.5 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {item.currentStock}
                        </div>
                      </td>
                      <td className="p-3">{item.minStock}</td>
                      <td className="p-3">{item.maxStock}</td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground">
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </div>
                      </td>
                      {isAdmin() && (
                        <td className="p-3">{item.store?.name || 'N/A'}</td>
                      )}
                      <ProtectedComponent permission="inventory.manage">
                        <td className="p-3">
                          <button 
                            onClick={() => {
                              setSelectedProduct(item.id);
                              setNewQuantity(item.currentStock.toString());
                              setShowUpdateModal(true);
                            }}
                            className="btn btn-sm btn-outline"
                          >
                            Update
                          </button>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin() ? 8 : 7} className="p-8 text-center text-muted-foreground">
                        No inventory items found
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

          {/* Update Stock Modal */}
          {showUpdateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Stock</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">New Quantity</label>
                    <input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="form-input"
                      placeholder="Enter new quantity"
                    />
                  </div>
                  <div>
                    <label className="form-label">Reason</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="form-textarea"
                      placeholder="Enter reason for change"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => {
                      if (selectedProduct && newQuantity) {
                        handleUpdateStock(selectedProduct, parseInt(newQuantity), reason);
                      }
                    }}
                    className="btn btn-primary"
                  >
                    Update Stock
                  </button>
                  <button
                    onClick={() => {
                      setShowUpdateModal(false);
                      setSelectedProduct(null);
                      setNewQuantity("");
                      setReason("");
                    }}
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