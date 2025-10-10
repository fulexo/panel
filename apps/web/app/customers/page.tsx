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
  User,
  X
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormCheckbox } from "@/components/forms/FormCheckbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        country: 'TR', // Default country
        ...(formData.assignedStores.length > 0 && { storeId: formData.assignedStores[0] }),
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
          <EmptyState
            icon={AlertTriangle}
            title="Authentication Required"
            description="Please login to access customer management"
          />
        </div>
      </ProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="spinner" />
            <span className="text-base font-medium">Loading customers...</span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <EmptyState
          icon={AlertTriangle}
          title="Customers API Error"
          description={error instanceof ApiError ? error.message : 'Failed to load customers data'}
        />
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header */}
          <PageHeader
            title="Panel Users"
            description={
              isAdmin()
                ? "Manage your customer accounts and store assignments"
                : "View customer information"
            }
            icon={Users}
            actions={
              <ProtectedComponent permission="customers.manage">
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Customer</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                      <DialogDescription>Create a new panel user account</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          label="First Name"
                          value={formData.firstName}
                          onChange={(event) => handleInputChange('firstName', event.target.value)}
                          placeholder="Enter first name"
                          error={formErrors['firstName']}
                        />
                        <FormField
                          label="Last Name"
                          value={formData.lastName}
                          onChange={(event) => handleInputChange('lastName', event.target.value)}
                          placeholder="Enter last name"
                          error={formErrors['lastName']}
                        />
                        <FormField
                          label="Email"
                          type="email"
                          value={formData.email}
                          onChange={(event) => handleInputChange('email', event.target.value)}
                          placeholder="Enter email address"
                          error={formErrors['email']}
                        />
                        <FormSelect
                          label="Role"
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          options={[
                            { value: "CUSTOMER", label: "Customer" },
                            { value: "ADMIN", label: "Admin" },
                          ]}
                        />
                        <FormField
                          label="Password"
                          type="password"
                          value={formData.password}
                          onChange={(event) => handleInputChange('password', event.target.value)}
                          placeholder="Enter password"
                          error={formErrors['password']}
                        />
                        <FormField
                          label="Confirm Password"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
                          placeholder="Confirm password"
                          error={formErrors['confirmPassword']}
                        />
                      </div>

                      {/* Store Assignment */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Store Assignment</label>
                        <div className="border border-border rounded-lg p-4">
                          <div className="mb-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search stores..."
                                value={storeSearchTerm}
                                onChange={(e) => setStoreSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-border"
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
                                  className="text-xs text-foreground hover:underline"
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
                                  className="text-xs text-foreground hover:underline"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                            {filteredStores.map((store: any) => (
                              <label key={store.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                                <FormCheckbox
                                  checked={formData.assignedStores.includes(store.id)}
                                  onChange={(e) => handleStoreAssignment(store.id, e.target.checked)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{store.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{store.url || 'No URL'}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Account Settings */}
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Account Settings</label>
                        <div className="space-y-3">
                          <FormCheckbox
                            checked={formData.isActive}
                            onChange={(e) => handleInputChange('isActive', e.target.checked)}
                            label="Account is active"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowCreateModal(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        onClick={handleCreateCustomer}
                        disabled={isSubmitting || createCustomer.isPending}
                      >
                        {isSubmitting || createCustomer.isPending ? "Creating..." : "Create Customer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ProtectedComponent>
            }
          />

          {/* Error/Success Messages */}
          {errorMessage && (
            <Card className="border-border bg-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-foreground" />
                  <span className="text-foreground">{errorMessage}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setErrorMessage(null)}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {success && (
            <Card className="border-border bg-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-foreground flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-background"></div>
                  </div>
                  <span className="text-foreground">{success}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSuccess(null)}
                    className="ml-auto h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Search and filter customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormField
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search customers by name or email..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <FormSelect
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  placeholder="All Roles"
                  options={[
                    { value: "", label: "All Roles" },
                    { value: "ADMIN", label: "Admin" },
                    { value: "CUSTOMER", label: "Customer" },
                  ]}
                />
                {isAdmin() && (
                  <FormSelect
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    placeholder={`All Stores (${stores.length})`}
                    options={[
                      { value: "", label: `All Stores (${stores.length})` },
                      ...stores.map((store: any) => ({
                        value: store.id,
                        label: store.name,
                      })),
                    ]}
                  />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{adminCount}</div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{customerCount}</div>
                <div className="text-sm text-muted-foreground">Customers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{activeCount}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </CardContent>
            </Card>
          </div>
            
          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Panel Customers</CardTitle>
              <CardDescription>Your customer accounts with store access and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No customers found"
                  description={
                    search || roleFilter || storeFilter ? 
                      'Try adjusting your filters to see more customers.' :
                      'Get started by adding your first customer.'
                  }
                />
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-foreground">Customer</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Contact</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Stores</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-foreground">Last Login</th>
                          <ProtectedComponent permission="customers.manage">
                            <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                          </ProtectedComponent>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer: any) => (
                          <tr key={customer.id} className="border-b border-border hover:bg-accent/5">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-foreground">
                                    {(customer.firstName || 'U').charAt(0)}{(customer.lastName || 'N').charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">
                                      {(customer.firstName || 'Unknown') + ' ' + (customer.lastName || 'Name')}
                                    </span>
                                    {customer.role === 'ADMIN' && (
                                      <Badge variant="outline" className="gap-1 text-xs">
                                        <Crown className="h-3 w-3" />
                                        Admin
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {customer.id?.slice(0, 8) || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1 text-sm text-foreground">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {customer.email || 'No email'}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {customer.stores && customer.stores.length > 0 ? (
                                  customer.stores.map((store: any) => (
                                    <Badge key={store.id} variant="outline" className="gap-1 text-xs">
                                      <Building className="h-3 w-3" />
                                      {store.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">No stores</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge variant="outline">
                                {customer.isActive !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-sm text-foreground">
                              {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleDateString() : 'Never'}
                            </td>
                            <ProtectedComponent permission="customers.manage">
                              <td className="py-4 px-4">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewingCustomer(customer)}
                                    className="gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditCustomer(customer)}
                                    className="gap-1"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`)) {
                                        deleteCustomer.mutate(customer.id);
                                      }
                                    }}
                                    className="gap-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </ProtectedComponent>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-4">
                    {customers.map((customer: any) => (
                      <Card key={customer.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                              <span className="text-lg font-medium text-foreground">
                                {(customer.firstName || 'U').charAt(0)}{(customer.lastName || 'N').charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">
                                  {(customer.firstName || 'Unknown') + ' ' + (customer.lastName || 'Name')}
                                </h3>
                                {customer.role === 'ADMIN' && (
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Crown className="h-3 w-3" />
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {customer.email || 'No email'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Stores:</span>
                              <div className="flex flex-wrap gap-1">
                                {customer.stores && customer.stores.length > 0 ? (
                                  customer.stores.map((store: any) => (
                                    <Badge key={store.id} variant="outline" className="gap-1 text-xs">
                                      <Building className="h-3 w-3" />
                                      {store.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">No stores</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Status:</span>
                              <Badge variant="outline">
                                {customer.isActive !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Last Login:</span>
                              <span className="text-sm text-foreground">
                                {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleDateString() : 'Never'}
                              </span>
                            </div>
                          </div>
                          
                          <ProtectedComponent permission="customers.manage">
                            <div className="flex gap-2 pt-4 border-t border-border">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingCustomer(customer)}
                                className="gap-1 flex-1"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCustomer(customer)}
                                className="gap-1 flex-1"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`)) {
                                    deleteCustomer.mutate(customer.id);
                                  }
                                }}
                                className="gap-1 flex-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </ProtectedComponent>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-4 border-t border-border pt-6 mt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCustomers)} of {totalCustomers} customers
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="min-w-[40px] h-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="gap-1"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Customer Modal */}
          {editingCustomer && (
            <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Customer</DialogTitle>
                  <DialogDescription>Update customer account and store assignments</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="First Name"
                      value={formData.firstName}
                      onChange={(event) => handleInputChange('firstName', event.target.value)}
                      placeholder="Enter first name"
                      error={formErrors['firstName']}
                    />
                    <FormField
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(event) => handleInputChange('lastName', event.target.value)}
                      placeholder="Enter last name"
                      error={formErrors['lastName']}
                    />
                    <FormField
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleInputChange('email', event.target.value)}
                      placeholder="Enter email address"
                      error={formErrors['email']}
                    />
                    <FormSelect
                      label="Role"
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      options={[
                        { value: "CUSTOMER", label: "Customer" },
                        { value: "ADMIN", label: "Admin" },
                      ]}
                    />
                    <FormField
                      label="New Password"
                      type="password"
                      value={formData.password}
                      onChange={(event) => handleInputChange('password', event.target.value)}
                      placeholder="Leave empty to keep current password"
                      error={formErrors['password']}
                    />
                    {formData.password && (
                      <FormField
                        label="Confirm Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
                        placeholder="Confirm password"
                        error={formErrors['confirmPassword']}
                      />
                    )}
                  </div>

                  {/* Store Assignment */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Store Assignment</label>
                    <div className="border border-border rounded-lg p-4">
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search stores..."
                            value={storeSearchTerm}
                            onChange={(e) => setStoreSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-border"
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
                              className="text-xs text-foreground hover:underline"
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
                              className="text-xs text-foreground hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {filteredStores.map((store: any) => (
                          <label key={store.id} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                            <FormCheckbox
                              checked={formData.assignedStores.includes(store.id)}
                              onChange={(e) => handleStoreAssignment(store.id, e.target.checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{store.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{store.url || 'No URL'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Account Settings */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Account Settings</label>
                    <div className="space-y-3">
                      <FormCheckbox
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        label="Account is active"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingCustomer(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleUpdateCustomer}
                    disabled={isSubmitting || updateCustomer.isPending}
                  >
                    {isSubmitting || updateCustomer.isPending ? "Updating..." : "Update Customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* View Customer Modal */}
          {viewingCustomer && (
            <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Customer Details</DialogTitle>
                  <DialogDescription>View customer account information</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-foreground">
                        {(viewingCustomer.firstName || 'U').charAt(0)}{(viewingCustomer.lastName || 'N').charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">
                        {(viewingCustomer.firstName || 'Unknown') + ' ' + (viewingCustomer.lastName || 'Name')}
                      </h4>
                      <p className="text-sm text-muted-foreground">{viewingCustomer.email}</p>
                      <Badge variant="outline" className="mt-2 gap-1">
                        {viewingCustomer.role === 'ADMIN' ? (
                          <><Crown className="h-3 w-3" />Admin</>
                        ) : (
                          <><User className="h-3 w-3" />Customer</>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                      <p className="text-lg font-semibold text-foreground">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {viewingCustomer.stores.map((store: any) => (
                            <div key={store.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                              <Building className="h-5 w-5 text-foreground" />
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
                <DialogFooter>
                  <Button 
                    onClick={() => {
                      setViewingCustomer(null);
                      handleEditCustomer(viewingCustomer);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Customer
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setViewingCustomer(null)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}