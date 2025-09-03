"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomersPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...init });

  const load = async (search?: string) => {
    const t = token(); if(!t){ router.push('/login'); return; }
    const url = new URL(`/api/customers`, window.location.origin);
    if(search) url.searchParams.set('search', search);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${t}` } });
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setItems(data?.data || []);
  };

  const create = async () => {
    const body = { name: name || undefined, email: email || undefined, phoneE164: phone || undefined, company: company || undefined };
    const r = await api('/customers', { method: 'POST', body: JSON.stringify(body) });
    if(r.ok){ setName(''); setEmail(''); setPhone(''); setCompany(''); await load(); }
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>

      <div className="mb-4 flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." className="px-3 py-2 bg-gray-800 border border-gray-700 rounded" />
        <button onClick={()=>load(q)} className="px-3 py-2 bg-blue-600 rounded">Search</button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Create Customer</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone E.164" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Company" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
        </div>
        <div className="mt-3">
          <button onClick={create} className="px-3 py-2 bg-green-600 rounded">Create</button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((c:any)=> (
          <div key={c.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-400">{c.email || '—'} • {c.phoneE164 || '—'}</div>
            <div className="font-semibold">{c.name || '—'} {c.company ? `• ${c.company}`:''}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-500">No customers</div>}
      </div>
    </div>
  );
}

