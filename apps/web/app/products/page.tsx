"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductsPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async (query?: string) => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    const url = new URL(`/api/products`, window.location.origin);
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '20');
    if(query) url.searchParams.set('search', query);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }});
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setItems(data?.data || []);
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="mb-4 flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="px-3 py-2 bg-gray-800 border border-gray-700 rounded" />
        <button onClick={()=>load(q)} className="px-3 py-2 bg-blue-600 rounded">Search</button>
      </div>
      <div className="grid gap-3">
        {items.map((p:any) => (
          <div key={p.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-400">{p.sku}</div>
            <div className="font-semibold">{p.name || '—'} — {p.price ?? '—'}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-400">No products</div>}
      </div>
    </div>
  );
}