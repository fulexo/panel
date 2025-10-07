-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "twofaSecret" TEXT,
    "twofaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "temp2faToken" TEXT,
    "temp2faTokenExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "fingerprint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OwnershipRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditionsJson" JSONB NOT NULL,
    "actionJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnershipRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modules" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "dataScope" JSONB NOT NULL,
    "piiSettings" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RemoteEntityMap" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "localType" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemoteEntityMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT,
    "phoneE164" TEXT,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "company" TEXT,
    "vatId" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "role" TEXT NOT NULL DEFAULT 'customer',
    "billingInfo" JSONB,
    "shippingInfo" JSONB,
    "isPayingCustomer" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "metaData" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "orderNumber" TEXT,
    "orderNo" INTEGER,
    "externalOrderNo" TEXT,
    "orderSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "mappedStatus" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "total" DECIMAL(14,2) NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "billingInfo" JSONB,
    "billingAddress" JSONB,
    "shippingInfo" JSONB,
    "shippingAddress" JSONB,
    "lineItems" JSONB,
    "paymentMethod" TEXT,
    "paymentMethodTitle" TEXT,
    "transactionId" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "confirmedAt" TIMESTAMP(3),
    "datePaid" TIMESTAMP(3),
    "dateCompleted" TIMESTAMP(3),
    "metaData" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(14,2),

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNo" TEXT,
    "status" TEXT,
    "labelUrl" TEXT,
    "protocolUrl" TEXT,
    "weight" DECIMAL(10,3),
    "dimensions" JSONB,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "wooId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "regularPrice" DECIMAL(14,2) NOT NULL,
    "salePrice" DECIMAL(14,2),
    "stockQuantity" INTEGER,
    "stock" INTEGER,
    "weight" DECIMAL(10,3),
    "dimensions" JSONB,
    "stockStatus" TEXT NOT NULL DEFAULT 'instock',
    "status" TEXT NOT NULL DEFAULT 'publish',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "shortDescription" TEXT,
    "images" TEXT[],
    "categories" TEXT[],
    "tags" TEXT[],
    "metaData" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "productType" TEXT NOT NULL DEFAULT 'simple',
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "bundleItems" JSONB,
    "bundlePricing" TEXT NOT NULL DEFAULT 'fixed',
    "bundleDiscount" DECIMAL(5,2),
    "minBundleItems" INTEGER,
    "maxBundleItems" INTEGER,
    "bundleStock" TEXT NOT NULL DEFAULT 'parent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BundleProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,
    "discount" DECIMAL(5,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" TEXT,
    "series" TEXT,
    "currency" TEXT,
    "total" DECIMAL(14,2),
    "taxAmount" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT NOT NULL DEFAULT 'card',
    "transactionId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Return" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "refundAmount" DECIMAL(14,2),
    "items" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReturnPhoto" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReturnNotification" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderServiceCharge" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderServiceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BusinessHours" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Holiday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CalendarEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "secret" JSONB NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "baseUrl" TEXT,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "lastError" TEXT,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WooStore" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL DEFAULT 'v3',
    "webhookSecret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WooStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3),
    "periodTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'created',
    "total" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundShipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundItem" (
    "id" TEXT NOT NULL,
    "inboundId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT,
    "name" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Request" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "payload" JSONB NOT NULL,
    "reviewerUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequestComment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequestAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncState" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "checkpoint" JSONB,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JwtKey" (
    "id" TEXT NOT NULL,
    "kid" TEXT NOT NULL,
    "alg" TEXT NOT NULL,
    "publicJwk" JSONB NOT NULL,
    "privatePem" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "JwtKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryApproval" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "changeType" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportTicket" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "customerId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FileUpload" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "maxSize" INTEGER,
    "uploadedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_OrderNoSeq" (
    "tenantId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "_OrderNoSeq_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShippingZone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShippingPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "freeShippingThreshold" DECIMAL(10,2),
    "estimatedDays" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerShippingPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "zoneId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentValue" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerShippingPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "productId" TEXT,
    "currentStock" INTEGER,
    "requestedStock" INTEGER,
    "adjustmentReason" TEXT,
    "productData" JSONB,
    "updateData" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FulfillmentService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FulfillmentBillingItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "billedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentBillingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FulfillmentInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "public"."User"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "public"."User"("tenantId", "role");

-- CreateIndex
CREATE INDEX "User_tenantId_isActive_idx" ON "public"."User"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "User_tenantId_lastLoginAt_idx" ON "public"."User"("tenantId", "lastLoginAt");

-- CreateIndex
CREATE INDEX "User_tenantId_createdAt_idx" ON "public"."User"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "User_tenantId_email_idx" ON "public"."User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "User_tenantId_role_isActive_idx" ON "public"."User"("tenantId", "role", "isActive");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "public"."User"("lastLoginAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_failedAttempts_idx" ON "public"."User"("failedAttempts");

-- CreateIndex
CREATE INDEX "User_lockedUntil_idx" ON "public"."User"("lockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "public"."Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "public"."Session"("createdAt");

-- CreateIndex
CREATE INDEX "Session_ipAddress_idx" ON "public"."Session"("ipAddress");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "public"."Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_fingerprint_idx" ON "public"."Session"("fingerprint");

-- CreateIndex
CREATE INDEX "Session_expiresAt_createdAt_idx" ON "public"."Session"("expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "OwnershipRule_tenantId_entityType_priority_idx" ON "public"."OwnershipRule"("tenantId", "entityType", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_tenantId_name_key" ON "public"."Policy"("tenantId", "name");

-- CreateIndex
CREATE INDEX "RemoteEntityMap_tenantId_provider_entityType_idx" ON "public"."RemoteEntityMap"("tenantId", "provider", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteEntityMap_storeId_entityType_remoteId_key" ON "public"."RemoteEntityMap"("storeId", "entityType", "remoteId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "public"."Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_storeId_idx" ON "public"."Customer"("storeId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "public"."Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_firstName_idx" ON "public"."Customer"("firstName");

-- CreateIndex
CREATE INDEX "Customer_lastName_idx" ON "public"."Customer"("lastName");

-- CreateIndex
CREATE INDEX "Customer_role_idx" ON "public"."Customer"("role");

-- CreateIndex
CREATE INDEX "Customer_lastSyncedAt_idx" ON "public"."Customer"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "public"."Customer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_wooId_storeId_key" ON "public"."Customer"("wooId", "storeId");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "public"."Order"("tenantId");

-- CreateIndex
CREATE INDEX "Order_storeId_idx" ON "public"."Order"("storeId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "public"."Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_datePaid_idx" ON "public"."Order"("datePaid");

-- CreateIndex
CREATE INDEX "Order_dateCompleted_idx" ON "public"."Order"("dateCompleted");

-- CreateIndex
CREATE INDEX "Order_lastSyncedAt_idx" ON "public"."Order"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "Order_approvalStatus_idx" ON "public"."Order"("approvalStatus");

-- CreateIndex
CREATE INDEX "Order_approvedBy_idx" ON "public"."Order"("approvedBy");

-- CreateIndex
CREATE INDEX "Order_createdBy_idx" ON "public"."Order"("createdBy");

-- CreateIndex
CREATE INDEX "Order_tenantId_approvalStatus_idx" ON "public"."Order"("tenantId", "approvalStatus");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_idx" ON "public"."Order"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_wooId_storeId_key" ON "public"."Order"("wooId", "storeId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_sku_idx" ON "public"."OrderItem"("sku");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_sku_idx" ON "public"."OrderItem"("orderId", "sku");

-- CreateIndex
CREATE INDEX "OrderItem_name_idx" ON "public"."OrderItem"("name");

-- CreateIndex
CREATE INDEX "OrderItem_qty_idx" ON "public"."OrderItem"("qty");

-- CreateIndex
CREATE INDEX "OrderItem_price_idx" ON "public"."OrderItem"("price");

-- CreateIndex
CREATE INDEX "Shipment_trackingNo_idx" ON "public"."Shipment"("trackingNo");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "public"."Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_status_idx" ON "public"."Shipment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_carrier_idx" ON "public"."Shipment"("tenantId", "carrier");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_createdAt_idx" ON "public"."Shipment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_tenantId_status_createdAt_idx" ON "public"."Shipment"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_carrier_idx" ON "public"."Shipment"("carrier");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "public"."Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_shippedAt_idx" ON "public"."Shipment"("shippedAt");

-- CreateIndex
CREATE INDEX "Shipment_deliveredAt_idx" ON "public"."Shipment"("deliveredAt");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "public"."Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "public"."Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "public"."Product"("sku");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "public"."Product"("status");

-- CreateIndex
CREATE INDEX "Product_stockStatus_idx" ON "public"."Product"("stockStatus");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "public"."Product"("name");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "public"."Product"("price");

-- CreateIndex
CREATE INDEX "Product_stockQuantity_idx" ON "public"."Product"("stockQuantity");

-- CreateIndex
CREATE INDEX "Product_lastSyncedAt_idx" ON "public"."Product"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "public"."Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_updatedAt_idx" ON "public"."Product"("updatedAt");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "public"."Product"("productType");

-- CreateIndex
CREATE INDEX "Product_isBundle_idx" ON "public"."Product"("isBundle");

-- CreateIndex
CREATE UNIQUE INDEX "Product_wooId_storeId_key" ON "public"."Product"("wooId", "storeId");

-- CreateIndex
CREATE INDEX "BundleProduct_tenantId_idx" ON "public"."BundleProduct"("tenantId");

-- CreateIndex
CREATE INDEX "BundleProduct_bundleId_idx" ON "public"."BundleProduct"("bundleId");

-- CreateIndex
CREATE INDEX "BundleProduct_productId_idx" ON "public"."BundleProduct"("productId");

-- CreateIndex
CREATE INDEX "BundleProduct_isOptional_idx" ON "public"."BundleProduct"("isOptional");

-- CreateIndex
CREATE INDEX "BundleProduct_sortOrder_idx" ON "public"."BundleProduct"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BundleProduct_bundleId_productId_key" ON "public"."BundleProduct"("bundleId", "productId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "public"."Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "public"."Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_number_idx" ON "public"."Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "public"."Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "public"."Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "public"."Invoice"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_issuedAt_idx" ON "public"."Invoice"("tenantId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_dueDate_idx" ON "public"."Invoice"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_paidAt_idx" ON "public"."Invoice"("tenantId", "paidAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_createdAt_idx" ON "public"."Invoice"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_dueDate_idx" ON "public"."Invoice"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "public"."Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "public"."Invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "public"."Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_paidAt_idx" ON "public"."Invoice"("paidAt");

-- CreateIndex
CREATE INDEX "Invoice_series_idx" ON "public"."Invoice"("series");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "public"."Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "public"."Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "public"."Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "public"."Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_status_idx" ON "public"."Payment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Payment_tenantId_method_idx" ON "public"."Payment"("tenantId", "method");

-- CreateIndex
CREATE INDEX "Payment_tenantId_status_createdAt_idx" ON "public"."Payment"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_processedAt_idx" ON "public"."Payment"("processedAt");

-- CreateIndex
CREATE INDEX "Return_orderId_idx" ON "public"."Return"("orderId");

-- CreateIndex
CREATE INDEX "Return_tenantId_status_idx" ON "public"."Return"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Return_tenantId_createdAt_idx" ON "public"."Return"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Return_tenantId_status_createdAt_idx" ON "public"."Return"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Return_status_idx" ON "public"."Return"("status");

-- CreateIndex
CREATE INDEX "Return_refundAmount_idx" ON "public"."Return"("refundAmount");

-- CreateIndex
CREATE INDEX "ReturnPhoto_returnId_idx" ON "public"."ReturnPhoto"("returnId");

-- CreateIndex
CREATE INDEX "ReturnPhoto_createdAt_idx" ON "public"."ReturnPhoto"("createdAt");

-- CreateIndex
CREATE INDEX "ReturnNotification_returnId_idx" ON "public"."ReturnNotification"("returnId");

-- CreateIndex
CREATE INDEX "ReturnNotification_channel_idx" ON "public"."ReturnNotification"("channel");

-- CreateIndex
CREATE INDEX "ReturnNotification_sentAt_idx" ON "public"."ReturnNotification"("sentAt");

-- CreateIndex
CREATE INDEX "OrderServiceCharge_orderId_idx" ON "public"."OrderServiceCharge"("orderId");

-- CreateIndex
CREATE INDEX "OrderServiceCharge_type_idx" ON "public"."OrderServiceCharge"("type");

-- CreateIndex
CREATE INDEX "OrderServiceCharge_amount_idx" ON "public"."OrderServiceCharge"("amount");

-- CreateIndex
CREATE INDEX "OrderServiceCharge_createdAt_idx" ON "public"."OrderServiceCharge"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessHours_tenantId_idx" ON "public"."BusinessHours"("tenantId");

-- CreateIndex
CREATE INDEX "BusinessHours_weekday_idx" ON "public"."BusinessHours"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours_tenantId_weekday_key" ON "public"."BusinessHours"("tenantId", "weekday");

-- CreateIndex
CREATE INDEX "Holiday_tenantId_date_idx" ON "public"."Holiday"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "public"."Holiday"("date");

-- CreateIndex
CREATE INDEX "Holiday_name_idx" ON "public"."Holiday"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_tenantId_date_key" ON "public"."Holiday"("tenantId", "date");

-- CreateIndex
CREATE INDEX "CalendarEvent_tenantId_startAt_idx" ON "public"."CalendarEvent"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_tenantId_type_idx" ON "public"."CalendarEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "CalendarEvent_startAt_idx" ON "public"."CalendarEvent"("startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_endAt_idx" ON "public"."CalendarEvent"("endAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_type_idx" ON "public"."CalendarEvent"("type");

-- CreateIndex
CREATE INDEX "OAuthCredential_tenantId_idx" ON "public"."OAuthCredential"("tenantId");

-- CreateIndex
CREATE INDEX "OAuthCredential_provider_idx" ON "public"."OAuthCredential"("provider");

-- CreateIndex
CREATE INDEX "OAuthCredential_keyVersion_idx" ON "public"."OAuthCredential"("keyVersion");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthCredential_tenantId_provider_key" ON "public"."OAuthCredential"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "Store_customerId_idx" ON "public"."Store"("customerId");

-- CreateIndex
CREATE INDEX "Store_status_idx" ON "public"."Store"("status");

-- CreateIndex
CREATE INDEX "Store_lastSyncAt_idx" ON "public"."Store"("lastSyncAt");

-- CreateIndex
CREATE INDEX "Store_createdAt_idx" ON "public"."Store"("createdAt");

-- CreateIndex
CREATE INDEX "WooStore_tenantId_active_idx" ON "public"."WooStore"("tenantId", "active");

-- CreateIndex
CREATE INDEX "WooStore_tenantId_active_createdAt_idx" ON "public"."WooStore"("tenantId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "WooStore_active_idx" ON "public"."WooStore"("active");

-- CreateIndex
CREATE INDEX "WooStore_baseUrl_idx" ON "public"."WooStore"("baseUrl");

-- CreateIndex
CREATE INDEX "WooStore_createdAt_idx" ON "public"."WooStore"("createdAt");

-- CreateIndex
CREATE INDEX "BillingBatch_tenantId_createdAt_idx" ON "public"."BillingBatch"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingBatch_tenantId_status_idx" ON "public"."BillingBatch"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BillingBatch_status_idx" ON "public"."BillingBatch"("status");

-- CreateIndex
CREATE INDEX "BillingBatch_periodFrom_idx" ON "public"."BillingBatch"("periodFrom");

-- CreateIndex
CREATE INDEX "BillingBatch_periodTo_idx" ON "public"."BillingBatch"("periodTo");

-- CreateIndex
CREATE INDEX "BillingBatchItem_batchId_idx" ON "public"."BillingBatchItem"("batchId");

-- CreateIndex
CREATE INDEX "BillingBatchItem_invoiceId_idx" ON "public"."BillingBatchItem"("invoiceId");

-- CreateIndex
CREATE INDEX "BillingBatchItem_amount_idx" ON "public"."BillingBatchItem"("amount");

-- CreateIndex
CREATE INDEX "BillingBatchItem_createdAt_idx" ON "public"."BillingBatchItem"("createdAt");

-- CreateIndex
CREATE INDEX "InboundShipment_tenantId_createdAt_idx" ON "public"."InboundShipment"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InboundShipment_tenantId_status_idx" ON "public"."InboundShipment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InboundShipment_status_idx" ON "public"."InboundShipment"("status");

-- CreateIndex
CREATE INDEX "InboundShipment_reference_idx" ON "public"."InboundShipment"("reference");

-- CreateIndex
CREATE INDEX "InboundItem_inboundId_idx" ON "public"."InboundItem"("inboundId");

-- CreateIndex
CREATE INDEX "InboundItem_productId_idx" ON "public"."InboundItem"("productId");

-- CreateIndex
CREATE INDEX "InboundItem_sku_idx" ON "public"."InboundItem"("sku");

-- CreateIndex
CREATE INDEX "InboundItem_quantity_idx" ON "public"."InboundItem"("quantity");

-- CreateIndex
CREATE INDEX "InboundItem_createdAt_idx" ON "public"."InboundItem"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "public"."StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_type_idx" ON "public"."StockMovement"("productId", "type");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "public"."StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_quantity_idx" ON "public"."StockMovement"("quantity");

-- CreateIndex
CREATE INDEX "StockMovement_relatedId_idx" ON "public"."StockMovement"("relatedId");

-- CreateIndex
CREATE INDEX "Request_tenantId_status_createdAt_idx" ON "public"."Request"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Request_tenantId_type_idx" ON "public"."Request"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Request_tenantId_priority_idx" ON "public"."Request"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "Request_createdBy_idx" ON "public"."Request"("createdBy");

-- CreateIndex
CREATE INDEX "Request_type_idx" ON "public"."Request"("type");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "public"."Request"("status");

-- CreateIndex
CREATE INDEX "Request_priority_idx" ON "public"."Request"("priority");

-- CreateIndex
CREATE INDEX "Request_reviewerUserId_idx" ON "public"."Request"("reviewerUserId");

-- CreateIndex
CREATE INDEX "Request_reviewedAt_idx" ON "public"."Request"("reviewedAt");

-- CreateIndex
CREATE INDEX "Request_appliedAt_idx" ON "public"."Request"("appliedAt");

-- CreateIndex
CREATE INDEX "RequestComment_requestId_idx" ON "public"."RequestComment"("requestId");

-- CreateIndex
CREATE INDEX "RequestComment_authorId_idx" ON "public"."RequestComment"("authorId");

-- CreateIndex
CREATE INDEX "RequestComment_isInternal_idx" ON "public"."RequestComment"("isInternal");

-- CreateIndex
CREATE INDEX "RequestComment_createdAt_idx" ON "public"."RequestComment"("createdAt");

-- CreateIndex
CREATE INDEX "RequestAttachment_requestId_idx" ON "public"."RequestAttachment"("requestId");

-- CreateIndex
CREATE INDEX "RequestAttachment_fileName_idx" ON "public"."RequestAttachment"("fileName");

-- CreateIndex
CREATE INDEX "RequestAttachment_mimeType_idx" ON "public"."RequestAttachment"("mimeType");

-- CreateIndex
CREATE INDEX "RequestAttachment_fileSize_idx" ON "public"."RequestAttachment"("fileSize");

-- CreateIndex
CREATE INDEX "RequestAttachment_createdAt_idx" ON "public"."RequestAttachment"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "public"."AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "public"."AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "public"."AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "public"."AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "public"."AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "public"."AuditLog"("ipAddress");

-- CreateIndex
CREATE INDEX "AuditLog_action_entityType_idx" ON "public"."AuditLog"("action", "entityType");

-- CreateIndex
CREATE INDEX "SyncState_status_idx" ON "public"."SyncState"("status");

-- CreateIndex
CREATE INDEX "SyncState_accountId_idx" ON "public"."SyncState"("accountId");

-- CreateIndex
CREATE INDEX "SyncState_entityType_idx" ON "public"."SyncState"("entityType");

-- CreateIndex
CREATE INDEX "SyncState_lastSyncAt_idx" ON "public"."SyncState"("lastSyncAt");

-- CreateIndex
CREATE INDEX "SyncState_status_lastSyncAt_idx" ON "public"."SyncState"("status", "lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_accountId_entityType_key" ON "public"."SyncState"("accountId", "entityType");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_storeId_topic_status_idx" ON "public"."WebhookEvent"("tenantId", "storeId", "topic", "status");

-- CreateIndex
CREATE INDEX "WebhookEvent_tenantId_status_idx" ON "public"."WebhookEvent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WebhookEvent_storeId_status_idx" ON "public"."WebhookEvent"("storeId", "status");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_idx" ON "public"."WebhookEvent"("provider");

-- CreateIndex
CREATE INDEX "WebhookEvent_topic_idx" ON "public"."WebhookEvent"("topic");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "public"."WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_attempts_idx" ON "public"."WebhookEvent"("attempts");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "public"."WebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "public"."WebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JwtKey_kid_key" ON "public"."JwtKey"("kid");

-- CreateIndex
CREATE INDEX "JwtKey_active_createdAt_idx" ON "public"."JwtKey"("active", "createdAt");

-- CreateIndex
CREATE INDEX "JwtKey_active_idx" ON "public"."JwtKey"("active");

-- CreateIndex
CREATE INDEX "JwtKey_alg_idx" ON "public"."JwtKey"("alg");

-- CreateIndex
CREATE INDEX "JwtKey_expiresAt_idx" ON "public"."JwtKey"("expiresAt");

-- CreateIndex
CREATE INDEX "JwtKey_rotatedAt_idx" ON "public"."JwtKey"("rotatedAt");

-- CreateIndex
CREATE INDEX "Settings_tenantId_category_idx" ON "public"."Settings"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Settings_category_idx" ON "public"."Settings"("category");

-- CreateIndex
CREATE INDEX "Settings_key_idx" ON "public"."Settings"("key");

-- CreateIndex
CREATE INDEX "Settings_isSecret_idx" ON "public"."Settings"("isSecret");

-- CreateIndex
CREATE INDEX "Settings_updatedBy_idx" ON "public"."Settings"("updatedBy");

-- CreateIndex
CREATE INDEX "Settings_updatedAt_idx" ON "public"."Settings"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_tenantId_category_key_key" ON "public"."Settings"("tenantId", "category", "key");

-- CreateIndex
CREATE INDEX "InventoryApproval_storeId_idx" ON "public"."InventoryApproval"("storeId");

-- CreateIndex
CREATE INDEX "InventoryApproval_productId_idx" ON "public"."InventoryApproval"("productId");

-- CreateIndex
CREATE INDEX "InventoryApproval_changeType_idx" ON "public"."InventoryApproval"("changeType");

-- CreateIndex
CREATE INDEX "InventoryApproval_status_idx" ON "public"."InventoryApproval"("status");

-- CreateIndex
CREATE INDEX "InventoryApproval_requestedBy_idx" ON "public"."InventoryApproval"("requestedBy");

-- CreateIndex
CREATE INDEX "InventoryApproval_reviewedBy_idx" ON "public"."InventoryApproval"("reviewedBy");

-- CreateIndex
CREATE INDEX "InventoryApproval_createdAt_idx" ON "public"."InventoryApproval"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryApproval_reviewedAt_idx" ON "public"."InventoryApproval"("reviewedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_storeId_idx" ON "public"."SupportTicket"("storeId");

-- CreateIndex
CREATE INDEX "SupportTicket_customerId_idx" ON "public"."SupportTicket"("customerId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "public"."SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "public"."SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedTo_idx" ON "public"."SupportTicket"("assignedTo");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "public"."SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "public"."SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportMessage_authorId_idx" ON "public"."SupportMessage"("authorId");

-- CreateIndex
CREATE INDEX "SupportMessage_isInternal_idx" ON "public"."SupportMessage"("isInternal");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "public"."SupportMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileUpload_key_key" ON "public"."FileUpload"("key");

-- CreateIndex
CREATE INDEX "FileUpload_tenantId_idx" ON "public"."FileUpload"("tenantId");

-- CreateIndex
CREATE INDEX "FileUpload_status_idx" ON "public"."FileUpload"("status");

-- CreateIndex
CREATE INDEX "FileUpload_mimeType_idx" ON "public"."FileUpload"("mimeType");

-- CreateIndex
CREATE INDEX "FileUpload_createdAt_idx" ON "public"."FileUpload"("createdAt");

-- CreateIndex
CREATE INDEX "FileUpload_uploadedAt_idx" ON "public"."FileUpload"("uploadedAt");

-- CreateIndex
CREATE INDEX "_OrderNoSeq_value_idx" ON "public"."_OrderNoSeq"("value");

-- CreateIndex
CREATE INDEX "Cart_tenantId_idx" ON "public"."Cart"("tenantId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "public"."Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_storeId_idx" ON "public"."Cart"("storeId");

-- CreateIndex
CREATE INDEX "Cart_createdAt_idx" ON "public"."Cart"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_storeId_key" ON "public"."Cart"("userId", "storeId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "public"."CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "public"."CartItem"("productId");

-- CreateIndex
CREATE INDEX "CartItem_quantity_idx" ON "public"."CartItem"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "public"."CartItem"("cartId", "productId");

-- CreateIndex
CREATE INDEX "ShippingZone_tenantId_idx" ON "public"."ShippingZone"("tenantId");

-- CreateIndex
CREATE INDEX "ShippingZone_isActive_idx" ON "public"."ShippingZone"("isActive");

-- CreateIndex
CREATE INDEX "ShippingZone_name_idx" ON "public"."ShippingZone"("name");

-- CreateIndex
CREATE INDEX "ShippingPrice_tenantId_idx" ON "public"."ShippingPrice"("tenantId");

-- CreateIndex
CREATE INDEX "ShippingPrice_zoneId_idx" ON "public"."ShippingPrice"("zoneId");

-- CreateIndex
CREATE INDEX "ShippingPrice_isActive_idx" ON "public"."ShippingPrice"("isActive");

-- CreateIndex
CREATE INDEX "ShippingPrice_priority_idx" ON "public"."ShippingPrice"("priority");

-- CreateIndex
CREATE INDEX "ShippingPrice_basePrice_idx" ON "public"."ShippingPrice"("basePrice");

-- CreateIndex
CREATE INDEX "CustomerShippingPrice_tenantId_idx" ON "public"."CustomerShippingPrice"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerShippingPrice_customerId_idx" ON "public"."CustomerShippingPrice"("customerId");

-- CreateIndex
CREATE INDEX "CustomerShippingPrice_zoneId_idx" ON "public"."CustomerShippingPrice"("zoneId");

-- CreateIndex
CREATE INDEX "CustomerShippingPrice_priceId_idx" ON "public"."CustomerShippingPrice"("priceId");

-- CreateIndex
CREATE INDEX "CustomerShippingPrice_isActive_idx" ON "public"."CustomerShippingPrice"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerShippingPrice_customerId_zoneId_priceId_key" ON "public"."CustomerShippingPrice"("customerId", "zoneId", "priceId");

-- CreateIndex
CREATE INDEX "InventoryRequest_tenantId_idx" ON "public"."InventoryRequest"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryRequest_storeId_idx" ON "public"."InventoryRequest"("storeId");

-- CreateIndex
CREATE INDEX "InventoryRequest_customerId_idx" ON "public"."InventoryRequest"("customerId");

-- CreateIndex
CREATE INDEX "InventoryRequest_productId_idx" ON "public"."InventoryRequest"("productId");

-- CreateIndex
CREATE INDEX "InventoryRequest_type_idx" ON "public"."InventoryRequest"("type");

-- CreateIndex
CREATE INDEX "InventoryRequest_status_idx" ON "public"."InventoryRequest"("status");

-- CreateIndex
CREATE INDEX "InventoryRequest_createdAt_idx" ON "public"."InventoryRequest"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryRequest_tenantId_status_idx" ON "public"."InventoryRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryRequest_customerId_status_idx" ON "public"."InventoryRequest"("customerId", "status");

-- CreateIndex
CREATE INDEX "FulfillmentService_tenantId_idx" ON "public"."FulfillmentService"("tenantId");

-- CreateIndex
CREATE INDEX "FulfillmentService_isActive_idx" ON "public"."FulfillmentService"("isActive");

-- CreateIndex
CREATE INDEX "FulfillmentService_name_idx" ON "public"."FulfillmentService"("name");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_tenantId_idx" ON "public"."FulfillmentBillingItem"("tenantId");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_orderId_idx" ON "public"."FulfillmentBillingItem"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_serviceId_idx" ON "public"."FulfillmentBillingItem"("serviceId");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_isBilled_idx" ON "public"."FulfillmentBillingItem"("isBilled");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_serviceDate_idx" ON "public"."FulfillmentBillingItem"("serviceDate");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_billedAt_idx" ON "public"."FulfillmentBillingItem"("billedAt");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_tenantId_isBilled_idx" ON "public"."FulfillmentBillingItem"("tenantId", "isBilled");

-- CreateIndex
CREATE INDEX "FulfillmentBillingItem_tenantId_serviceDate_idx" ON "public"."FulfillmentBillingItem"("tenantId", "serviceDate");

-- CreateIndex
CREATE INDEX "FulfillmentInvoice_tenantId_idx" ON "public"."FulfillmentInvoice"("tenantId");

-- CreateIndex
CREATE INDEX "FulfillmentInvoice_customerId_idx" ON "public"."FulfillmentInvoice"("customerId");

-- CreateIndex
CREATE INDEX "FulfillmentInvoice_month_year_idx" ON "public"."FulfillmentInvoice"("month", "year");

-- CreateIndex
CREATE INDEX "FulfillmentInvoice_status_idx" ON "public"."FulfillmentInvoice"("status");

-- CreateIndex
CREATE INDEX "FulfillmentInvoice_dueDate_idx" ON "public"."FulfillmentInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "FulfillmentInvoice_tenantId_month_year_idx" ON "public"."FulfillmentInvoice"("tenantId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentInvoice_tenantId_invoiceNumber_key" ON "public"."FulfillmentInvoice"("tenantId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OwnershipRule" ADD CONSTRAINT "OwnershipRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shipment" ADD CONSTRAINT "Shipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleProduct" ADD CONSTRAINT "BundleProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleProduct" ADD CONSTRAINT "BundleProduct_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BundleProduct" ADD CONSTRAINT "BundleProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Return" ADD CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Return" ADD CONSTRAINT "Return_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReturnPhoto" ADD CONSTRAINT "ReturnPhoto_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "public"."Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReturnNotification" ADD CONSTRAINT "ReturnNotification_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "public"."Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderServiceCharge" ADD CONSTRAINT "OrderServiceCharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessHours" ADD CONSTRAINT "BusinessHours_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Holiday" ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OAuthCredential" ADD CONSTRAINT "OAuthCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Store" ADD CONSTRAINT "Store_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WooStore" ADD CONSTRAINT "WooStore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingBatch" ADD CONSTRAINT "BillingBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingBatchItem" ADD CONSTRAINT "BillingBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."BillingBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingBatchItem" ADD CONSTRAINT "BillingBatchItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundShipment" ADD CONSTRAINT "InboundShipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundItem" ADD CONSTRAINT "InboundItem_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "public"."InboundShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundItem" ADD CONSTRAINT "InboundItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Request" ADD CONSTRAINT "Request_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequestComment" ADD CONSTRAINT "RequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequestComment" ADD CONSTRAINT "RequestComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RequestAttachment" ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settings" ADD CONSTRAINT "Settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryApproval" ADD CONSTRAINT "InventoryApproval_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryApproval" ADD CONSTRAINT "InventoryApproval_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportTicket" ADD CONSTRAINT "SupportTicket_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileUpload" ADD CONSTRAINT "FileUpload_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShippingZone" ADD CONSTRAINT "ShippingZone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShippingPrice" ADD CONSTRAINT "ShippingPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShippingPrice" ADD CONSTRAINT "ShippingPrice_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerShippingPrice" ADD CONSTRAINT "CustomerShippingPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerShippingPrice" ADD CONSTRAINT "CustomerShippingPrice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerShippingPrice" ADD CONSTRAINT "CustomerShippingPrice_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerShippingPrice" ADD CONSTRAINT "CustomerShippingPrice_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "public"."ShippingPrice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryRequest" ADD CONSTRAINT "InventoryRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryRequest" ADD CONSTRAINT "InventoryRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryRequest" ADD CONSTRAINT "InventoryRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryRequest" ADD CONSTRAINT "InventoryRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentService" ADD CONSTRAINT "FulfillmentService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentBillingItem" ADD CONSTRAINT "FulfillmentBillingItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentBillingItem" ADD CONSTRAINT "FulfillmentBillingItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentBillingItem" ADD CONSTRAINT "FulfillmentBillingItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."FulfillmentService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentBillingItem" ADD CONSTRAINT "FulfillmentBillingItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."FulfillmentInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentInvoice" ADD CONSTRAINT "FulfillmentInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentInvoice" ADD CONSTRAINT "FulfillmentInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
