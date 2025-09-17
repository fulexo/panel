export interface AuthenticatedUser {
  id: string;
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
  jti?: string;
}