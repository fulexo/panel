'use client';

import { useState, useEffect } from 'react';
import { WooCommerceClient, WooCommerceConfig } from '@/lib/woocommerce-client';
import { useRBAC } from './useRBAC';

export interface Store {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config: WooCommerceConfig;
}

export function useWooCommerce() {
  const { isAdmin, user } = useRBAC();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stores based on user role
  useEffect(() => {
    loadStores();
  }, [isAdmin, user]);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stores', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load stores');
      }

      const data = await response.json();
      setStores(data.stores || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStoreClient = (storeId: string): WooCommerceClient | null => {
    const store = stores.find(s => s.id === storeId);
    if (!store || store.status !== 'connected') {
      return null;
    }

    return new WooCommerceClient(store.config);
  };

  const syncStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      // Reload stores to get updated sync status
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const testConnection = async (config: WooCommerceConfig): Promise<boolean> => {
    try {
      const client = new WooCommerceClient(config);
      return await client.healthCheck();
    } catch {
      return false;
    }
  };

  const addStore = async (storeData: Omit<Store, 'id' | 'status' | 'lastSync'>) => {
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeData),
      });

      if (!response.ok) {
        throw new Error('Failed to add store');
      }

      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add store');
    }
  };

  const updateStore = async (storeId: string, updates: Partial<Store>) => {
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update store');
      }

      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update store');
    }
  };

  const deleteStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete store');
      }

      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete store');
    }
  };

  // Get stores accessible by current user
  const getAccessibleStores = (): Store[] => {
    if (isAdmin()) {
      return stores;
    }
    
    // For customers, return only their assigned store
    // This would be determined by the user's store_id in the backend
    return stores.filter(_store => {
      // This logic would be implemented based on your user-store relationship
      return true; // Placeholder
    });
  };

  return {
    stores: getAccessibleStores(),
    loading,
    error,
    loadStores,
    getStoreClient,
    syncStore,
    testConnection,
    addStore,
    updateStore,
    deleteStore,
    isAdmin: isAdmin(),
  };
}