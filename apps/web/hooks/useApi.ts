import { useState, useCallback } from 'react';
import { ApiResponse, ApiError } from '@/types/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (endpoint: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useApi<T = unknown>(
  apiFunction: (endpoint: string, options?: RequestInit) => Promise<Response>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (endpoint: string, options?: RequestInit): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiFunction(endpoint, options);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        const errorMessage = errorData.message || 'API request failed';
        const errorCode = errorData.errorCode || 'UNKNOWN_ERROR';
        throw new Error(`${errorCode}: ${errorMessage}`);
      }

      const result: ApiResponse<T> = await response.json();
      setState({
        data: result.data,
        loading: false,
        error: null,
      });
      
      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      
      // Log error to monitoring service
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'api_error',
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
            url: window.location.href,
          }),
        }).catch(() => {}); // Silent fail for error logging
      }
      
      return null;
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// Specialized hooks for common operations
export function useOrders() {
  const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
    return fetch(`/api${endpoint}`, {
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
  }, []);

  return useApi(apiCall);
}

export function useProducts() {
  const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
    return fetch(`/api${endpoint}`, {
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
  }, []);

  return useApi(apiCall);
}

export function useCustomers() {
  const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
    return fetch(`/api${endpoint}`, {
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
  }, []);

  return useApi(apiCall);
}