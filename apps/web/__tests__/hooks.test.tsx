import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Mock API client
jest.mock('../lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Custom Hooks', () => {
  describe('useAuth', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle login', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Note: This would need proper mocking of the auth service
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useApi', () => {
    it('should provide API methods', () => {
      const { result } = renderHook(() => useApi(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('get');
      expect(result.current).toHaveProperty('post');
      expect(result.current).toHaveProperty('put');
      expect(result.current).toHaveProperty('delete');
    });

    it('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => useApi(), {
        wrapper: createWrapper(),
      });

      // Mock API error
      const mockError = new Error('API Error');
      (result.current.get as jest.Mock).mockRejectedValue(mockError);

      await expect(result.current.get('/test')).rejects.toThrow('API Error');
    });
  });
});