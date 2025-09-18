"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function SupportPage() {
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
            <div className="text-lg text-foreground">Loading support...</div>
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
              <h1 className="mobile-heading text-foreground">Support Center</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all support tickets across all stores' : 'Manage your support tickets'}
              </p>
            </div>
            <ProtectedComponent permission="support.manage">
              <button className="btn btn-primary">
                New Ticket
              </button>
            </ProtectedComponent>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">My Tickets</h3>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎫</div>
                <p className="text-muted-foreground">
                  {isAdmin() 
                    ? 'View all support tickets from all stores'
                    : 'View your support tickets'
                  }
                </p>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Knowledge Base</h3>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-muted-foreground">
                  Browse help articles and documentation
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-8 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Support Tickets</h3>
              <ProtectedComponent permission="support.manage">
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm">Export</button>
                  <button className="btn btn-outline btn-sm">Filter</button>
                </div>
              </ProtectedComponent>
            </div>
            
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🆘</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Support Center</h3>
              <p className="text-muted-foreground">
                {isAdmin() 
                  ? 'This page is under development. Support management functionality will be available soon.'
                  : 'You can manage your support tickets here. Create new tickets and track their status.'
                }
              </p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
