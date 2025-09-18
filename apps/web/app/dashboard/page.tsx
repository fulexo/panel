"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, isCustomer } = useRBAC();
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
            <div className="text-lg text-foreground">Loading dashboard...</div>
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
              <h1 className="mobile-heading text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Overview of all stores and operations' : 'Your store overview and statistics'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Orders</h3>
              <div className="text-3xl font-bold text-primary">1,234</div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'This month'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Products</h3>
              <div className="text-3xl font-bold text-primary">567</div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Total products' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Customers</h3>
              <div className="text-3xl font-bold text-primary">89</div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Total customers' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Revenue</h3>
              <div className="text-3xl font-bold text-primary">$12,345</div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Total revenue' : 'This month'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <div className="font-medium">Order #1234</div>
                    <div className="text-sm text-muted-foreground">2 hours ago</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$99.99</div>
                    <div className="text-sm text-green-600">Completed</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div>
                    <div className="font-medium">Order #1235</div>
                    <div className="text-sm text-muted-foreground">4 hours ago</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$149.99</div>
                    <div className="text-sm text-yellow-600">Processing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Low Stock Alerts</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <div className="font-medium text-red-800">Product A</div>
                    <div className="text-sm text-red-600">SKU: ABC123</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-800">5 left</div>
                    <div className="text-sm text-red-600">Critical</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <div className="font-medium text-yellow-800">Product B</div>
                    <div className="text-sm text-yellow-600">SKU: DEF456</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-yellow-800">12 left</div>
                    <div className="text-sm text-yellow-600">Warning</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isAdmin() && (
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Store Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent rounded-lg">
                  <div className="font-medium">Store 1</div>
                  <div className="text-sm text-muted-foreground">123 orders this month</div>
                  <div className="text-sm text-green-600">Connected</div>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <div className="font-medium">Store 2</div>
                  <div className="text-sm text-muted-foreground">89 orders this month</div>
                  <div className="text-sm text-green-600">Connected</div>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <div className="font-medium">Store 3</div>
                  <div className="text-sm text-muted-foreground">67 orders this month</div>
                  <div className="text-sm text-red-600">Disconnected</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
