// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  tenantId: string;
  tenantName?: string;
  twofaEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'CUSTOMER_USER' | 'FULEXO_ADMIN' | 'FULEXO_STAFF';

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// Order Types
export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  storeId?: string;
  orderNo?: number;
  externalOrderNo?: string;
  orderSource?: string;
  status: OrderStatus;
  mappedStatus?: string;
  total: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  paymentMethod?: string;
  notes?: string;
  tags: string[];
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  store?: WooStore;
  items: OrderItem[];
  shipments: Shipment[];
  returns: Return[];
  invoices: Invoice[];
  serviceCharges: OrderServiceCharge[];
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  sku?: string;
  name?: string;
  qty: number;
  price?: number;
}

export interface OrderServiceCharge {
  id: string;
  orderId: string;
  type: string;
  amount: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

// Customer Types
export interface Customer {
  id: string;
  tenantId: string;
  storeId?: string;
  email?: string;
  emailNormalized?: string;
  phoneE164?: string;
  name?: string;
  company?: string;
  vatId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  store?: WooStore;
  orders: Order[];
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// Product Types
export interface Product {
  id: string;
  tenantId: string;
  storeId?: string;
  sku: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  images: string[];
  tags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  store?: WooStore;
  inboundItems: InboundItem[];
  stockMovements: StockMovement[];
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

// Shipment Types
export interface Shipment {
  id: string;
  orderId: string;
  tenantId: string;
  carrier?: string;
  trackingNo?: string;
  status?: string;
  labelUrl?: string;
  protocolUrl?: string;
  weight?: number;
  dimensions?: ProductDimensions;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  order: Order;
  tenant: Tenant;
}

// Return Types
export interface Return {
  id: string;
  orderId: string;
  tenantId: string;
  status?: string;
  reason?: string;
  notes?: string;
  refundAmount?: number;
  items?: any;
  createdAt: string;
  updatedAt: string;
  order: Order;
  tenant: Tenant;
  photos: ReturnPhoto[];
  notifications: ReturnNotification[];
}

export interface ReturnPhoto {
  id: string;
  returnId: string;
  fileUrl: string;
  note?: string;
  createdAt: string;
}

export interface ReturnNotification {
  id: string;
  returnId: string;
  channel: string;
  subject?: string;
  message?: string;
  sentAt: string;
}

// Invoice Types
export interface Invoice {
  id: string;
  tenantId: string;
  orderId: string;
  number?: string;
  series?: string;
  currency?: string;
  total?: number;
  taxAmount?: number;
  status: InvoiceStatus;
  pdfUrl?: string;
  issuedAt?: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
  order: Order;
  billingItems: BillingBatchItem[];
  payments: Payment[];
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
  invoice: Invoice;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'card' | 'bank_transfer' | 'paypal' | 'stripe' | 'other';

// Billing Types
export interface BillingBatch {
  id: string;
  tenantId: string;
  periodFrom?: string;
  periodTo?: string;
  status: BillingBatchStatus;
  total?: number;
  createdAt: string;
  tenant: Tenant;
  items: BillingBatchItem[];
}

export type BillingBatchStatus = 'created' | 'issued' | 'archived';

export interface BillingBatchItem {
  id: string;
  batchId: string;
  invoiceId: string;
  amount: number;
  createdAt: string;
  batch: BillingBatch;
  invoice: Invoice;
}

// WooCommerce Types
export interface WooStore {
  id: string;
  tenantId: string;
  name: string;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion: string;
  webhookSecret?: string;
  active: boolean;
  lastSync?: any;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
  orders: Order[];
  products: Product[];
  customers: Customer[];
}

// Inbound Types
export interface InboundShipment {
  id: string;
  tenantId: string;
  reference?: string;
  status: InboundStatus;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
  items: InboundItem[];
}

export type InboundStatus = 'created' | 'received' | 'cancelled';

export interface InboundItem {
  id: string;
  inboundId: string;
  productId?: string;
  sku?: string;
  name?: string;
  quantity: number;
  createdAt: string;
  inbound: InboundShipment;
  product?: Product;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  relatedId?: string;
  createdAt: string;
  product: Product;
}

export type StockMovementType = 'INBOUND' | 'ADJUSTMENT' | 'RETURN';

// Request Types
export interface Request {
  id: string;
  tenantId: string;
  customerId?: string;
  createdBy: string;
  type: RequestType;
  status: RequestStatus;
  priority: RequestPriority;
  payload: any;
  reviewerUserId?: string;
  reviewedAt?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
  creator: User;
  comments: RequestComment[];
  attachments: RequestAttachment[];
}

export type RequestType = 'STOCK_ADJUSTMENT' | 'NEW_PRODUCT' | 'ORDER_NOTE' | 'DOCUMENT_UPLOAD' | 'OTHER';
export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED';
export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

export interface RequestComment {
  id: string;
  requestId: string;
  authorId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  request: Request;
  author: User;
}

export interface RequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  request: Request;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
}

export interface BusinessHours {
  id: string;
  tenantId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  tenant: Tenant;
}

export interface Holiday {
  id: string;
  tenantId: string;
  date: string;
  name: string;
  createdAt: string;
  tenant: Tenant;
}

// Settings Types
export interface Settings {
  id: string;
  tenantId: string;
  category: string;
  key: string;
  value?: string;
  isSecret: boolean;
  metadata?: any;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
  tenant: Tenant;
}

// Error Types
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  details?: any;
  stack?: string;
}

// Query Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface OrderQuery extends PaginationQuery {
  status?: OrderStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  customerId?: string;
}

export interface ProductQuery extends PaginationQuery {
  search?: string;
  active?: boolean;
  storeId?: string;
  tags?: string[];
}

export interface CustomerQuery extends PaginationQuery {
  search?: string;
  storeId?: string;
  country?: string;
  city?: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export interface TwoFactorForm {
  token: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileForm {
  name?: string;
  email?: string;
  notificationPreferences?: any;
}