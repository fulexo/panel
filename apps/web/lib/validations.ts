import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits');
export const urlSchema = z.string().url('Invalid URL');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const twoFactorSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  twoFactorToken: z.string().min(6, '2FA code must be 6 digits').max(6, '2FA code must be 6 digits'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Product schemas
export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  stock: z.number().min(0, 'Stock must be non-negative'),
  weight: z.number().min(0, 'Weight must be positive').optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  storeId: z.string().min(1, 'Store is required'),
});

// Customer schemas
export const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  storeId: z.string().min(1, 'Store is required'),
});

// Order schemas
export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0, 'Price must be positive'),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  billingAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  notes: z.string().optional(),
  storeId: z.string().min(1, 'Store is required'),
});

// Settings schemas
export const generalSettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  support_email: emailSchema,
  timezone: z.string().min(1, 'Timezone is required'),
  date_format: z.string().min(1, 'Date format is required'),
  currency: z.string().min(1, 'Currency is required'),
});

export const emailSettingsSchema = z.object({
  smtp_host: z.string().min(1, 'SMTP host is required'),
  smtp_port: z.string().min(1, 'SMTP port is required'),
  smtp_user: z.string().min(1, 'SMTP username is required'),
  smtp_pass: z.string().min(1, 'SMTP password is required'),
  smtp_from: emailSchema,
  smtp_secure: z.enum(['true', 'false']).default('true'),
});

export const notificationSettingsSchema = z.object({
  email_notifications: z.enum(['true', 'false']).default('true'),
  order_notifications: z.enum(['true', 'false']).default('true'),
  product_notifications: z.enum(['true', 'false']).default('true'),
  system_notifications: z.enum(['true', 'false']).default('true'),
});

export const securitySettingsSchema = z.object({
  session_timeout: z.string().min(1, 'Session timeout is required'),
  max_login_attempts: z.string().min(1, 'Max login attempts is required'),
  password_min_length: z.string().min(1, 'Password min length is required'),
  require_2fa: z.enum(['true', 'false']).default('false'),
  auto_logout: z.enum(['true', 'false']).default('true'),
});

export const woocommerceSettingsSchema = z.object({
  default_woo_version: z.string().min(1, 'WooCommerce version is required'),
  sync_interval: z.string().min(1, 'Sync interval is required'),
  webhook_timeout: z.string().min(1, 'Webhook timeout is required'),
  retry_attempts: z.string().min(1, 'Retry attempts is required'),
  enable_auto_sync: z.enum(['true', 'false']).default('true'),
  auto_create_products: z.enum(['true', 'false']).default('true'),
  auto_update_products: z.enum(['true', 'false']).default('true'),
  sync_categories: z.enum(['true', 'false']).default('true'),
  sync_customers: z.enum(['true', 'false']).default('true'),
});

// Support schemas
export const supportTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum(['technical', 'billing', 'shipping', 'returns', 'general']).default('general'),
});

export const supportMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  attachment: z.instanceof(File).optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;
export type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;
export type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;
export type SecuritySettingsFormData = z.infer<typeof securitySettingsSchema>;
export type WooCommerceSettingsFormData = z.infer<typeof woocommerceSettingsSchema>;
export type SupportTicketFormData = z.infer<typeof supportTicketSchema>;
export type SupportMessageFormData = z.infer<typeof supportMessageSchema>;