// Secure authentication utilities
export class AuthUtils {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly REFRESH_KEY = 'refresh_token';
  private static readonly USER_KEY = 'user';

  // Secure token storage with httpOnly cookies only
  static async setTokens(accessToken: string, refreshToken: string, user: Record<string, unknown>) {
    try {
      // Set httpOnly cookies via API
      const response = await fetch('/api/auth/set-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          refreshToken,
          user,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set secure tokens');
      }

      // Store user data in memory only (not localStorage for security)
      if (typeof window !== 'undefined') {
        // Only store non-sensitive user data in memory
        const safeUserData = {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenantName,
          twofaEnabled: user.twofaEnabled
        };
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(safeUserData));
      }
    } catch (error) {
      // Log error to monitoring service instead of console
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'token_set_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {}); // Silent fail for error logging
      }
      throw error;
    }
  }

  // Get token from secure storage (httpOnly cookie)
  static getToken(): string | null {
    // Tokens are now stored in httpOnly cookies, not accessible via JS
    // This method is kept for compatibility but returns null
    // The actual token will be sent automatically with requests
    return null;
  }

  // Get refresh token from secure storage (httpOnly cookie)
  static getRefreshToken(): string | null {
    // Refresh tokens are now stored in httpOnly cookies
    return null;
  }

  // Get user from secure storage (sessionStorage only)
  static getUser(): Record<string, unknown> | null {
    if (typeof window === 'undefined') return null;
    const userStr = sessionStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Clear all tokens
  static async clearTokens() {
    try {
      // Clear httpOnly cookies via API
      await fetch('/api/auth/clear-tokens', {
        method: 'POST',
      });

      // Clear sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem('temp_2fa_token');
        // Clear any remaining localStorage items for cleanup
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem('temp_2fa_token');
      }
    } catch (error) {
      // Log error to monitoring service instead of console
      if (typeof window !== 'undefined') {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'token_clear_failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {}); // Silent fail for error logging
      }
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    // Since tokens are now in httpOnly cookies, we check if user data exists
    const user = this.getUser();
    return user !== null;
  }

  // Get token expiration time (not accessible with httpOnly cookies)
  static getTokenExpiration(): number | null {
    // With httpOnly cookies, we can't access token expiration
    // The server will handle token validation
    return null;
  }

  // Check if token needs refresh (handled by server)
  static needsRefresh(): boolean {
    // Token refresh is now handled by the server automatically
    return false;
  }
}