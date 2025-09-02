'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TwoFAPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

  useEffect(() => {
    const tmp = localStorage.getItem('temp_2fa_token') || '';
    if (tmp) setTempToken(tmp);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${apiBase}/auth/2fa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, twoFactorToken: token })
      });
      if(!r.ok){ throw new Error('2FA doğrulama başarısız'); }
      const data = await r.json();
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `access_token=${data.access}; path=/; max-age=900`;
      router.push('/dashboard');
    } catch(e:any){
      setError(e.message || '2FA doğrulama başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-gray-900">
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Two-Factor Authentication</h1>
          <p className="text-gray-300">Enter the 2FA code from your authenticator app</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Temporary Token</label>
            <input value={tempToken} onChange={e=>setTempToken(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Paste temp token" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">2FA Code</label>
            <input value={token} onChange={e=>setToken(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="123 456" />
          </div>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">{error}</div>}
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50">{loading ? 'Verifying…' : 'Verify'}</button>
        </form>
      </div>
    </div>
  );
}

