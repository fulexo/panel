import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantContext = { tenantId?: string };

export const tenantContext = new AsyncLocalStorage<TenantContext>();

