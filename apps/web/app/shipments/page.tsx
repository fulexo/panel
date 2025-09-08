"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ShipmentsPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    fetch(`/api/shipments?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async r => {
      if(!r.ok){ if(r.status===401) router.push('/login'); return; }
      const data = await r.json();
      setItems(data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Shipments</h1>
      <div className="grid gap-3">
        {items.map((s:any) => (
          <div key={s.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-400">{s.trackingNo || '—'} • {s.status}</div>
            <div className="font-semibold">{s.carrier || '—'}{s.shippedAt ? ` — ${new Date(s.shippedAt).toLocaleString()}` : ''}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-400">No shipments</div>}
      </div>
    </div>
  );
}