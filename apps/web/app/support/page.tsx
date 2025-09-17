"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'shipping' | 'returns' | 'general';
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

interface SupportMessage {
  id: string;
  ticketId: string;
  message: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  isInternal: boolean;
  attachments: string[];
  createdAt: string;
}

export default function SupportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  
  // New ticket form
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'general' as const,
  });
  
  // Selected ticket for viewing
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageFile, setMessageFile] = useState<File | null>(null);

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => {
    const isFormData = init?.body instanceof FormData;
    return fetch(`/api${path}`, {
      credentials: 'include',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      ...init
    });
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: search,
        status: statusFilter !== 'all' ? statusFilter : '',
        priority: priorityFilter !== 'all' ? priorityFilter : '',
        category: categoryFilter !== 'all' ? categoryFilter : '',
      });

      const response = await api(`/support/tickets?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load tickets');
      }

      const data = await response.json();
      setTickets(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalTickets(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(newTicket)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      setSuccess('Ticket created successfully');
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
      setShowNewTicket(false);
      await loadTickets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('message', newMessage);
      if (messageFile) formData.append('attachment', messageFile);

      const response = await api(`/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      setNewMessage('');
      setMessageFile(null);
      await loadTickets();
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, messages: [...selectedTicket.messages, {
          id: Date.now().toString(),
          ticketId,
          message: newMessage,
          senderId: user?.id || '',
          senderName: user?.name || user?.email || 'You',
          senderRole: user?.role || 'CUSTOMER',
          isInternal: false,
          attachments: messageFile ? [messageFile.name] : [],
          createdAt: new Date().toISOString(),
        }] });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await api(`/support/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket');
      }

      setSuccess('Ticket status updated successfully');
      await loadTickets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return '🔵';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'urgent': return '🔴';
      default: return '⚪';
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentPage, search, statusFilter, priorityFilter, categoryFilter]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg">Loading support tickets...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support Center</h1>
            <p className="text-muted-foreground">Manage support tickets and customer inquiries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTicket(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 btn-mobile"
            >
              New Ticket
            </button>
            <span className="text-sm text-muted-foreground">
              {totalTickets} total tickets
            </span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="shipping">Shipping</option>
                <option value="returns">Returns</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="table-responsive">
            <table className="table-mobile">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-foreground">
                        #{ticket.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ticket.category}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-foreground">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {ticket.description}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        <span>{getPriorityIcon(ticket.priority)}</span>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-foreground">
                        {ticket.createdByName}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalTickets)} of {totalTickets} tickets
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* New Ticket Modal */}
        {showNewTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Create New Ticket</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="Brief description of your issue..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Category
                    </label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="general">General</option>
                      <option value="technical">Technical</option>
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="returns">Returns</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Priority
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Please provide detailed information about your issue..."
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                    rows={5}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={createTicket}
                  disabled={!newTicket.subject.trim() || !newTicket.description.trim() || saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 btn-mobile"
                >
                  {saving ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  onClick={() => {
                    setShowNewTicket(false);
                    setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
                  }}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 btn-mobile"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Ticket #{selectedTicket.id.slice(0, 8)}
                </h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1).replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Priority</label>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                      <span>{getPriorityIcon(selectedTicket.priority)}</span>
                      {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="text-sm text-foreground capitalize">
                      {selectedTicket.category}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <div className="text-sm text-foreground font-medium">
                    {selectedTicket.subject}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <div className="text-sm text-foreground bg-muted p-3 rounded-lg">
                    {selectedTicket.description}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Messages</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedTicket.messages.map((message) => (
                      <div key={message.id} className={`p-3 rounded-lg ${message.senderRole === 'ADMIN' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-muted'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-foreground">
                            {message.senderName}
                            {message.senderRole === 'ADMIN' && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm text-foreground">
                          {message.message}
                        </div>
                        {message.attachments.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground">Attachments:</div>
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                                📎 {attachment}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Reply</label>
                  <div className="space-y-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        onChange={(e) => setMessageFile(e.target.files?.[0] || null)}
                        className="text-sm text-foreground"
                      />
                      <button
                        onClick={() => sendMessage(selectedTicket.id)}
                        disabled={!newMessage.trim() || saving}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 btn-mobile-sm"
                      >
                        {saving ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </ProtectedRoute>
);
}