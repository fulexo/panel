export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  tenantId: string;
  tenantName?: string;
  twofaEnabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
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