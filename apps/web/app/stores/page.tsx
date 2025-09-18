"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function StoresPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
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
            <div className="text-lg text-foreground">Loading stores...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <ProtectedComponent role="ADMIN" fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="mobile-heading text-foreground">Stores Management</h1>
                <p className="text-muted-foreground mobile-text">
                  Manage all customer stores and their WooCommerce connections
                </p>
              </div>
              <button className="btn btn-primary">
                Add Store
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Store List</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🏪</div>
                  <p className="text-muted-foreground">
                    View and manage all customer stores
                  </p>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">WooCommerce Connections</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔗</div>
                  <p className="text-muted-foreground">
                    Manage API connections and sync status
                  </p>
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Mapping</h3>
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">👤</div>
                  <p className="text-muted-foreground">
                    Link customers to their stores
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Stores</h3>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm">Export</button>
                  <button className="btn btn-outline btn-sm">Filter</button>
                </div>
              </div>
              
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Stores Management</h3>
                <p className="text-muted-foreground">
                  This page is under development. Store management functionality will be available soon.
                </p>
              </div>
            </div>
          </main>
        </div>
      </ProtectedComponent>
    </ProtectedRoute>
  );
}
