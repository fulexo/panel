export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER' | 'CUSTOMER_USER' | 'FULEXO_ADMIN' | 'FULEXO_STAFF';
  tenantId: string;
  tenantName?: string;
  twofaEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface TwoFactorResponse {
  access: string;
  refresh: string;
  user: User;
}