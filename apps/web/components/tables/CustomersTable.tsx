'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Customer } from '@/types/api';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'suspended': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return '✅';
    case 'inactive': return '⏸️';
    case 'suspended': return '🚫';
    default: return '❓';
  }
};

interface CustomersTableProps {
  data: Customer[];
  loading?: boolean;
  error?: string;
  onSearch?: (value: string) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onView?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export function CustomersTable({
  data,
  loading,
  error,
  onSearch,
  pagination,
  onView,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'firstName',
      header: 'Name',
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.getValue('firstName')} {row.original.lastName}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="text-sm text-foreground">
          {row.getValue('email')}
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return (
          <div className="text-sm text-foreground">
            {phone || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const address = row.original.address;
        return (
          <div className="text-sm text-foreground">
            {address ? `${address.city}, ${address.state}` : 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge className={getStatusColor(status)}>
            <span className="mr-1">{getStatusIcon(status)}</span>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'totalOrders',
      header: 'Orders',
      cell: ({ row }) => {
        const totalOrders = row.original.totalOrders || 0;
        return (
          <div className="text-sm text-foreground">
            {totalOrders}
          </div>
        );
      },
    },
    {
      accessorKey: 'totalSpent',
      header: 'Total Spent',
      cell: ({ row }) => {
        const totalSpent = row.original.totalSpent || 0;
        const currency = row.original.currency || 'USD';
        return (
          <div className="font-medium text-foreground">
            {currency} {totalSpent.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: 'lastOrderDate',
      header: 'Last Order',
      cell: ({ row }) => {
        const lastOrderDate = row.original.lastOrderDate;
        return (
          <div className="text-sm text-foreground">
            {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : 'N/A'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center space-x-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(customer)}
              >
                View
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(customer)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(customer)}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      searchKey="firstName"
      searchPlaceholder="Search customers..."
      onSearch={onSearch}
      pagination={pagination}
    />
  );
}