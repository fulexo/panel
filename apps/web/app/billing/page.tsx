"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BillingPage(){
  const router = useRouter();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const [invoiceIds, setInvoiceIds] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...init });

  const load = async () => {
    const t = token(); if(!t){ router.push('/login'); return; }
    const r = await api('/billing/batches');
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setBatches(data?.data || []);
  };

  const create = async () => {
    await api('/billing/batches', { method: 'POST', body: JSON.stringify({}) });
    await load();
  };

  const addInvoices = async () => {
    if(!selected) return;
    const ids = invoiceIds.split(',').map(s=>s.trim()).filter(Boolean);
    if(ids.length===0) return;
    await api(`/billing/batches/${selected}/add-invoices`, { method: 'POST', body: JSON.stringify({ invoiceIds: ids }) });
    setInvoiceIds('');
    await load();
  };

  const issue = async (id: string) => {
    await api(`/billing/batches/${id}/issue`, { method: 'POST' });
    await load();
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Billing</h1>
        <button onClick={create} className="px-3 py-2 bg-blue-600 rounded">New Batch</button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Add Invoices to Batch</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded">
            <option value="">Select Batch</option>
            {batches.map((b:any)=> (<option key={b.id} value={b.id}>{b.id.slice(0,8)} • {b.status} • {b.total||0}</option>))}
          </select>
          <input value={invoiceIds} onChange={e=>setInvoiceIds(e.target.value)} placeholder="Invoice IDs comma-separated" className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <button onClick={addInvoices} className="px-3 py-2 bg-blue-600 rounded">Add</button>
        </div>
      </div>

      <div className="grid gap-3">
        {batches.map((b:any)=> (
          <div key={b.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-400">{new Date(b.createdAt).toLocaleString()}</div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{b.id}</div>
                <div className="text-sm">Status: {b.status} • Total: {b.total || 0}</div>
              </div>
              <div className="flex gap-2">
                <a className="px-2 py-1 bg-gray-700 rounded text-sm" href={`/api/billing/batches/${b.id}/export.csv`} target="_blank">CSV</a>
                <a className="px-2 py-1 bg-gray-700 rounded text-sm" href={`/api/billing/batches/${b.id}/export.pdf`} target="_blank">PDF</a>
                {b.status !== 'issued' && <button onClick={()=>issue(b.id)} className="px-2 py-1 bg-green-600 rounded text-sm">Issue</button>}
              </div>
            </div>
          </div>
        ))}
        {batches.length===0 && <div className="text-gray-500">No batches</div>}
      </div>
    </div>
  );
}

