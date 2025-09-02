"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchPage(){
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [results, setResults] = useState<any>({ orders: [], products: [], customers: [] });
  const [loading, setLoading] = useState(false);

  const run = async (query: string) => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    setLoading(true);
    try{
      const url = new URL(`/api/search`, window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('types', 'orders,products,customers');
      url.searchParams.set('limitPerType', '10');
      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }});
      if(!r.ok){ if(r.status===401) router.push('/login'); return; }
      const data = await r.json();
      setResults({ orders: data.orders || [], products: data.products || [], customers: data.customers || [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = params.get('q');
    if(initial){ setQ(initial); run(initial); }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <div className="mb-6 flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="px-3 py-2 bg-gray-800 border border-gray-700 rounded w-full max-w-2xl" />
        <button onClick={()=>{ if(q.trim()) run(q.trim()); }} className="px-3 py-2 bg-blue-600 rounded">Search</button>
      </div>

      {loading && <div className="text-gray-400">Searching...</div>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Orders</h2>
            <div className="space-y-2">
              {results.orders.map((o:any)=> (
                <a key={o.id} href={`/orders`} className="block bg-gray-800 p-3 rounded border border-gray-700">
                  <div className="text-sm text-gray-400">{o.externalOrderNo || o.id}</div>
                  <div className="text-sm">{o.customerEmail || '—'} — {o.total} {o.currency}</div>
                </a>
              ))}
              {results.orders.length===0 && <div className="text-gray-500 text-sm">No orders</div>}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Products</h2>
            <div className="space-y-2">
              {results.products.map((p:any)=> (
                <a key={p.id} href={`/products`} className="block bg-gray-800 p-3 rounded border border-gray-700">
                  <div className="text-sm text-gray-400">{p.sku}</div>
                  <div className="text-sm">{p.name || '—'} — {p.price ?? '—'}</div>
                </a>
              ))}
              {results.products.length===0 && <div className="text-gray-500 text-sm">No products</div>}
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Customers</h2>
            <div className="space-y-2">
              {results.customers.map((c:any)=> (
                <div key={c.id} className="bg-gray-800 p-3 rounded border border-gray-700">
                  <div className="text-sm">{c.name || '—'}{c.company ? ` • ${c.company}`:''}</div>
                  <div className="text-xs text-gray-400">{c.email || '—'} {c.phoneE164 ? `• ${c.phoneE164}`:''}</div>
                </div>
              ))}
              {results.customers.length===0 && <div className="text-gray-500 text-sm">No customers</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

