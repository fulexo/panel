"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReturnsPage(){
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, ...init });

  const load = async () => {
    const t = token(); if(!t){ router.push('/login'); return; }
    const r = await api('/returns');
    if(!r.ok){ if(r.status===401) router.push('/login'); return; }
    const data = await r.json();
    setItems(data?.data || []);
  };

  const addPhoto = async () => {
    if(!selected || !fileUrl) return;
    await api(`/returns/${selected}/photos`, { method: 'POST', body: JSON.stringify({ fileUrl, note: note || undefined }) });
    setFileUrl(''); setNote('');
    await load();
  };

  const notify = async () => {
    if(!selected) return;
    await api(`/returns/${selected}/notify`, { method: 'POST', body: JSON.stringify({ channel, subject: subject || undefined, message: message || undefined }) });
    setSubject(''); setMessage('');
    await load();
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Returns</h1>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 mb-6">
        <h2 className="font-semibold mb-2">Manage Return</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded">
            <option value="">Select Return</option>
            {items.map((r:any)=> (<option key={r.id} value={r.id}>{r.id.slice(0,8)} • {r.status || '—'}</option>))}
          </select>
          <input value={fileUrl} onChange={e=>setFileUrl(e.target.value)} placeholder="Photo URL" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <button onClick={addPhoto} className="px-3 py-2 bg-blue-600 rounded">Add Photo</button>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <select value={channel} onChange={e=>setChannel(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded">
            <option value="email">Email</option>
            <option value="web">Web</option>
          </select>
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message (optional)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded" />
          <button onClick={notify} className="px-3 py-2 bg-purple-600 rounded">Notify</button>
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((r:any)=> (
          <div key={r.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleString()}</div>
            <div className="font-semibold">{r.status || '—'} — {r.reason || ''}</div>
          </div>
        ))}
        {items.length===0 && <div className="text-gray-500">No returns</div>}
      </div>
    </div>
  );
}

