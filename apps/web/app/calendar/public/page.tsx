"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function PublicCalendarPage() {
  const router = useRouter();
  const { user } = useAuth();
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
            <div className="text-lg text-foreground">Loading...</div>
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
              <h1 className="mobile-heading text-foreground">Public Calendar</h1>
              <p className="text-muted-foreground mobile-text">
                Public calendar view
              </p>
            </div>
          </div>

          <div className="bg-card p-8 rounded-lg border border-border text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Public Calendar</h3>
            <p className="text-muted-foreground">
              This page is under development. Public calendar functionality will be available soon.
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}