# 🏗️ Fulexo Platform Architecture

## 📋 System Overview

Fulexo is a multi-tenant WooCommerce management platform designed for fulfillment companies. It provides centralized management of multiple customer stores with real-time synchronization and role-based access control.

## 🎯 Core Features

### Multi-Tenant Architecture
- **Data Isolation**: Each customer's data is completely isolated
- **Store Management**: Link customers to their WooCommerce stores
- **Role-Based Access**: Admin vs Customer permissions
- **Approval System**: Customer changes require admin approval

### WooCommerce Integration
- **Real-time Sync**: Bidirectional synchronization
- **Webhook Support**: Instant updates from WooCommerce
- **API Integration**: Full WooCommerce REST API support
- **Data Entities**: Orders, Products, Customers, Inventory

## 🔐 User Roles & Permissions

### ADMIN (Fulexo Manager)
- **Full Access**: All stores and operations
- **Store Management**: Create, update, delete stores
- **Order Management**: Full order control across all stores
- **Product Management**: Full product control across all stores
- **Customer Management**: Full customer control across all stores
- **Inventory Management**: Full inventory control + approval system
- **Returns Management**: Full returns control across all stores
- **Support Management**: Full support ticket control

### CUSTOMER (Store Owner)
- **Limited Access**: Only their store data
- **View-Only**: Orders, Products, Customers, Returns
- **Limited Management**: Inventory (with approval), Support tickets
- **No Access**: Store management, system administration

## 📊 Panel Structure

### 1. Dashboard
- **Admin**: All stores overview, statistics, alerts
- **Customer**: Their store overview, statistics, alerts

### 2. Stores (Admin Only)
- Store list and management
- WooCommerce connection management
- Customer-store mapping
- API key management
- Sync status monitoring

### 3. Orders
- **Admin**: Full order management across all stores
- **Customer**: View-only access to their store orders
- Integrated shipping management
- Order status updates
- Tracking number management

### 4. Products
- **Admin**: Full product management across all stores
- **Customer**: View-only access to their store products
- Stock management
- Price management
- Category management

### 5. Customers
- **Admin**: Full customer management across all stores
- **Customer**: View-only access to their store customers
- Customer details and history
- Order tracking

### 6. Inventory
- **Admin**: Full inventory management + approval system
- **Customer**: Limited inventory management with approval workflow
- Stock level monitoring
- Low stock alerts
- Approval system for customer changes

### 7. Returns
- **Admin**: Full returns management across all stores
- **Customer**: View-only access to their store returns
- Return processing
- Customer notifications

### 8. Support
- **Admin**: Full support ticket management
- **Customer**: Manage only their own support tickets
- Ticket system
- File sharing
- Communication history

## 🔄 WooCommerce Sync Flow

### Data Synchronization
```
WooCommerce Store ←→ Fulexo Platform
        ↓                    ↓
   Webhook Events      API Requests
        ↓                    ↓
   Real-time Updates   Batch Sync
        ↓                    ↓
   Database Update     Database Update
```

### Sync Entities
- **Orders**: Status, tracking, customer info
- **Products**: Stock, prices, descriptions, images
- **Customers**: Profile, addresses, order history
- **Inventory**: Stock levels, low stock alerts

### Sync Methods
- **Webhooks**: Real-time updates from WooCommerce
- **API Polling**: Scheduled synchronization
- **Manual Sync**: On-demand synchronization
- **Conflict Resolution**: Last-write-wins with timestamps

## 🏗️ Technical Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **State Management**: TanStack Query
- **Authentication**: Custom JWT with httpOnly cookies

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Valkey)
- **Authentication**: JWT with 2FA support
- **API Documentation**: Swagger/OpenAPI

### Worker (BullMQ)
- **Job Queue**: BullMQ with Redis
- **Background Tasks**: WooCommerce sync, email sending
- **Scheduled Jobs**: Regular data synchronization
- **Error Handling**: Retry logic and dead letter queues

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus, Grafana, Loki
- **Storage**: MinIO for file storage
- **SSL**: Let's Encrypt certificates

## 🔒 Security Architecture

### Authentication
- **JWT Tokens**: RS256 in production, HS256 in development
- **2FA Support**: TOTP-based two-factor authentication
- **Session Management**: Secure session handling
- **Account Lockout**: Brute force protection

### Data Protection
- **Encryption**: AES-256-GCM for sensitive data
- **Password Hashing**: bcrypt with cost factor 10
- **SQL Injection**: Prisma ORM protection
- **XSS Protection**: Content Security Policy headers

### Network Security
- **Rate Limiting**: Multi-layer protection
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **HTTPS**: SSL/TLS encryption
- **Firewall**: Network access control

## 📊 Database Schema

### Core Tables
- **users**: User accounts with roles
- **stores**: WooCommerce store configurations
- **orders**: Order data with WooCommerce sync
- **products**: Product data with WooCommerce sync
- **customers**: Customer data with WooCommerce sync
- **inventory_approvals**: Customer change requests
- **support_tickets**: Support system
- **support_messages**: Support communications

### Relationships
- **User → Store**: One-to-many (customers can have multiple stores)
- **Store → Orders**: One-to-many
- **Store → Products**: One-to-many
- **Store → Customers**: One-to-many
- **User → Support Tickets**: One-to-many

## 🔄 Approval System

### Inventory Changes
1. **Customer Request**: Customer makes inventory change
2. **Pending Status**: Change marked as "pending approval"
3. **Admin Notification**: Admin receives notification
4. **Admin Review**: Admin reviews and approves/rejects
5. **WooCommerce Sync**: Approved changes sync to WooCommerce
6. **Customer Notification**: Customer receives result notification

### Approval Workflow
```
Customer Change → Pending Approval → Admin Review → WooCommerce Sync → Customer Notification
```

## 📈 Monitoring & Observability

### Metrics (Prometheus)
- API request rates and latencies
- Database connection pool stats
- Cache hit rates
- Sync lag metrics
- Business KPIs

### Logging (Loki + Promtail)
- Centralized log aggregation
- Structured logging
- Log retention policies
- Search and filtering

### Tracing (Jaeger)
- Distributed tracing
- Performance bottleneck identification
- Request flow visualization

## 🚀 Deployment Architecture

### Development
- **Local Development**: Docker Compose
- **Hot Reload**: File watching and auto-restart
- **Debug Tools**: Source maps and debugging
- **Test Environment**: Isolated test database

### Production
- **Container Orchestration**: Docker Compose
- **Load Balancing**: Nginx reverse proxy
- **SSL Termination**: Let's Encrypt certificates
- **Monitoring**: Prometheus, Grafana, Loki
- **Backup**: Automated database and file backups

## 🔧 Development Workflow

### Code Organization
```
apps/
├── api/          # NestJS backend
├── web/          # Next.js frontend
└── worker/       # BullMQ worker

compose/          # Docker configurations
scripts/          # Management scripts
```

### API Design
- **RESTful APIs**: Standard HTTP methods
- **OpenAPI Documentation**: Auto-generated Swagger docs
- **Versioning**: API versioning strategy
- **Error Handling**: Consistent error responses

### Frontend Architecture
- **Component Library**: Reusable UI components
- **State Management**: TanStack Query for server state
- **Routing**: Next.js App Router
- **Authentication**: Protected routes and components

## 📋 Configuration Management

### Environment Variables
- **Development**: `.env` files
- **Production**: System environment variables
- **Secrets**: Encrypted storage
- **Validation**: Environment validation on startup

### Database Configuration
- **Migrations**: Prisma migration system
- **Seeding**: Database seeding for development
- **Backup**: Automated backup strategies
- **Restore**: Point-in-time recovery

## 🎯 Performance Optimization

### Caching Strategy
- **Redis Cache**: API response caching
- **Database Query**: Query result caching
- **Static Assets**: CDN caching
- **Browser Cache**: HTTP caching headers

### Database Optimization
- **Indexing**: Strategic database indexes
- **Query Optimization**: Efficient queries
- **Connection Pooling**: Database connection management
- **Read Replicas**: Read scaling (future)

### Frontend Optimization
- **Code Splitting**: Lazy loading
- **Image Optimization**: Next.js image optimization
- **Bundle Analysis**: Webpack bundle analyzer
- **Performance Monitoring**: Core Web Vitals

---

**Last Updated**: 2024 | **Version**: 1.0.0 | **Status**: Production Ready