'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TwoFAPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tmp = localStorage.getItem('temp_2fa_token') || '';
    if (tmp) setTempToken(tmp);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/auth/2fa/login`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, twoFactorToken: token })
      });
      
      if(!r.ok){ 
        const errorData = await r.json();
        throw new Error(errorData.message || '2FA verification failed'); 
      }
      
      const data = await r.json();
      
      // Backend sets httpOnly cookies, we just need to handle the response
      // No need to manually set localStorage or cookies
      if (data.data) {
        // Redirect to dashboard - AuthProvider will handle user state
        router.push('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch(e: unknown){
      setError(e instanceof Error ? e.message : '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-foreground rounded-2xl mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="mobile-heading text-foreground mb-2">Two-Factor Authentication</h1>
          <p className="text-muted-foreground">Enter the 2FA code from your authenticator app</p>
        </div>

        {/* 2FA Form */}
        <div className="bg-card/50 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl border border-border animate-scale-in">
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Temporary Token
              </label>
              <input
                value={tempToken}
                onChange={e => setTempToken(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                placeholder="Paste temp token"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                2FA Code
              </label>
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground text-center text-2xl tracking-widest"
                placeholder="123456"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error animate-slide-down">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full btn btn-outline btn-lg btn-animate"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner-sm"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-accent/50 rounded-lg">
            <h3 className="text-sm font-medium text-foreground mb-2">Need Help?</h3>
            <div className="text-xs text-muted space-y-1">
              <div>• Open your authenticator app (Google Authenticator, Authy, etc.)</div>
              <div>• Enter the 6-digit code displayed</div>
              <div>• The code refreshes every 30 seconds</div>
            </div>
          </div>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/login')}
            className="btn btn-ghost btn-sm"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

