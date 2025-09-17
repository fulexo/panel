"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OrderInfoPublic(){
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      try{
        const r = await fetch(`/api/orders/public/${token}`);
        if(!r.ok){ setError('Invalid or expired link'); return; }
        const d = await r.json();
        setData(d);
      }catch(e){ setError('Failed to load'); }
    };
    if(token) run();
  }, [token]);

  return (
  <ProtectedRoute>
    
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Order Information</h1>
      {error && <div className="text-red-400">{error}</div>}
      {!error && !data && <div className="text-gray-400">Loading...</div>}
      {data?.order && (
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="text-sm text-gray-400">{data.order.orderNo? `#${data.order.orderNo}`:''}</div>
          <div className="font-semibold mb-2">Status: {data.order.status}</div>
          <div className="text-sm mb-2">Total: {data.order.total} {data.order.currency}</div>
          <div className="text-sm mb-4">Confirmed: {data.order.confirmedAt ? new Date(data.order.confirmedAt).toLocaleString() : '—'}</div>
          <h2 className="font-semibold mb-2">Items</h2>
          <div className="space-y-1 text-sm">
            {data.order.items.map((it:any)=> (
              <div key={it.id} className="flex justify-between">
                <span>{it.qty} x {it.name || it.sku}</span>
                <span>{it.price ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </ProtectedRoute>
);
  );
}

