// Secure authentication utilities
export class AuthUtils {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly REFRESH_KEY = 'refresh_token';
  private static readonly USER_KEY = 'user';

  // Secure token storage with httpOnly cookies
  static async setTokens(accessToken: string, refreshToken: string, user: any) {
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

      // Also set in localStorage as fallback for client-side access
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.TOKEN_KEY, accessToken);
        localStorage.setItem(this.REFRESH_KEY, refreshToken);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } catch (error) {
      console.error('Error setting tokens:', error);
      throw error;
    }
  }

  // Get token from secure storage
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Get refresh token from secure storage
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_KEY);
  }

  // Get user from secure storage
  static getUser(): any | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Clear all tokens
  static async clearTokens() {
    try {
      // Clear httpOnly cookies via API
      await fetch('/api/auth/clear-tokens', {
        method: 'POST',
      });

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem('temp_2fa_token');
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Basic JWT expiration check
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // Get token expiration time
  static getTokenExpiration(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }

  // Check if token needs refresh (within 5 minutes of expiry)
  static needsRefresh(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    const fiveMinutes = 5 * 60 * 1000;
    return expiration - Date.now() < fiveMinutes;
  }
}