"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function CustomersPage() {
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
            <div className="text-lg text-foreground">Loading customers...</div>
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
              <h1 className="mobile-heading text-foreground">Customers Management</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all customers across all stores' : 'View your store customers'}
              </p>
            </div>
            <ProtectedComponent permission="customers.manage">
              <button className="btn btn-primary">
                Add Customer
              </button>
            </ProtectedComponent>
          </div>

          <div className="bg-card p-8 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Customers</h3>
              <ProtectedComponent permission="customers.manage">
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm">Export</button>
                  <button className="btn btn-outline btn-sm">Import</button>
                </div>
              </ProtectedComponent>
            </div>
            
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Customers Management</h3>
              <p className="text-muted-foreground">
                {isAdmin() 
                  ? 'This page is under development. Customer management functionality will be available soon.'
                  : 'You can view your customers here. Management functions are not available for customers.'
                }
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
