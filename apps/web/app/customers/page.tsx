"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useCustomers, useDeleteCustomer, useCreateCustomer, useUpdateCustomer, useStores } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  ChevronLeft, 
  ChevronRight,
  Mail,
  Phone,
  ShoppingBag,
  AlertTriangle,
  UserPlus,
  Building,
  Crown,
  User
} from "lucide-react";
import { SectionShell } from "@/components/patterns/SectionShell";
import { Button } from "@/components/ui/button";

export default function CustomersPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'CUSTOMER' as 'ADMIN' | 'CUSTOMER',
    password: '',
    confirmPassword: '',
    assignedStores: [] as string[],
    isActive: true,
    notificationPreferences: {
      email: true,
      sms: false,
      push: true
    }
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [storeSearchTerm, setStoreSearchTerm] = useState("");

  // API hooks
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch stores data (for admin store filter and assignment)
  const { data: storesData } = useStores();
  const stores = (storesData as any)?.data || [];
  
  // Check authentication status
  useEffect(() => {
    if (!user) {
      setAuthError('Please login to access customer management');
    } else {
      setAuthError(null);
    }
  }, [user]);
  
  // Fetch customers data (panel users, not WooCommerce customers)
  const { 
    data: customersData, 
    isLoading,
    error
  } = useCustomers({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    // For admin users, allow store filtering. For customers, use their store
    ...(isAdmin() && storeFilter ? { storeId: storeFilter } : {}),
    ...(!isAdmin() && userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<any>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  // Form handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const handleStoreAssignment = (storeId: string, isAssigned: boolean) => {
    if (isAssigned) {
      setFormData(prev => ({
        ...prev,
        assignedStores: [...prev.assignedStores, storeId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assignedStores: prev.assignedStores.filter(id => id !== storeId)
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) errors['email'] = 'Email is required';
    if (!formData.firstName.trim()) errors['firstName'] = 'First name is required';
    if (!formData.lastName.trim()) errors['lastName'] = 'Last name is required';
    
    if (!editingCustomer) {
      if (!formData.password) errors['password'] = 'Password is required';
      if (formData.password !== formData.confirmPassword) errors['confirmPassword'] = 'Passwords do not match';
      if (formData.password && formData.password.length < 6) errors['password'] = 'Password must be at least 6 characters';
    }
    
    if (isAdmin() && formData.assignedStores.length === 0) {
      errors['assignedStores'] = 'At least one store must be assigned';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'CUSTOMER',
      password: '',
      confirmPassword: '',
      assignedStores: [],
      isActive: true,
      notificationPreferences: {
        email: true,
        sms: false,
        push: true
      }
    });
    setFormErrors({});
    setStoreSearchTerm("");
  };

  // Filter stores based on search term
  const filteredStores = stores.filter((store: any) => 
    store.name?.toLowerCase().includes(storeSearchTerm.toLowerCase()) ||
    store.url?.toLowerCase().includes(storeSearchTerm.toLowerCase())
  );

  const handleCreateCustomer = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);
    
    try {
      const customerData = {
        ...formData,
        stores: formData.assignedStores,
        storeId: formData.assignedStores[0] || '',
      };
      
      await createCustomer.mutateAsync(customerData);
      setSuccess('Customer created successfully!');
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      setErrorMessage(error?.message || 'Failed to create customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!validateForm() || !editingCustomer) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);
    
    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        stores: formData.assignedStores,
        notificationPreferences: formData.notificationPreferences,
        ...(formData.password && { password: formData.password }),
      };
      
      await updateCustomer.mutateAsync({ id: editingCustomer.id, data: updateData });
      setSuccess('Customer updated successfully!');
      setEditingCustomer(null);
      resetForm();
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      setErrorMessage(error?.message || 'Failed to update customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      email: customer.email || '',
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      role: customer.role || 'CUSTOMER',
      password: '',
      confirmPassword: '',
      assignedStores: customer.stores?.map((s: any) => s.id) || [],
      isActive: customer.isActive !== false,
      notificationPreferences: customer.notificationPreferences || {
        email: true,
        sms: false,
        push: true
      }
    });
  };

  // Show auth error if not logged in
  if (authError || !user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <SectionShell
            title="Authentication Required"
            description="Please login to access customer management"
            className="max-w-md mx-auto"
          >
            <Button 
              onClick={() => window.location.href = '/login'} 
              variant="default"
            >
              Go to Login
            </Button>
          </SectionShell>
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <SectionShell
            title="Loading customers..."
            description="Please wait while we fetch customer data"
          >
            <div className="spinner"></div>
          </SectionShell>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <SectionShell
            title="Customers API Error"
            description={error instanceof ApiError ? error.message : 'Failed to load customers data'}
            className="max-w-md mx-auto"
          >
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-6">
                {error instanceof ApiError && error.message.includes('token') ? 
                  'Authentication token missing. Please login again.' :
                  'This usually happens when your session has expired or the API server is not responding.'
                }
              </div>
              <div className="text-xs bg-muted/20 p-3 rounded-lg mb-6">
                <strong>Debug Info:</strong><br/>
                User: {user ? `${user.email} (${user.role})` : 'Not logged in'}<br/>
                Store: {userStoreId || 'No store assigned'}<br/>
                Error: {error instanceof ApiError ? `${error.status} - ${error.message}` : 'Unknown error'}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="default"
                  className="flex-1"
                >
                  Retry
                </Button>
                <button 
                  onClick={() => {
                    sessionStorage.clear();
                    localStorage.clear();
                    window.location.href = '/login';
                  }} 
                  className="btn btn-outline flex-1"
                >
                  Re-login
                </button>
              </div>
            </div>
          </SectionShell>
        </div>
      </ProtectedRoute>
    );
  }

  const customers = customersData?.data || [];
  const totalCustomers = customersData?.pagination?.total || 0;
  const totalPages = customersData?.pagination?.pages || 1;

  // Calculate statistics with null safety
  const adminCount = customers.filter((c: any) => (c.role || '').toUpperCase() === 'ADMIN').length;
  const customerCount = customers.filter((c: any) => (c.role || 'CUSTOMER').toUpperCase() === 'CUSTOMER').length;
  const activeCount = customers.filter((c: any) => c.isActive !== false).length;
  const inactiveCount = customers.filter((c: any) => c.isActive === false).length;
  
  console.log('Customer stats debug:', { 
    total: customers.length, 
    adminCount, 
    customerCount, 
    customers: customers.map(c => ({ email: c.email, role: c.role })) 
  });

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                Panel Users
              </h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage your customer accounts and store assignments' : 'View customer information'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ProtectedComponent permission="customers.manage">
              <button 
                onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16"
              >
                  <UserPlus className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Add Customer</span>
              </button>
            </ProtectedComponent>
              <button 
                onClick={() => {
                  if (customers.length === 0) {
                    setErrorMessage('No customers to export.');
                    return;
                  }
                  
                  const csvData = customers.map((c: any) => ({
                    Name: `${c.firstName || 'Unknown'} ${c.lastName || 'Name'}`,
                    Email: c.email || 'No email',
                    Role: c.role || 'CUSTOMER',
                    Status: c.isActive !== false ? 'Active' : 'Inactive',
                    Stores: c.stores?.map((s: any) => s.name).join('; ') || 'No stores',
                    LastLogin: c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleDateString() : 'Never',
                    Created: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
                  }));
                  
                  const csv = csvData.length > 0 && csvData[0] ? [
                    Object.keys(csvData[0]).join(','),
                    ...csvData.map(row => Object.values(row || {}).join(','))
                  ].join('\n') : 'No data to export';
                  
                  const blob = new window.Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `panel-customers-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
              >
                <Download className="h-5 w-5" />
                <span className="text-xs font-medium leading-tight">Export</span>
              </button>
              <button 
                onClick={() => {
                  setSearch("");
                  setStoreFilter("");
                  setRoleFilter("");
                  setPage(1);
                  window.location.reload();
                }}
                className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
              >
                <RefreshCw className="h-5 w-5" />
                <span className="text-xs font-medium leading-tight">Refresh</span>
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {errorMessage}
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {success}
                <button 
                  onClick={() => setSuccess(null)}
                  className="ml-auto text-green-500 hover:text-green-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Filters */}
          <div className="p-4 sm:p-6 bg-muted/40 rounded-xl border border-border shadow-sm">
            <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
                    placeholder="Search customers by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[140px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="">All Roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="CUSTOMER">Customer</option>
                  </select>
                </div>
                {isAdmin() && (
                  <div className="relative w-full sm:w-auto sm:min-w-[180px]">
                    <ShoppingBag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={storeFilter}
                      onChange={(e) => setStoreFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">All Stores ({stores.length})</option>
                      {stores.map((store: any) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                  <p className="text-xs text-muted-foreground">Panel user accounts</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-2xl font-bold">{adminCount}</p>
                  <p className="text-xs text-muted-foreground">Full access users</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{customerCount}</p>
                  <p className="text-xs text-muted-foreground">Store owners</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">{inactiveCount} inactive</p>
                </div>
              </div>
            </div>
          </div>
            
          {/* Customers Table */}
          <div className="p-4 sm:p-6 bg-muted/40 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Panel Customers</h3>
                <p className="text-sm text-muted-foreground">
                  Your customer accounts with store access and permissions
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50 dark:bg-muted/20">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider min-w-[200px]">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider min-w-[180px]">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider min-w-[200px]">
                        Assigned Stores
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider min-w-[100px]">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider min-w-[120px]">
                        Last Login
                      </th>
                    <ProtectedComponent permission="customers.manage">
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider min-w-[200px]">
                          Actions
                        </th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {customers.map((customer: any) => (
                      <tr key={customer.id} className="hover:bg-muted/20 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {(customer.firstName || 'U').charAt(0)}{(customer.lastName || 'N').charAt(0)}
                            </span>
                          </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-foreground">
                                  {(customer.firstName || 'Unknown') + ' ' + (customer.lastName || 'Name')}
                                </div>
                                {customer.role === 'ADMIN' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                    <Crown className="h-2.5 w-2.5 mr-0.5" />
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {customer.id?.slice(0, 8) || 'N/A'}
                              </div>
                          </div>
                        </div>
                      </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {customer.email || 'No email'}
                          </div>
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                      </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {customer.stores && customer.stores.length > 0 ? (
                              customer.stores.map((store: any) => (
                                <span key={store.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent text-accent-foreground">
                                  <Building className="h-3 w-3 mr-1" />
                                  {store.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No stores assigned</span>
                            )}
                          </div>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                            customer.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {customer.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <ProtectedComponent permission="customers.manage">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setViewingCustomer(customer)}
                                className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-foreground bg-background hover:bg-muted/50 dark:hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </button>
                              <button 
                                onClick={() => handleEditCustomer(customer)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                            <button 
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`)) {
                                    deleteCustomer.mutate(customer.id);
                                  }
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No customers found</p>
                            <p className="text-sm text-muted-foreground">
                              {search || roleFilter || storeFilter ? 
                                'Try adjusting your filters to see more customers.' :
                                'Get started by adding your first customer.'
                              }
                            </p>
                          </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCustomers)} of {totalCustomers} customers
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                    className="btn btn-outline btn-sm flex items-center gap-2 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] h-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs font-medium">Prev</span>
                </button>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 min-w-[32px] h-8 ${
                            page === pageNum
                              ? 'bg-primary text-primary-foreground shadow-lg'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                    className="btn btn-outline btn-sm flex items-center gap-2 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] h-8"
                >
                    <span className="text-xs font-medium">Next</span>
                    <ChevronRight className="h-4 w-4" />
                </button>
                </div>
              </div>
            )}
          </div>

          {/* Create Customer Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                  <div>
                      <h3 className="text-xl font-semibold text-foreground">Add New Customer</h3>
                      <p className="text-sm text-muted-foreground">Create a new panel user account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">First Name *</label>
                    <input
                      type="text"
                        className={`form-input ${formErrors['firstName'] ? 'border-red-500' : ''}`}
                      placeholder="Enter first name"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                      {formErrors['firstName'] && <p className="text-red-500 text-sm mt-1">{formErrors['firstName']}</p>}
                  </div>
                  <div>
                      <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                        className={`form-input ${formErrors['lastName'] ? 'border-red-500' : ''}`}
                      placeholder="Enter last name"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                      {formErrors['lastName'] && <p className="text-red-500 text-sm mt-1">{formErrors['lastName']}</p>}
                  </div>
                  <div>
                      <label className="form-label">Email *</label>
                    <input
                      type="email"
                        className={`form-input ${formErrors['email'] ? 'border-red-500' : ''}`}
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                      {formErrors['email'] && <p className="text-red-500 text-sm mt-1">{formErrors['email']}</p>}
                  </div>
                  <div>
                      <label className="form-label">Role *</label>
                      <select 
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                      >
                        <option value="CUSTOMER">Customer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Password *</label>
                    <input
                        type="password"
                        className={`form-input ${formErrors['password'] ? 'border-red-500' : ''}`}
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                      />
                      {formErrors['password'] && <p className="text-red-500 text-sm mt-1">{formErrors['password']}</p>}
                  </div>
                    <div>
                      <label className="form-label">Confirm Password *</label>
                      <input
                        type="password"
                        className={`form-input ${formErrors['confirmPassword'] ? 'border-red-500' : ''}`}
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      />
                      {formErrors['confirmPassword'] && <p className="text-red-500 text-sm mt-1">{formErrors['confirmPassword']}</p>}
                </div>
                  </div>

                  {/* Store Assignment */}
                  <div>
                    <label className="form-label">Store Assignment *</label>
                    <div className={`border rounded-lg p-4 ${formErrors['assignedStores'] ? 'border-red-500' : 'border-border'}`}>
                      {/* Store Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search stores by name or URL..."
                            value={storeSearchTerm}
                            onChange={(e) => setStoreSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formData.assignedStores.length} of {stores.length} stores selected
                          </p>
                          <div className="flex gap-2">
                  <button 
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStores: filteredStores.map((s: any) => s.id)
                                }));
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Select All ({filteredStores.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStores: []
                                }));
                              }}
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {filteredStores.map((store: any) => (
                          <label key={store.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors duration-200">
                            <input
                              type="checkbox"
                              checked={formData.assignedStores.includes(store.id)}
                              onChange={(e) => handleStoreAssignment(store.id, e.target.checked)}
                              className="form-checkbox text-primary"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground">{store.name}</div>
                              <div className="text-xs text-muted-foreground">{store.url || 'No URL'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      {filteredStores.length === 0 && storeSearchTerm && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No stores found matching "{storeSearchTerm}"
                        </p>
                      )}
                      
                      {stores.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No stores available</p>
                      )}
                    </div>
                    {formErrors['assignedStores'] && <p className="text-red-500 text-sm mt-1">{formErrors['assignedStores']}</p>}
                  </div>

                  {/* Account Settings */}
                  <div>
                    <label className="form-label">Account Settings</label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => handleInputChange('isActive', e.target.checked)}
                          className="form-checkbox text-primary"
                        />
                        <span className="text-sm text-foreground">Account is active</span>
                      </label>
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div>
                    <label className="form-label">Notification Preferences</label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.email}
                          onChange={(e) => handleInputChange('notificationPreferences', {
                            ...formData.notificationPreferences,
                            email: e.target.checked
                          })}
                          className="form-checkbox text-primary"
                        />
                        <span className="text-sm text-foreground">Email notifications</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.push}
                          onChange={(e) => handleInputChange('notificationPreferences', {
                            ...formData.notificationPreferences,
                            push: e.target.checked
                          })}
                          className="form-checkbox text-primary"
                        />
                        <span className="text-sm text-foreground">Push notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={handleCreateCustomer}
                    disabled={isSubmitting || createCustomer.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {isSubmitting || createCustomer.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Customer...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Customer Account
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    disabled={isSubmitting || createCustomer.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Customer Modal */}
          {editingCustomer && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Edit className="h-6 w-6 text-primary" />
                    </div>
                  <div>
                      <h3 className="text-xl font-semibold text-foreground">Edit Customer</h3>
                      <p className="text-sm text-muted-foreground">Update customer account and store assignments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCustomer(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">First Name *</label>
                    <input
                      type="text"
                        className={`form-input ${formErrors['firstName'] ? 'border-red-500' : ''}`}
                      placeholder="Enter first name"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                      {formErrors['firstName'] && <p className="text-red-500 text-sm mt-1">{formErrors['firstName']}</p>}
                  </div>
                  <div>
                      <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                        className={`form-input ${formErrors['lastName'] ? 'border-red-500' : ''}`}
                      placeholder="Enter last name"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                      {formErrors['lastName'] && <p className="text-red-500 text-sm mt-1">{formErrors['lastName']}</p>}
                  </div>
                  <div>
                      <label className="form-label">Email *</label>
                    <input
                      type="email"
                        className={`form-input ${formErrors['email'] ? 'border-red-500' : ''}`}
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                      {formErrors['email'] && <p className="text-red-500 text-sm mt-1">{formErrors['email']}</p>}
                  </div>
                  <div>
                      <label className="form-label">Role *</label>
                      <select 
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                      >
                        <option value="CUSTOMER">Customer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">New Password {!editingCustomer && '*'}</label>
                    <input
                        type="password"
                        className={`form-input ${formErrors['password'] ? 'border-red-500' : ''}`}
                        placeholder={editingCustomer ? "Leave empty to keep current password" : "Enter password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                      />
                      {formErrors['password'] && <p className="text-red-500 text-sm mt-1">{formErrors['password']}</p>}
                  </div>
                    {formData.password && (
                      <div>
                        <label className="form-label">Confirm Password *</label>
                        <input
                          type="password"
                          className={`form-input ${formErrors['confirmPassword'] ? 'border-red-500' : ''}`}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        />
                        {formErrors['confirmPassword'] && <p className="text-red-500 text-sm mt-1">{formErrors['confirmPassword']}</p>}
                </div>
                    )}
                  </div>

                  {/* Store Assignment */}
                  <div>
                    <label className="form-label">Store Assignment *</label>
                    <div className={`border rounded-lg p-4 ${formErrors['assignedStores'] ? 'border-red-500' : 'border-border'}`}>
                      {/* Store Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search stores by name or URL..."
                            value={storeSearchTerm}
                            onChange={(e) => setStoreSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formData.assignedStores.length} of {stores.length} stores selected
                          </p>
                          <div className="flex gap-2">
                  <button 
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStores: filteredStores.map((s: any) => s.id)
                                }));
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Select All ({filteredStores.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStores: []
                                }));
                              }}
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {filteredStores.map((store: any) => (
                          <label key={store.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors duration-200">
                            <input
                              type="checkbox"
                              checked={formData.assignedStores.includes(store.id)}
                              onChange={(e) => handleStoreAssignment(store.id, e.target.checked)}
                              className="form-checkbox text-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{store.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{store.url || 'No URL'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      {filteredStores.length === 0 && storeSearchTerm && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No stores found matching "{storeSearchTerm}"
                        </p>
                      )}
                      
                      {stores.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No stores available</p>
                      )}
                    </div>
                    {formErrors['assignedStores'] && <p className="text-red-500 text-sm mt-1">{formErrors['assignedStores']}</p>}
                  </div>

                  {/* Account Settings */}
                  <div>
                    <label className="form-label">Account Settings</label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => handleInputChange('isActive', e.target.checked)}
                          className="form-checkbox text-primary"
                        />
                        <span className="text-sm text-foreground">Account is active</span>
                      </label>
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div>
                    <label className="form-label">Notification Preferences</label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.email}
                          onChange={(e) => handleInputChange('notificationPreferences', {
                            ...formData.notificationPreferences,
                            email: e.target.checked
                          })}
                          className="form-checkbox text-primary"
                        />
                        <span className="text-sm text-foreground">Email notifications</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.notificationPreferences.push}
                          onChange={(e) => handleInputChange('notificationPreferences', {
                            ...formData.notificationPreferences,
                            push: e.target.checked
                          })}
                          className="form-checkbox text-primary"
                        />
                        <span className="text-sm text-foreground">Push notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={handleUpdateCustomer}
                    disabled={isSubmitting || updateCustomer.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {isSubmitting || updateCustomer.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating Customer...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update Customer Account
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCustomer(null);
                      resetForm();
                    }}
                    disabled={isSubmitting || updateCustomer.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Customer Modal */}
          {viewingCustomer && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Customer Details</h3>
                      <p className="text-sm text-muted-foreground">View customer account information</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingCustomer(null)}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {(viewingCustomer.firstName || 'U').charAt(0)}{(viewingCustomer.lastName || 'N').charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">
                        {(viewingCustomer.firstName || 'Unknown') + ' ' + (viewingCustomer.lastName || 'Name')}
                      </h4>
                      <p className="text-sm text-muted-foreground">{viewingCustomer.email}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                        viewingCustomer.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {viewingCustomer.role === 'ADMIN' ? (
                          <><Crown className="h-3 w-3 mr-1" />Admin</>
                        ) : (
                          <><User className="h-3 w-3 mr-1" />Customer</>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                      <p className={`text-lg font-semibold ${
                        viewingCustomer.isActive !== false ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {viewingCustomer.isActive !== false ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                      <p className="text-lg text-foreground">
                        {viewingCustomer.lastLoginAt ? new Date(viewingCustomer.lastLoginAt).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                      <p className="text-lg text-foreground">
                        {viewingCustomer.createdAt ? new Date(viewingCustomer.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Failed Login Attempts</label>
                      <p className="text-lg text-foreground">{viewingCustomer.failedAttempts || 0}</p>
                    </div>
                  </div>

                  {/* Assigned Stores */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned Stores</label>
                    <div className="mt-2">
                      {viewingCustomer.stores && viewingCustomer.stores.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {viewingCustomer.stores.map((store: any) => (
                            <div key={store.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                              <Building className="h-5 w-5 text-primary" />
                              <div>
                                <div className="text-sm font-medium text-foreground">{store.name}</div>
                                <div className="text-xs text-muted-foreground">{store.url || 'No URL'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No stores assigned</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={() => {
                      setViewingCustomer(null);
                      handleEditCustomer(viewingCustomer);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Customer
                  </button>
                  <button 
                    onClick={() => setViewingCustomer(null)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
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