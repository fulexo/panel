--
-- PostgreSQL database dump
--

\restrict LlnbS4yOaVqL0s8KfPgHyN0VaTTWgJnQMk0nDqjdIzGg5NoN8r3HuufY2bTHtZV

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "tenantId" text,
    "userId" text,
    action text NOT NULL,
    "entityType" text,
    "entityId" text,
    changes jsonb,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO fulexo_user;

--
-- Name: BLAccount; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."BLAccount" (
    id text NOT NULL,
    "tenantId" text,
    label text,
    "tokenEncrypted" bytea NOT NULL,
    "keyVersion" integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "lastSyncAt" timestamp(3) without time zone,
    "syncState" jsonb,
    "rateLimitReset" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BLAccount" OWNER TO fulexo_user;

--
-- Name: BillingBatch; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."BillingBatch" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "periodFrom" timestamp(3) without time zone,
    "periodTo" timestamp(3) without time zone,
    status text DEFAULT 'created'::text NOT NULL,
    total numeric(14,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BillingBatch" OWNER TO fulexo_user;

--
-- Name: BillingBatchItem; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."BillingBatchItem" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "invoiceId" text NOT NULL,
    amount numeric(14,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BillingBatchItem" OWNER TO fulexo_user;

--
-- Name: BusinessHours; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."BusinessHours" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    weekday integer NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BusinessHours" OWNER TO fulexo_user;

--
-- Name: CalendarEvent; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."CalendarEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    description text,
    type text DEFAULT 'general'::text NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CalendarEvent" OWNER TO fulexo_user;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    email text,
    "emailNormalized" text,
    "phoneE164" text,
    name text,
    company text,
    "vatId" text,
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    "postalCode" text,
    country text,
    notes text,
    tags text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Customer" OWNER TO fulexo_user;

--
-- Name: EntityMap; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."EntityMap" (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "blId" text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EntityMap" OWNER TO fulexo_user;

--
-- Name: Holiday; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Holiday" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Holiday" OWNER TO fulexo_user;

--
-- Name: InboundItem; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."InboundItem" (
    id text NOT NULL,
    "inboundId" text NOT NULL,
    "productId" text,
    sku text,
    name text,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."InboundItem" OWNER TO fulexo_user;

--
-- Name: InboundShipment; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."InboundShipment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    reference text,
    status text DEFAULT 'created'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InboundShipment" OWNER TO fulexo_user;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    number text,
    series text,
    currency text,
    total numeric(14,2),
    "taxAmount" numeric(14,2),
    "pdfUrl" text,
    "issuedAt" timestamp(3) without time zone,
    "dueAt" timestamp(3) without time zone,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO fulexo_user;

--
-- Name: JwtKey; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."JwtKey" (
    id text NOT NULL,
    kid text NOT NULL,
    alg text NOT NULL,
    "publicJwk" jsonb NOT NULL,
    "privatePem" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rotatedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone
);


ALTER TABLE public."JwtKey" OWNER TO fulexo_user;

--
-- Name: OAuthCredential; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."OAuthCredential" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    provider text NOT NULL,
    secret jsonb NOT NULL,
    "keyVersion" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OAuthCredential" OWNER TO fulexo_user;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text,
    "accountId" text,
    "orderNo" integer,
    "blOrderId" text NOT NULL,
    "externalOrderNo" text,
    "orderSource" text,
    status text,
    "mappedStatus" text,
    total numeric(14,2),
    currency text,
    "customerEmail" text,
    "customerPhone" text,
    "shippingAddress" jsonb,
    "billingAddress" jsonb,
    "paymentMethod" text,
    notes text,
    tags text[],
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO fulexo_user;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    sku text,
    name text,
    qty integer NOT NULL,
    price numeric(14,2)
);


ALTER TABLE public."OrderItem" OWNER TO fulexo_user;

--
-- Name: OrderServiceCharge; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."OrderServiceCharge" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    type text NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'TRY'::text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OrderServiceCharge" OWNER TO fulexo_user;

--
-- Name: OwnershipRule; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."OwnershipRule" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" text NOT NULL,
    priority integer NOT NULL,
    "conditionsJson" jsonb NOT NULL,
    "actionJson" jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OwnershipRule" OWNER TO fulexo_user;

--
-- Name: Policy; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Policy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    modules jsonb NOT NULL,
    actions jsonb NOT NULL,
    "dataScope" jsonb NOT NULL,
    "piiSettings" jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Policy" OWNER TO fulexo_user;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    sku text NOT NULL,
    name text,
    description text,
    price numeric(14,2),
    stock integer,
    weight numeric(10,3),
    dimensions jsonb,
    images text[],
    tags text[],
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO fulexo_user;

--
-- Name: Request; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Request" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerId" text,
    "createdBy" text NOT NULL,
    type text NOT NULL,
    status text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    payload jsonb NOT NULL,
    "reviewerUserId" text,
    "reviewedAt" timestamp(3) without time zone,
    "appliedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Request" OWNER TO fulexo_user;

--
-- Name: RequestAttachment; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."RequestAttachment" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "mimeType" text,
    "fileSize" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RequestAttachment" OWNER TO fulexo_user;

--
-- Name: RequestComment; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."RequestComment" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "authorId" text NOT NULL,
    message text NOT NULL,
    "isInternal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RequestComment" OWNER TO fulexo_user;

--
-- Name: Return; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Return" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "blReturnId" text,
    status text,
    reason text,
    notes text,
    "refundAmount" numeric(14,2),
    items jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Return" OWNER TO fulexo_user;

--
-- Name: ReturnNotification; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."ReturnNotification" (
    id text NOT NULL,
    "returnId" text NOT NULL,
    channel text NOT NULL,
    subject text,
    message text,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ReturnNotification" OWNER TO fulexo_user;

--
-- Name: ReturnPhoto; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."ReturnPhoto" (
    id text NOT NULL,
    "returnId" text NOT NULL,
    "fileUrl" text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ReturnPhoto" OWNER TO fulexo_user;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    fingerprint text,
    "ipAddress" text,
    "userAgent" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Session" OWNER TO fulexo_user;

--
-- Name: Settings; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Settings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    category text NOT NULL,
    key text NOT NULL,
    value text,
    "isSecret" boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "updatedBy" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Settings" OWNER TO fulexo_user;

--
-- Name: Shipment; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Shipment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "blPackageId" text,
    carrier text,
    "trackingNo" text,
    status text,
    "labelUrl" text,
    "protocolUrl" text,
    weight numeric(10,3),
    dimensions jsonb,
    "shippedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Shipment" OWNER TO fulexo_user;

--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    "productId" text NOT NULL,
    type text NOT NULL,
    quantity integer NOT NULL,
    "relatedId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StockMovement" OWNER TO fulexo_user;

--
-- Name: SyncState; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."SyncState" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "entityType" text NOT NULL,
    "lastSyncAt" timestamp(3) without time zone NOT NULL,
    checkpoint jsonb,
    status text DEFAULT 'idle'::text NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SyncState" OWNER TO fulexo_user;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO fulexo_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role text NOT NULL,
    "twofaSecret" text,
    "twofaEnabled" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "failedAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO fulexo_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: fulexo_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO fulexo_user;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."AuditLog" (id, "tenantId", "userId", action, "entityType", "entityId", changes, metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
b9be318f-4131-4cd6-bd92-904c86b4c55b	adfad7f1-e7ad-4964-8edc-73bfffa454ec	5c2e82d5-5ad4-4d8e-ae66-e8501efc9382	login.failed	\N	\N	{}	{"reason": "invalid_password", "attempts": 1}	::ffff:172.18.0.6	curl/8.12.1	2025-08-30 13:13:13.99
6c2d7e66-8b21-4e56-97dd-e9998cc003ea	adfad7f1-e7ad-4964-8edc-73bfffa454ec	5c2e82d5-5ad4-4d8e-ae66-e8501efc9382	login.failed	\N	\N	{}	{"reason": "invalid_password", "attempts": 2}	::ffff:172.18.0.6	curl/8.12.1	2025-08-30 13:13:14.021
\.


--
-- Data for Name: BLAccount; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."BLAccount" (id, "tenantId", label, "tokenEncrypted", "keyVersion", active, "lastSyncAt", "syncState", "rateLimitReset", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BillingBatch; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."BillingBatch" (id, "tenantId", "periodFrom", "periodTo", status, total, "createdAt") FROM stdin;
\.


--
-- Data for Name: BillingBatchItem; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."BillingBatchItem" (id, "batchId", "invoiceId", amount, "createdAt") FROM stdin;
\.


--
-- Data for Name: BusinessHours; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."BusinessHours" (id, "tenantId", weekday, "startTime", "endTime", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CalendarEvent; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."CalendarEvent" (id, "tenantId", title, description, type, "startAt", "endAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Customer" (id, "tenantId", email, "emailNormalized", "phoneE164", name, company, "vatId", "addressLine1", "addressLine2", city, state, "postalCode", country, notes, tags, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EntityMap; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."EntityMap" (id, "entityType", "blId", "tenantId", "customerId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Holiday; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Holiday" (id, "tenantId", date, name, "createdAt") FROM stdin;
\.


--
-- Data for Name: InboundItem; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."InboundItem" (id, "inboundId", "productId", sku, name, quantity, "createdAt") FROM stdin;
\.


--
-- Data for Name: InboundShipment; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."InboundShipment" (id, "tenantId", reference, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Invoice" (id, "orderId", number, series, currency, total, "taxAmount", "pdfUrl", "issuedAt", "dueAt", "paidAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JwtKey; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."JwtKey" (id, kid, alg, "publicJwk", "privatePem", active, "createdAt", "rotatedAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: OAuthCredential; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."OAuthCredential" (id, "tenantId", provider, secret, "keyVersion", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Order" (id, "tenantId", "customerId", "accountId", "orderNo", "blOrderId", "externalOrderNo", "orderSource", status, "mappedStatus", total, currency, "customerEmail", "customerPhone", "shippingAddress", "billingAddress", "paymentMethod", notes, tags, "confirmedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."OrderItem" (id, "orderId", sku, name, qty, price) FROM stdin;
\.


--
-- Data for Name: OrderServiceCharge; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."OrderServiceCharge" (id, "orderId", type, amount, currency, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: OwnershipRule; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."OwnershipRule" (id, "tenantId", "entityType", priority, "conditionsJson", "actionJson", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Policy; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Policy" (id, "tenantId", name, description, modules, actions, "dataScope", "piiSettings", active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Product" (id, "tenantId", sku, name, description, price, stock, weight, dimensions, images, tags, active, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Request; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Request" (id, "tenantId", "customerId", "createdBy", type, status, priority, payload, "reviewerUserId", "reviewedAt", "appliedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RequestAttachment; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."RequestAttachment" (id, "requestId", "fileName", "fileUrl", "mimeType", "fileSize", "createdAt") FROM stdin;
\.


--
-- Data for Name: RequestComment; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."RequestComment" (id, "requestId", "authorId", message, "isInternal", "createdAt") FROM stdin;
\.


--
-- Data for Name: Return; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Return" (id, "orderId", "blReturnId", status, reason, notes, "refundAmount", items, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ReturnNotification; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."ReturnNotification" (id, "returnId", channel, subject, message, "sentAt") FROM stdin;
\.


--
-- Data for Name: ReturnPhoto; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."ReturnPhoto" (id, "returnId", "fileUrl", note, "createdAt") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Session" (id, "userId", token, fingerprint, "ipAddress", "userAgent", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Settings; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Settings" (id, "tenantId", category, key, value, "isSecret", metadata, "updatedBy", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Shipment; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Shipment" (id, "orderId", "blPackageId", carrier, "trackingNo", status, "labelUrl", "protocolUrl", weight, dimensions, "shippedAt", "deliveredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."StockMovement" (id, "productId", type, quantity, "relatedId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SyncState; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."SyncState" (id, "accountId", "entityType", "lastSyncAt", checkpoint, status, error, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."Tenant" (id, name, slug, "createdAt", "updatedAt") FROM stdin;
adfad7f1-e7ad-4964-8edc-73bfffa454ec	Demo Company	demo	2025-08-29 13:42:34.848	2025-08-29 13:42:34.848
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public."User" (id, "tenantId", email, "passwordHash", role, "twofaSecret", "twofaEnabled", "lastLoginAt", "failedAttempts", "lockedUntil", "createdAt", "updatedAt") FROM stdin;
5c2e82d5-5ad4-4d8e-ae66-e8501efc9382	adfad7f1-e7ad-4964-8edc-73bfffa454ec	fulexo@fulexo.com	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	FULEXO_ADMIN	\N	f	2025-08-30 14:49:08.222	0	\N	2025-08-29 13:55:33.198	2025-08-30 14:49:08.224
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: fulexo_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BLAccount BLAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BLAccount"
    ADD CONSTRAINT "BLAccount_pkey" PRIMARY KEY (id);


--
-- Name: BillingBatchItem BillingBatchItem_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BillingBatchItem"
    ADD CONSTRAINT "BillingBatchItem_pkey" PRIMARY KEY (id);


--
-- Name: BillingBatch BillingBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BillingBatch"
    ADD CONSTRAINT "BillingBatch_pkey" PRIMARY KEY (id);


--
-- Name: BusinessHours BusinessHours_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BusinessHours"
    ADD CONSTRAINT "BusinessHours_pkey" PRIMARY KEY (id);


--
-- Name: CalendarEvent CalendarEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."CalendarEvent"
    ADD CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: EntityMap EntityMap_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."EntityMap"
    ADD CONSTRAINT "EntityMap_pkey" PRIMARY KEY (id);


--
-- Name: Holiday Holiday_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Holiday"
    ADD CONSTRAINT "Holiday_pkey" PRIMARY KEY (id);


--
-- Name: InboundItem InboundItem_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."InboundItem"
    ADD CONSTRAINT "InboundItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundShipment InboundShipment_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."InboundShipment"
    ADD CONSTRAINT "InboundShipment_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: JwtKey JwtKey_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."JwtKey"
    ADD CONSTRAINT "JwtKey_pkey" PRIMARY KEY (id);


--
-- Name: OAuthCredential OAuthCredential_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OAuthCredential"
    ADD CONSTRAINT "OAuthCredential_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: OrderServiceCharge OrderServiceCharge_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OrderServiceCharge"
    ADD CONSTRAINT "OrderServiceCharge_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: OwnershipRule OwnershipRule_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OwnershipRule"
    ADD CONSTRAINT "OwnershipRule_pkey" PRIMARY KEY (id);


--
-- Name: Policy Policy_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Policy"
    ADD CONSTRAINT "Policy_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: RequestAttachment RequestAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."RequestAttachment"
    ADD CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY (id);


--
-- Name: RequestComment RequestComment_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_pkey" PRIMARY KEY (id);


--
-- Name: Request Request_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_pkey" PRIMARY KEY (id);


--
-- Name: ReturnNotification ReturnNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."ReturnNotification"
    ADD CONSTRAINT "ReturnNotification_pkey" PRIMARY KEY (id);


--
-- Name: ReturnPhoto ReturnPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."ReturnPhoto"
    ADD CONSTRAINT "ReturnPhoto_pkey" PRIMARY KEY (id);


--
-- Name: Return Return_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Return"
    ADD CONSTRAINT "Return_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: Settings Settings_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY (id);


--
-- Name: Shipment Shipment_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Shipment"
    ADD CONSTRAINT "Shipment_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: SyncState SyncState_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."SyncState"
    ADD CONSTRAINT "SyncState_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_action_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "AuditLog_action_createdAt_idx" ON public."AuditLog" USING btree (action, "createdAt");


--
-- Name: AuditLog_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON public."AuditLog" USING btree ("tenantId", "createdAt");


--
-- Name: AuditLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "AuditLog_userId_createdAt_idx" ON public."AuditLog" USING btree ("userId", "createdAt");


--
-- Name: BillingBatchItem_batchId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "BillingBatchItem_batchId_idx" ON public."BillingBatchItem" USING btree ("batchId");


--
-- Name: BillingBatchItem_invoiceId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "BillingBatchItem_invoiceId_idx" ON public."BillingBatchItem" USING btree ("invoiceId");


--
-- Name: BillingBatch_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "BillingBatch_tenantId_createdAt_idx" ON public."BillingBatch" USING btree ("tenantId", "createdAt");


--
-- Name: BusinessHours_tenantId_weekday_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "BusinessHours_tenantId_weekday_key" ON public."BusinessHours" USING btree ("tenantId", weekday);


--
-- Name: CalendarEvent_tenantId_startAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "CalendarEvent_tenantId_startAt_idx" ON public."CalendarEvent" USING btree ("tenantId", "startAt");


--
-- Name: Customer_tenantId_emailNormalized_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Customer_tenantId_emailNormalized_key" ON public."Customer" USING btree ("tenantId", "emailNormalized");


--
-- Name: Customer_tenantId_phoneE164_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Customer_tenantId_phoneE164_idx" ON public."Customer" USING btree ("tenantId", "phoneE164");


--
-- Name: EntityMap_entityType_blId_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "EntityMap_entityType_blId_key" ON public."EntityMap" USING btree ("entityType", "blId");


--
-- Name: EntityMap_tenantId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "EntityMap_tenantId_idx" ON public."EntityMap" USING btree ("tenantId");


--
-- Name: Holiday_tenantId_date_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Holiday_tenantId_date_idx" ON public."Holiday" USING btree ("tenantId", date);


--
-- Name: Holiday_tenantId_date_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Holiday_tenantId_date_key" ON public."Holiday" USING btree ("tenantId", date);


--
-- Name: InboundItem_inboundId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "InboundItem_inboundId_idx" ON public."InboundItem" USING btree ("inboundId");


--
-- Name: InboundItem_productId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "InboundItem_productId_idx" ON public."InboundItem" USING btree ("productId");


--
-- Name: InboundShipment_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "InboundShipment_tenantId_createdAt_idx" ON public."InboundShipment" USING btree ("tenantId", "createdAt");


--
-- Name: Invoice_number_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Invoice_number_idx" ON public."Invoice" USING btree (number);


--
-- Name: Invoice_orderId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Invoice_orderId_idx" ON public."Invoice" USING btree ("orderId");


--
-- Name: JwtKey_active_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "JwtKey_active_createdAt_idx" ON public."JwtKey" USING btree (active, "createdAt");


--
-- Name: JwtKey_kid_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "JwtKey_kid_key" ON public."JwtKey" USING btree (kid);


--
-- Name: OAuthCredential_tenantId_provider_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "OAuthCredential_tenantId_provider_key" ON public."OAuthCredential" USING btree ("tenantId", provider);


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: OrderServiceCharge_orderId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "OrderServiceCharge_orderId_idx" ON public."OrderServiceCharge" USING btree ("orderId");


--
-- Name: Order_tenantId_blOrderId_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Order_tenantId_blOrderId_key" ON public."Order" USING btree ("tenantId", "blOrderId");


--
-- Name: Order_tenantId_customerEmail_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Order_tenantId_customerEmail_idx" ON public."Order" USING btree ("tenantId", "customerEmail");


--
-- Name: Order_tenantId_externalOrderNo_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Order_tenantId_externalOrderNo_idx" ON public."Order" USING btree ("tenantId", "externalOrderNo");


--
-- Name: Order_tenantId_orderNo_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Order_tenantId_orderNo_key" ON public."Order" USING btree ("tenantId", "orderNo");


--
-- Name: Order_tenantId_status_confirmedAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Order_tenantId_status_confirmedAt_idx" ON public."Order" USING btree ("tenantId", status, "confirmedAt");


--
-- Name: OwnershipRule_tenantId_entityType_priority_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "OwnershipRule_tenantId_entityType_priority_idx" ON public."OwnershipRule" USING btree ("tenantId", "entityType", priority);


--
-- Name: Policy_tenantId_name_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Policy_tenantId_name_key" ON public."Policy" USING btree ("tenantId", name);


--
-- Name: Product_tenantId_active_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Product_tenantId_active_idx" ON public."Product" USING btree ("tenantId", active);


--
-- Name: Product_tenantId_sku_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON public."Product" USING btree ("tenantId", sku);


--
-- Name: RequestAttachment_requestId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "RequestAttachment_requestId_idx" ON public."RequestAttachment" USING btree ("requestId");


--
-- Name: RequestComment_requestId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "RequestComment_requestId_idx" ON public."RequestComment" USING btree ("requestId");


--
-- Name: Request_createdBy_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Request_createdBy_idx" ON public."Request" USING btree ("createdBy");


--
-- Name: Request_tenantId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Request_tenantId_status_createdAt_idx" ON public."Request" USING btree ("tenantId", status, "createdAt");


--
-- Name: ReturnNotification_returnId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "ReturnNotification_returnId_idx" ON public."ReturnNotification" USING btree ("returnId");


--
-- Name: ReturnPhoto_returnId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "ReturnPhoto_returnId_idx" ON public."ReturnPhoto" USING btree ("returnId");


--
-- Name: Return_orderId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Return_orderId_idx" ON public."Return" USING btree ("orderId");


--
-- Name: Session_token_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Session_token_idx" ON public."Session" USING btree (token);


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: Settings_tenantId_category_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Settings_tenantId_category_idx" ON public."Settings" USING btree ("tenantId", category);


--
-- Name: Settings_tenantId_category_key_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Settings_tenantId_category_key_key" ON public."Settings" USING btree ("tenantId", category, key);


--
-- Name: Shipment_orderId_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Shipment_orderId_idx" ON public."Shipment" USING btree ("orderId");


--
-- Name: Shipment_trackingNo_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "Shipment_trackingNo_idx" ON public."Shipment" USING btree ("trackingNo");


--
-- Name: StockMovement_productId_createdAt_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "StockMovement_productId_createdAt_idx" ON public."StockMovement" USING btree ("productId", "createdAt");


--
-- Name: SyncState_accountId_entityType_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "SyncState_accountId_entityType_key" ON public."SyncState" USING btree ("accountId", "entityType");


--
-- Name: SyncState_status_idx; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE INDEX "SyncState_status_idx" ON public."SyncState" USING btree (status);


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: fulexo_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: AuditLog AuditLog_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BLAccount BLAccount_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BLAccount"
    ADD CONSTRAINT "BLAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BillingBatchItem BillingBatchItem_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BillingBatchItem"
    ADD CONSTRAINT "BillingBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."BillingBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BillingBatchItem BillingBatchItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BillingBatchItem"
    ADD CONSTRAINT "BillingBatchItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BillingBatch BillingBatch_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BillingBatch"
    ADD CONSTRAINT "BillingBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BusinessHours BusinessHours_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."BusinessHours"
    ADD CONSTRAINT "BusinessHours_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CalendarEvent CalendarEvent_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."CalendarEvent"
    ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Customer Customer_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Holiday Holiday_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Holiday"
    ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundItem InboundItem_inboundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."InboundItem"
    ADD CONSTRAINT "InboundItem_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES public."InboundShipment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundItem InboundItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."InboundItem"
    ADD CONSTRAINT "InboundItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundShipment InboundShipment_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."InboundShipment"
    ADD CONSTRAINT "InboundShipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OAuthCredential OAuthCredential_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OAuthCredential"
    ADD CONSTRAINT "OAuthCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderServiceCharge OrderServiceCharge_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OrderServiceCharge"
    ADD CONSTRAINT "OrderServiceCharge_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."BLAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OwnershipRule OwnershipRule_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."OwnershipRule"
    ADD CONSTRAINT "OwnershipRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Policy Policy_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Policy"
    ADD CONSTRAINT "Policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RequestAttachment RequestAttachment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."RequestAttachment"
    ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."Request"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RequestComment RequestComment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RequestComment RequestComment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."RequestComment"
    ADD CONSTRAINT "RequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."Request"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Request Request_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Request Request_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReturnNotification ReturnNotification_returnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."ReturnNotification"
    ADD CONSTRAINT "ReturnNotification_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES public."Return"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReturnPhoto ReturnPhoto_returnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."ReturnPhoto"
    ADD CONSTRAINT "ReturnPhoto_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES public."Return"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Return Return_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Return"
    ADD CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Settings Settings_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Shipment Shipment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."Shipment"
    ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: fulexo_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict LlnbS4yOaVqL0s8KfPgHyN0VaTTWgJnQMk0nDqjdIzGg5NoN8r3HuufY2bTHtZV

