'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StoresPage(){
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [ck, setCk] = useState('');
  const [cs, setCs] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';
  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : '');
  const api = (path: string, init?: RequestInit) => fetch(`${apiBase}${path}`, { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...init });

  const load = async () => {
    const t = token(); if(!t){ router.push('/login'); return; }
    const r = await api('/woo/stores');
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setStores(data);
  };

  const add = async () => {
    if(!name || !baseUrl || !ck || !cs) return;
    const r = await api('/woo/stores', { method: 'POST', body: JSON.stringify({ name, baseUrl, consumerKey: ck, consumerSecret: cs }) });
    if(r.ok){ setName(''); setBaseUrl(''); setCk(''); setCs(''); await load(); }
  };

  const test = async (id: string) => {
    const r = await api(`/woo/stores/${id}/test`, { method: 'POST' });
    const res = await r.json();
    alert(`Test: ${res.ok ? 'OK' : 'Failed'} (HTTP ${res.status})`);
  };

  const registerHooks = async (id: string) => {
    const r = await api(`/woo/stores/${id}/register-webhooks`, { method: 'POST' });
    const res = await r.json();
    alert('Webhooks: ' + JSON.stringify(res.results));
  };

  const syncNow = async (id: string) => {
    const r1 = await api(`/jobs`, { method: 'POST', body: JSON.stringify({ name: 'woo-sync-orders', data: { storeId: id } }) });
    const r2 = await api(`/jobs`, { method: 'POST', body: JSON.stringify({ name: 'woo-sync-products', data: { storeId: id } }) });
    if(r1.ok && r2.ok) alert('Sync queued'); else alert('Failed to queue sync');
  };

  const remove = async (id: string) => {
    if(!confirm('Remove store?')) return;
    await api(`/woo/stores/${id}`, { method: 'DELETE' });
    await load();
  };

  useEffect(()=>{ load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Stores (WooCommerce)</h1>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Add Store</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="Base URL (https://...)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={ck} onChange={e=>setCk(e.target.value)} placeholder="Consumer Key" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={cs} onChange={e=>setCs(e.target.value)} placeholder="Consumer Secret" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
        </div>
        <div className="mt-3">
          <button onClick={add} className="px-3 py-2 bg-blue-600 rounded">Add</button>
        </div>
      </div>

      <div className="grid gap-3">
        {stores.map((s:any)=> (
          <div key={s.id} className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-gray-400">{s.baseUrl}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>test(s.id)} className="px-2 py-1 bg-gray-700 rounded text-sm">Test</button>
              <button onClick={()=>registerHooks(s.id)} className="px-2 py-1 bg-purple-600 rounded text-sm">Register Webhooks</button>
              <button onClick={()=>syncNow(s.id)} className="px-2 py-1 bg-blue-600 rounded text-sm">Sync Now</button>
              <button onClick={()=>remove(s.id)} className="px-2 py-1 bg-red-600 rounded text-sm">Remove</button>
            </div>
          </div>
        ))}
        {stores.length===0 && <div className="text-gray-500">No stores</div>}
      </div>
    </div>
  );
}