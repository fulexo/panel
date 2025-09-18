"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useSupportTicket, useUpdateSupportTicket, useSupportTicketMessages, useSendSupportMessage } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function SupportTicketDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const ticketId = params.id as string;
  
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading ticket details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !ticket) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading ticket</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Ticket not found'}
            </div>
          </div>
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
      console.error('Failed to update ticket status:', error);
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
      console.error('Failed to send message:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Ticket Status</h3>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
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
              </div>

              {/* Ticket Description */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Ticket Description</h3>
                <div className="prose max-w-none">
                  <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Messages</h3>
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
              </div>

              {/* Reply Form */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Reply to Ticket</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Message</label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="form-textarea"
                      rows={4}
                      placeholder="Type your message here..."
                    />
                  </div>
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
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Customer Information</h3>
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
              </div>

              {/* Ticket Details */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Ticket Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
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
              </div>

              {/* Quick Actions */}
              <ProtectedComponent permission="support.manage">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">Assign to Me</button>
                    <button className="btn btn-outline w-full">Escalate</button>
                    <button className="btn btn-outline w-full">Send Email</button>
                    <button className="btn btn-outline w-full">View Customer</button>
                  </div>
                </div>
              </ProtectedComponent>

              {/* Ticket Timeline */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Ticket Timeline</h3>
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
              </div>
            </div>
          </div>

          {/* Status Update Modal */}
          {showStatusModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Update Ticket Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">New Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Select status</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
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
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}