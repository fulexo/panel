"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function OrderDetailPage(){
  const router = useRouter();
  // @ts-ignore
  const params = useParams();
  const id = (params?.id as string) || '';
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [charge, setCharge] = useState({ type: '', amount: '', currency: '', notes: '' });

  const load = async () => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setOrder(data);
  };

  const addCharge = async () => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/orders/${id}/charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        type: charge.type,
        amount: Number(charge.amount),
        currency: charge.currency || undefined,
        notes: charge.notes || undefined,
      })
    });
    if(r.ok){ setCharge({ type:'', amount:'', currency:'', notes:'' }); await load(); }
  };

  const removeCharge = async (chargeId: string) => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/orders/${id}/charges/${chargeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if(r.ok){ await load(); }
  };

  useEffect(() => { if(id) load().finally(()=>setLoading(false)); }, [id]);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  if(!order) return <div className="min-h-screen bg-gray-900 text-white p-8">Not found</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-2">Order {order.orderNo ? `#${order.orderNo}` : order.blOrderId}</h1>
      <div className="text-gray-400 mb-6">Status: {order.status} • {order.customerEmail || '—'}</div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <h2 className="font-semibold mb-3">Items</h2>
          <div className="space-y-2">
            {(order.items||[]).map((it:any) => (
              <div key={it.id} className="flex justify-between text-sm">
                <div>{it.qty} x {it.name || it.sku}</div>
                <div>{it.price ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <h2 className="font-semibold mb-3">Service Charges</h2>
          <div className="space-y-2 mb-4">
            {(order.serviceCharges||[]).map((c:any) => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <div>{c.type} {c.notes? `• ${c.notes}`:''}</div>
                <div className="flex items-center gap-2">
                  <span>{c.amount} {c.currency}</span>
                  <button onClick={()=>removeCharge(c.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </div>
              </div>
            ))}
            {(!order.serviceCharges || order.serviceCharges.length===0) && <div className="text-gray-500 text-sm">No charges</div>}
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input value={charge.type} onChange={e=>setCharge({...charge, type:e.target.value})} placeholder="Type" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
            <input value={charge.amount} onChange={e=>setCharge({...charge, amount:e.target.value})} placeholder="Amount" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
            <input value={charge.currency} onChange={e=>setCharge({...charge, currency:e.target.value})} placeholder="Currency (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
            <input value={charge.notes} onChange={e=>setCharge({...charge, notes:e.target.value})} placeholder="Notes (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
            <button onClick={addCharge} className="px-3 py-2 bg-blue-600 rounded">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

