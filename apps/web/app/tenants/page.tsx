"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TenantsPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...init });

  const load = async () => {
    const t = token(); if(!t){ router.push('/login'); return; }
    const r = await api('/tenants');
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setItems(data?.data || []);
  };

  const impersonate = async (id: string) => {
    const r = await api(`/tenants/${id}/impersonate`, { method: 'POST' });
    if(r.ok){
      const result = await r.json();
      localStorage.setItem('access_token', result.tokens.access);
      localStorage.setItem('refresh_token', result.tokens.refresh);
      // Optionally reload
      router.push('/dashboard');
    }
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Tenants</h1>
      <div className="grid gap-3">
        {items.map((t:any)=> (
          <div key={t.id} className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center">
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-gray-400">{t.slug}</div>
            </div>
            <button onClick={()=>impersonate(t.id)} className="px-3 py-2 bg-blue-600 rounded">Impersonate</button>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-500">No tenants</div>}
      </div>
    </div>
  );
}

