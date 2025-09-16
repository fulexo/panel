"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { useToast } from "../../components/ui/toast";

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
  const { success: showSuccess, error: showError } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
  const [showChat, setShowChat] = useState(false);

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadTickets = async () => {
    try {
      setLoading(true);
      
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
      showError('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    
    try {
      setSaving(true);
      
      const response = await api('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(newTicket)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      showSuccess('Success', 'Ticket created successfully');
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
      setShowNewTicket(false);
      await loadTickets();
    } catch (err: any) {
      showError('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async (ticketId: string) => {
    if (!newMessage.trim()) return;
    
    try {
      setSaving(true);
      
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

      showSuccess('Success', 'Message sent successfully');
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
      showError('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      setSaving(true);
      
      const response = await api(`/support/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket');
      }

      showSuccess('Success', 'Ticket status updated successfully');
      await loadTickets();
    } catch (err: any) {
      showError('Error', err.message);
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg">Loading support tickets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className={`mobile-container py-6 space-y-6 transition-all duration-300 ${showChat ? 'lg:mr-96' : ''}`}>
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Support Center</h1>
            <p className="page-subtitle">Manage support tickets and customer inquiries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTicket(true)}
              className="btn-primary btn-mobile"
            >
              New Ticket
            </button>
            <span className="text-sm text-muted-foreground">
              {totalTickets} total tickets
            </span>
          </div>
        </div>


        {/* Filters */}
        <div className="desktop-card p-4">
          <div className="desktop-form-row-3">
            <div className="form-field">
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-field">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="form-select"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-field">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-select"
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
        <div className="table-container">
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
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowChat(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Chat
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
            <div className="desktop-card p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Create New Ticket</h3>
              
              <div className="desktop-form">
                <div className="form-field">
                  <label className="form-label">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="Brief description of your issue..."
                    className="form-input"
                  />
                </div>
                
                <div className="desktop-form-row">
                  <div className="form-field">
                    <label className="form-label">
                      Category
                    </label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as any })}
                      className="form-select"
                    >
                      <option value="general">General</option>
                      <option value="technical">Technical</option>
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="returns">Returns</option>
                    </select>
                  </div>
                  
                  <div className="form-field">
                    <label className="form-label">
                      Priority
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-field">
                  <label className="form-label">
                    Description
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Please provide detailed information about your issue..."
                    className="form-textarea"
                    rows={5}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={createTicket}
                  disabled={!newTicket.subject.trim() || !newTicket.description.trim() || saving}
                  className="btn-primary btn-mobile"
                >
                  {saving ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  onClick={() => {
                    setShowNewTicket(false);
                    setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
                  }}
                  className="btn-secondary btn-mobile"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Sidebar */}
        {showChat && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 z-50 lg:bg-transparent lg:relative lg:z-auto">
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 lg:relative lg:z-auto">
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        Ticket #{selectedTicket.id.slice(0, 8)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1).replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                          <span>{getPriorityIcon(selectedTicket.priority)}</span>
                          {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowChat(false);
                        setSelectedTicket(null);
                      }}
                      className="p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Ticket Info */}
                <div className="p-4 border-b border-border">
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Subject</label>
                      <div className="text-sm text-foreground font-medium">
                        {selectedTicket.subject}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <div className="text-sm text-foreground bg-muted p-2 rounded">
                        {selectedTicket.description}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedTicket.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs p-3 rounded-lg ${
                        message.senderRole === 'ADMIN' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-foreground'
                      }`}>
                        <div className="text-xs opacity-70 mb-1">
                          {message.senderName}
                          {message.senderRole === 'ADMIN' && ' (Admin)'}
                        </div>
                        <div className="text-sm">
                          {message.message}
                        </div>
                        {message.attachments.length > 0 && (
                          <div className="mt-2">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="text-xs opacity-70">
                                📎 {attachment}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="space-y-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="form-textarea"
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        onChange={(e) => setMessageFile(e.target.files?.[0] || null)}
                        className="text-sm text-foreground flex-1"
                      />
                      <button
                        onClick={() => sendMessage(selectedTicket.id)}
                        disabled={!newMessage.trim() || saving}
                        className="btn-primary"
                      >
                        {saving ? 'Sending...' : 'Send'}
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
  );
}