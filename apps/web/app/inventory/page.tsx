"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, isCustomer, canApprove } = useRBAC();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(false);
    } else {
      router.push('/login');
    }
  }, [user, router]);

  if (loading) {
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
              <button className="btn btn-primary">
                Update Stock
              </button>
            </ProtectedComponent>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Current Stock</h3>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-muted-foreground">
                  {isAdmin() 
                    ? 'View and manage all inventory across stores'
                    : 'View your current stock levels'
                  }
                </p>
              </div>
            </div>

            <ProtectedComponent permission="inventory.approve">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Pending Approvals</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-muted-foreground">
                    Review and approve inventory changes from customers
                  </p>
                </div>
              </div>
            </ProtectedComponent>

            <ProtectedComponent permission="inventory.manage" fallback={
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Stock Changes</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-muted-foreground">
                    Your stock changes are pending approval
                  </p>
                </div>
              </div>
            }>
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Stock Management</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚡</div>
                  <p className="text-muted-foreground">
                    {isAdmin() 
                      ? 'Directly update stock levels'
                      : 'Update stock levels (requires approval)'
                    }
                  </p>
                </div>
              </div>
            </ProtectedComponent>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}