"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useSupportTickets, useUpdateSupportTicket, useSupportTicketMessages, useSendSupportMessage } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function SupportPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch support tickets data
  const { 
    data: ticketsData, 
    isLoading,
    error
  } = useSupportTickets({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; subject: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string; assignedTo?: string; store?: { name: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  // Fetch messages for selected ticket
  const { 
    data: messagesData, 
    isLoading: messagesLoading
  } = useSupportTicketMessages(selectedTicket || '') as { data: Array<{ id: string; message: string; isInternal: boolean; createdAt: string; author: { name: string; role: string } }> | undefined; isLoading: boolean; error: ApiError | null };

  const updateTicket = useUpdateSupportTicket();
  const sendMessage = useSendSupportMessage();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading support tickets...</div>
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
            <div className="text-red-500 text-lg">Error loading support tickets</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const tickets = ticketsData?.data || [];
  const totalTickets = ticketsData?.pagination?.total || 0;
  const totalPages = ticketsData?.pagination?.pages || 1;
  const messages = messagesData || [];

  // Calculate statistics
  const statusCounts = tickets.reduce((acc: Record<string, number>, ticket: { id: string; subject: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string; assignedTo?: string; store?: { name: string } }) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = tickets.reduce((acc: Record<string, number>, ticket: { id: string; subject: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string; assignedTo?: string; store?: { name: string } }) => {
    acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);


  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        data: { status: newStatus }
      });
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    
    try {
      await sendMessage.mutateAsync({
        ticketId: selectedTicket,
        message: newMessage,
        attachments
      });
      setNewMessage("");
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Support Center</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all support tickets across all stores' : 'View and manage your support tickets'}
              </p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Create Ticket
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Tickets</h3>
              <div className="text-3xl font-bold text-primary">
                {totalTickets}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'Your tickets'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Open</h3>
              <div className="text-3xl font-bold text-yellow-600">
                {statusCounts['open'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Awaiting response</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">In Progress</h3>
              <div className="text-3xl font-bold text-blue-600">
                {statusCounts['in_progress'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Being worked on</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Closed</h3>
              <div className="text-3xl font-bold text-green-600">
                {statusCounts['closed'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Low Priority</h4>
              <div className="text-2xl font-bold text-gray-600">{priorityCounts['low'] || 0}</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Medium Priority</h4>
              <div className="text-2xl font-bold text-blue-600">{priorityCounts['medium'] || 0}</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">High Priority</h4>
              <div className="text-2xl font-bold text-orange-600">{priorityCounts['high'] || 0}</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Urgent</h4>
              <div className="text-2xl font-bold text-red-600">{priorityCounts['urgent'] || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-2">
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Support Tickets</h3>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm">Export</button>
                    <button className="btn btn-outline btn-sm">Filter</button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {tickets.map((ticket: { id: string; subject: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string; assignedTo?: string; store?: { name: string } }) => (
                    <div 
                      key={ticket.id} 
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTicket === ticket.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setSelectedTicket(ticket.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-foreground">{ticket.subject}</h4>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'closed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {isAdmin() && ticket.assignedTo && (
                          <span>Assigned to: {ticket.assignedTo}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No support tickets found
                    </div>
                  )}
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
            </div>

            {/* Ticket Details */}
            <div className="lg:col-span-1">
              {selectedTicket ? (
                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Ticket Details</h3>
                    <ProtectedComponent permission="support.manage">
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => handleStatusUpdate(selectedTicket, e.target.value)}
                          className="btn btn-sm btn-outline"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </ProtectedComponent>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {messagesLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-sm"></div>
                      </div>
                    ) : (
                      messages.map((message: { id: string; message: string; isInternal: boolean; createdAt: string; author: { name: string; role: string } }) => (
                        <div key={message.id} className={`p-3 rounded-lg ${
                          message.isInternal ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium">{message.author.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{message.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Form */}
                  <div className="space-y-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="form-textarea"
                      rows={3}
                    />
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="form-input"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="btn btn-primary btn-sm w-full"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-card p-6 rounded-lg border border-border text-center">
                  <div className="text-4xl mb-4">💬</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Select a Ticket</h3>
                  <p className="text-muted-foreground">
                    Choose a ticket from the list to view details and messages
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Create Ticket Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Create Support Ticket</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter ticket subject"
                    />
                  </div>
                  <div>
                    <label className="form-label">Priority</label>
                    <select className="form-select">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      placeholder="Describe your issue in detail"
                    />
                  </div>
                  <div>
                    <label className="form-label">Attachments</label>
                    <input
                      type="file"
                      multiple
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button className="btn btn-primary">Create Ticket</button>
                  <button 
                    onClick={() => setShowCreateModal(false)}
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