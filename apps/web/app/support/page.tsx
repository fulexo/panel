"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SupportPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('OTHER');

  const load = async () => {
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/requests?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setItems(data?.data || []);
  };

  const create = async () => {
    if(!message.trim()) return;
    const token = localStorage.getItem('access_token');
    if(!token){ router.push('/login'); return; }
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ type, payload: { message } })
    });
    if(r.ok){ setMessage(''); await load(); }
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Support</h1>
      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">New Ticket</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <select value={type} onChange={e=>setType(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded">
            <option value="OTHER">General</option>
            <option value="ORDER_NOTE">Order</option>
            <option value="DOCUMENT_UPLOAD">Document</option>
            <option value="STOCK_ADJUSTMENT">Stock</option>
            <option value="NEW_PRODUCT">New Product</option>
          </select>
          <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Describe your issue..." className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <button onClick={create} className="px-3 py-2 bg-blue-600 rounded">Submit</button>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Your Tickets</h2>
      <div className="grid gap-3">
        {items.map((it:any)=> (
          <div key={it.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-400">{it.type} • {new Date(it.createdAt).toLocaleString()}</div>
            <div className="text-sm">Status: {it.status}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-500">No tickets</div>}
      </div>
    </div>
  );
}

