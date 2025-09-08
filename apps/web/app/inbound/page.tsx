"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InboundPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState('');
  const [selected, setSelected] = useState<string>('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...init });

  const load = async () => {
    const t = token(); if(!t){ router.push('/login'); return; }
    const r = await api('/inbound/shipments');
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setItems(data?.data || []);
  };

  const create = async () => {
    await api('/inbound/shipments', { method: 'POST', body: JSON.stringify({ reference: ref || undefined }) });
    setRef('');
    await load();
  };

  const addItem = async () => {
    if(!selected) return;
    await api(`/inbound/shipments/${selected}/items`, { method: 'POST', body: JSON.stringify({ sku: sku || undefined, name: name || undefined, quantity: Number(qty||'0') }) });
    setSku(''); setName(''); setQty('');
    await load();
  };

  const receive = async (id: string) => {
    await api(`/inbound/shipments/${id}/receive`, { method: 'POST' });
    await load();
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inbound Shipments</h1>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Create Shipment</h2>
        <div className="flex gap-2">
          <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Reference (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <button onClick={create} className="px-3 py-2 bg-blue-600 rounded">Create</button>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Add Item to Shipment</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded">
            <option value="">Select Shipment</option>
            {items.map((s:any)=> (<option key={s.id} value={s.id}>{s.reference || s.id.slice(0,8)} • {s.status}</option>))}
          </select>
          <input value={sku} onChange={e=>setSku(e.target.value)} placeholder="SKU (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Qty" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <button onClick={addItem} className="px-3 py-2 bg-blue-600 rounded">Add</button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((s:any)=> (
          <div key={s.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">{new Date(s.createdAt).toLocaleString()}</div>
                <div className="font-semibold">{s.reference || s.id}</div>
                <div className="text-sm">Status: {s.status}</div>
              </div>
              <div className="flex gap-2">
                {s.status==='created' && <button onClick={()=>receive(s.id)} className="px-2 py-1 bg-green-600 rounded text-sm">Receive</button>}
              </div>
            </div>
            <div className="mt-3 text-sm">
              {(s.items||[]).map((it:any)=> (
                <div key={it.id} className="flex justify-between">
                  <span>{it.quantity} x {it.name || it.sku || '—'}</span>
                </div>
              ))}
              {(!s.items || s.items.length===0) && <div className="text-gray-500">No items</div>}
            </div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-500">No inbound shipments</div>}
      </div>
    </div>
  );
}

