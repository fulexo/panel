"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
  email: string;
  phoneE164: string;
  company: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomersResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Create customer form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  
  // Edit customer
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCustomers();
  }, [currentPage, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const url = new URL('/api/customers', window.location.origin);
      url.searchParams.set('page', currentPage.toString());
      url.searchParams.set('limit', '20');
      if (searchTerm) {
        url.searchParams.set('search', searchTerm);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch customers');
      }

      const data: CustomersResponse = await response.json();
      setCustomers(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCustomers(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  const createCustomer = async () => {
    if (!name.trim() && !email.trim()) return;
    
    try {
      setCreateLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name || undefined,
          email: email || undefined,
          phoneE164: phone || undefined,
          company: company || undefined
        })
      });

      if (response.ok) {
        setName('');
        setEmail('');
        setPhone('');
        setCompany('');
        setShowCreateForm(false);
        await fetchCustomers();
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name || '');
    setEditEmail(customer.email || '');
    setEditPhone(customer.phoneE164 || '');
    setEditCompany(customer.company || '');
  };

  const updateCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editName || undefined,
          email: editEmail || undefined,
          phoneE164: editPhone || undefined,
          company: editCompany || undefined
        })
      });

      if (response.ok) {
        setEditingCustomer(null);
        await fetchCustomers();
      }
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="mobile-heading text-foreground">Customers</h1>
            <p className="text-muted-foreground mobile-text">
              Manage your customer database ({totalCustomers} customers)
            </p>
          </div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            + Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="bg-card p-4 rounded-lg border border-border animate-slide-up">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers by name, email, company, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
            >
              Search
            </button>
          </form>
        </div>

        {/* Create Customer Form */}
        {showCreateForm && (
          <div className="bg-card p-6 rounded-lg border border-border animate-slide-down">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add New Customer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 555 123 4567"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Company</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={createCustomer}
                disabled={createLoading || (!name.trim() && !email.trim())}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
              >
                {createLoading ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors btn-animate"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Customers Grid */}
        <div className="space-y-4 animate-slide-up">
          {customers.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No customers found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first customer'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg mb-1">
                        {customer.name || 'Unnamed Customer'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {customer.email || 'No email'}
                      </p>
                      {customer.company && (
                        <p className="text-sm text-muted-foreground">
                          {customer.company}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👤</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {customer.phoneE164 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📞</span>
                        <span>{customer.phoneE164}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>📅</span>
                      <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(customer)}
                      className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCustomer(customer.id)}
                      className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 animate-slide-up">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Edit Customer Modal */}
        {editingCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md animate-scale-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Edit Customer</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Company</label>
                  <input
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateCustomer}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                >
                  Update
                </button>
                <button
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors btn-animate"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

