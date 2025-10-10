"use client";

import { logger } from "@/lib/logger";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useReturn, useUpdateReturnStatus } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import { ImagePlaceholder } from "@/components/patterns/ImagePlaceholder";
import { SectionShell } from "@/components/patterns/SectionShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormSelect } from "@/components/forms/FormSelect";

export default function ReturnDetailPage() {
  const params = useParams();
  useAuth();
  useRBAC();
  const returnId = params['id'] as string;
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  const { 
    data: returnData, 
    isLoading,
    error
  } = useReturn(returnId) as { data: { 
    id: string; 
    returnNumber: string; 
    orderId: string; 
    orderNumber: string; 
    status: string; 
    reason: string; 
    description: string; 
    requestedAt: string; 
    processedAt?: string; 
    refundAmount: number; 
    items: Array<{ 
      id: string; 
      productName: string; 
      sku: string; 
      quantity: number; 
      price: number; 
      reason: string; 
    }>; 
    customer: { 
      firstName: string; 
      lastName: string; 
      email: string; 
      phone: string; 
    }; 
    store?: { name: string } 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const updateReturnStatus = useUpdateReturnStatus();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6">
            <SectionShell
              title="Loading return details..."
              description="Please wait while we fetch return information"
            >
              <div className="spinner"></div>
            </SectionShell>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !returnData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6">
            <SectionShell
              title="Error loading return"
              description={error instanceof ApiError ? error.message : 'Return not found'}
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

  const handleStatusUpdate = async () => {
    try {
      await updateReturnStatus.mutateAsync({
        id: returnId,
        status: newStatus
      });
      setShowStatusModal(false);
      setNewStatus("");
    } catch (error) {
      logger.error('Failed to update return status:', error);
    }
  };


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Return #{returnData.returnNumber}</h1>
              <p className="text-muted-foreground mobile-text">
                Return request details and management
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline">Print</button>
              <button className="btn btn-outline">Export</button>
              <ProtectedComponent permission="returns.manage">
                <button 
                  onClick={() => setShowStatusModal(true)}
                  className="btn btn-outline"
                >
                  Update Status
                </button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Return Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Return Status */}
              <SectionShell
                title="Return Status"
                description="Current status and return information"
                actions={
                  <StatusPill
                    label={returnData.status.toUpperCase()}
                    tone={
                      returnData.status === 'pending' ? 'default' :
                      returnData.status === 'approved' ? 'default' :
                      returnData.status === 'rejected' ? 'default' :
                      returnData.status === 'processing' ? 'default' :
                      returnData.status === 'completed' ? 'default' :
                      'muted'
                    }
                  />
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Return Date</p>
                    <p className="font-medium">{new Date(returnData.requestedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-medium">{returnData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund Amount</p>
                    <p className="font-medium">{formatCurrency(returnData.refundAmount, currencyOptions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Items</p>
                    <p className="font-medium">{returnData.items.length}</p>
                  </div>
                </div>
              </SectionShell>

              {/* Return Items */}
              <SectionShell
                title="Return Items"
                description="Items being returned with details"
              >
                <div className="space-y-4">
                  {returnData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        {(item as any).imageUrl ? (
                          <img
                            src={(item as any).imageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImagePlaceholder className="h-full w-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productName}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        <p className="text-sm text-muted-foreground">Reason: {item.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.price, currencyOptions)}</p>
                        <p className="text-sm text-muted-foreground">each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.price * item.quantity, currencyOptions)}</p>
                        <p className="text-sm text-muted-foreground">total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionShell>

              {/* Return Details */}
              <SectionShell
                title="Return Details"
                description="Additional return information and timeline"
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Return Reason</label>
                    <p className="text-foreground">{returnData.reason}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-foreground">{returnData.description || 'No additional description provided'}</p>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Requested At</label>
                      <p className="font-medium">{new Date(returnData.requestedAt).toLocaleString()}</p>
                    </div>
                    {returnData.processedAt && (
                      <div>
                        <label className="text-sm text-muted-foreground">Processed At</label>
                        <p className="font-medium">{new Date(returnData.processedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </SectionShell>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              <SectionShell
                title="Customer Information"
                description="Customer details and contact information"
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{returnData.customer.firstName} {returnData.customer.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{returnData.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{returnData.customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Store</p>
                    <p className="font-medium">{returnData.store?.name || 'N/A'}</p>
                  </div>
                </div>
              </SectionShell>

              {/* Return Summary */}
              <SectionShell
                title="Return Summary"
                description="Summary of return items and amounts"
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>{returnData.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span>{returnData.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg">
                    <span>Refund Amount</span>
                  <span>{formatCurrency(returnData.refundAmount, currencyOptions)}</span>
                  </div>
                </div>
              </SectionShell>

              {/* Quick Actions */}
              <ProtectedComponent permission="returns.manage">
                <SectionShell
                  title="Quick Actions"
                  description="Common actions for return management"
                >
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-outline w-full">Print Label</button>
                    <button className="btn btn-outline w-full">Process Refund</button>
                    <button className="btn btn-outline w-full">View Order</button>
                  </div>
                </SectionShell>
              </ProtectedComponent>

              {/* Return Timeline */}
              <SectionShell
                title="Return Timeline"
                description="Status changes and important events"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-foreground rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Return Requested</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(returnData.requestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {returnData.status === 'approved' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-foreground rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Return Approved</p>
                        <p className="text-xs text-muted-foreground">
                          {returnData.processedAt ? new Date(returnData.processedAt).toLocaleString() : 'Pending'}
                        </p>
                      </div>
                    </div>
                  )}
                  {returnData.status === 'completed' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-foreground rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Return Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {returnData.processedAt ? new Date(returnData.processedAt).toLocaleString() : 'Pending'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </SectionShell>
            </div>
          </div>

          {/* Status Update Modal */}
          {showStatusModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border w-full max-w-md shadow-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Return Status</h3>
                <FormLayout>
                  <FormSelect
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    placeholder="Select status"
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "approved", label: "Approved" },
                      { value: "rejected", label: "Rejected" },
                      { value: "processing", label: "Processing" },
                      { value: "completed", label: "Completed" }
                    ]}
                  />
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleStatusUpdate}
                      className="btn btn-outline"
                    >
                      Update Status
                    </button>
                    <button
                      onClick={() => setShowStatusModal(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </FormLayout>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
