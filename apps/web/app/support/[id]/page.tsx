"use client";

import { logger } from "@/lib/logger";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useSupportTicket, useUpdateSupportTicket, useSupportTicketMessages, useSendSupportMessage } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";
import { SectionShell } from "@/components/patterns/SectionShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";

export default function SupportTicketDetailPage() {
  const params = useParams();
  useAuth();
  useRBAC();
  const ticketId = params['id'] as string;
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const { 
    data: ticket, 
    isLoading,
    error
  } = useSupportTicket(ticketId) as { data: { 
    id: string; 
    ticketNumber: string; 
    subject: string; 
    description: string; 
    status: string; 
    priority: string; 
    category: string; 
    createdAt: string; 
    updatedAt: string; 
    customer: { 
      firstName: string; 
      lastName: string; 
      email: string; 
    }; 
    assignedTo?: { 
      firstName: string; 
      lastName: string; 
    }; 
    store?: { name: string } 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const { 
    data: messages, 
    isLoading: messagesLoading 
  } = useSupportTicketMessages(ticketId) as { data: Array<{ 
    id: string; 
    message: string; 
    sender: string; 
    senderType: string; 
    createdAt: string; 
    attachments?: Array<{ 
      id: string; 
      name: string; 
      url: string; 
    }>; 
  }> | undefined; isLoading: boolean };

  const updateSupportTicket = useUpdateSupportTicket();
  const sendSupportMessage = useSendSupportMessage();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6">
            <SectionShell
              title="Loading ticket details..."
              description="Please wait while we fetch ticket information"
            >
              <div className="spinner"></div>
            </SectionShell>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !ticket) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6">
            <SectionShell
              title="Error loading ticket"
              description={error instanceof ApiError ? error.message : 'Ticket not found'}
              className="max-w-md mx-auto"
            >
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
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
      await updateSupportTicket.mutateAsync({
        id: ticketId,
        data: { status: newStatus }
      });
      setShowStatusModal(false);
      setNewStatus("");
    } catch (error) {
      logger.error('Failed to update ticket status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await sendSupportMessage.mutateAsync({
        ticketId,
        message: newMessage
      });
      setNewMessage("");
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  };



  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Ticket #{ticket.ticketNumber}</h1>
              <p className="text-muted-foreground mobile-text">
                {ticket.subject}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline">Print</button>
              <button className="btn btn-outline">Export</button>
              <ProtectedComponent permission="support.manage">
                <button 
                  onClick={() => setShowStatusModal(true)}
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ticket Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Status */}
              <SectionShell
                title="Ticket Status"
                description="Current status and priority information"
                actions={
                  <div className="flex gap-2">
                    <StatusPill
                      label={ticket.status.toUpperCase()}
                      tone={
                        ticket.status === 'open' ? 'success' :
                        ticket.status === 'in_progress' ? 'info' :
                        ticket.status === 'pending' ? 'warning' :
                        ticket.status === 'resolved' ? 'success' :
                        'muted'
                      }
                    />
                    <StatusPill
                      label={ticket.priority.toUpperCase()}
                      tone={
                        ticket.priority === 'low' ? 'success' :
                        ticket.priority === 'medium' ? 'warning' :
                        ticket.priority === 'high' ? 'destructive' :
                        ticket.priority === 'urgent' ? 'destructive' :
                        'muted'
                      }
                    />
                  </div>
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{ticket.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{ticket.customer.firstName} {ticket.customer.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Store</p>
                    <p className="font-medium">{ticket.store?.name || 'N/A'}</p>
                  </div>
                </div>
              </SectionShell>

              {/* Ticket Description */}
              <SectionShell
                title="Ticket Description"
                description="Detailed description of the support request"
              >
                <div className="prose max-w-none">
                  <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </SectionShell>

              {/* Messages */}
              <SectionShell
                title="Messages"
                description="Conversation history and updates"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages && messages.length > 0 ? (
                      messages.map((message) => (
                        <div key={message.id} className={`p-4 rounded-lg ${
                          message.senderType === 'customer' 
                            ? 'bg-blue-50 border-l-4 border-blue-500' 
                            : 'bg-gray-50 border-l-4 border-gray-500'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              {message.senderType === 'customer' ? 'Customer' : 'Support'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap">{message.message}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-muted-foreground mb-2">Attachments:</p>
                              <div className="space-y-1">
                                {message.attachments.map((attachment) => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    📎 {attachment.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No messages yet
                      </div>
                    )}
                  </div>
                )}
              </SectionShell>

              {/* Reply Form */}
              <SectionShell
                title="Reply to Ticket"
                description="Send a message to the customer"
              >
                <FormLayout>
                  <FormTextarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendMessage}
                      className="btn btn-primary"
                      disabled={!newMessage.trim()}
                    >
                      Send Message
                    </button>
                    <button className="btn btn-outline">
                      Add Attachment
                    </button>
                  </div>
                </FormLayout>
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
                    <p className="font-medium">{ticket.customer.firstName} {ticket.customer.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{ticket.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Store</p>
                    <p className="font-medium">{ticket.store?.name || 'N/A'}</p>
                  </div>
                </div>
              </SectionShell>

              {/* Ticket Details */}
              <SectionShell
                title="Ticket Details"
                description="Additional ticket information and metadata"
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <StatusPill
                      label={ticket.priority.toUpperCase()}
                      tone={
                        ticket.priority === 'low' ? 'success' :
                        ticket.priority === 'medium' ? 'warning' :
                        ticket.priority === 'high' ? 'destructive' :
                        ticket.priority === 'urgent' ? 'destructive' :
                        'muted'
                      }
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{ticket.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {ticket.assignedTo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned To</span>
                      <span className="font-medium">
                        {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                      </span>
                    </div>
                  )}
                </div>
              </SectionShell>

              {/* Quick Actions */}
              <ProtectedComponent permission="support.manage">
                <SectionShell
                  title="Quick Actions"
                  description="Common actions for ticket management"
                >
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">Assign to Me</button>
                    <button className="btn btn-outline w-full">Escalate</button>
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-outline w-full">View Customer</button>
                  </div>
                </SectionShell>
              </ProtectedComponent>

              {/* Ticket Timeline */}
              <SectionShell
                title="Ticket Timeline"
                description="Status changes and important events"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Ticket Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {ticket.status === 'in_progress' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">In Progress</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {ticket.status === 'resolved' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Resolved</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.updatedAt).toLocaleString()}
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
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Ticket Status</h3>
                <FormLayout>
                  <FormSelect
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    placeholder="Select status"
                    options={[
                      { value: "open", label: "Open" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "pending", label: "Pending" },
                      { value: "resolved", label: "Resolved" },
                      { value: "closed", label: "Closed" }
                    ]}
                  />
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleStatusUpdate}
                      className="btn btn-primary"
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