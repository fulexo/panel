"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarPage(){
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => fetch(`/api${path}`, { headers: {  , 'Content-Type': 'application/json' }, ...init });

  const load = async () => {
    const t = null;
    if(!t){ router.push('/login'); return; }
    const [e, bh, h] = await Promise.all([
      api('/calendar/events'),
      api('/calendar/business-hours'),
      api('/calendar/holidays'),
    ]);
    const [events, hrs, hols] = await Promise.all([e.json(), bh.json(), h.json()]);
    setEvents(events.events || []);
    setHours(hrs.hours || []);
    setHolidays(hols.holidays || []);
  };

  const addEvent = async () => {
    const now = new Date();
    const in1h = new Date(now.getTime()+60*60*1000);
    await api('/calendar/events', { method: 'POST', body: JSON.stringify({ title: 'New Event', startAt: now.toISOString(), endAt: in1h.toISOString() }) });
    await load();
  };

  const setDefaultHours = async () => {
    const hours = Array.from({ length: 7 }).map((_, i) => ({ weekday: i, startTime: '09:00', endTime: '18:00' }));
    await api('/calendar/business-hours', { method: 'POST', body: JSON.stringify({ hours }) });
    await load();
  };

  const addHoliday = async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    await api('/calendar/holidays', { method: 'POST', body: JSON.stringify({ date: today.toISOString(), name: 'Holiday' }) });
    await load();
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  if(loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Events</h2>
            <button onClick={addEvent} className="px-2 py-1 bg-blue-600 rounded text-sm">Add</button>
          </div>
          <div className="space-y-2">
            {events.map((ev:any)=> (
              <div key={ev.id} className="text-sm">
                <div className="font-medium">{ev.title}</div>
                <div className="text-gray-400">{new Date(ev.startAt).toLocaleString()} - {new Date(ev.endAt).toLocaleString()}</div>
              </div>
            ))}
            {events.length===0 && <div className="text-gray-500 text-sm">No events</div>}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Business Hours</h2>
            <button onClick={setDefaultHours} className="px-2 py-1 bg-blue-600 rounded text-sm">Set 09:00-18:00</button>
          </div>
          <div className="space-y-2 text-sm">
            {hours.map((h:any)=> (
              <div key={h.weekday} className="flex justify-between">
                <span>Day {h.weekday}</span>
                <span>{h.startTime} - {h.endTime}</span>
              </div>
            ))}
            {hours.length===0 && <div className="text-gray-500">No hours set</div>}
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Holidays</h2>
            <button onClick={addHoliday} className="px-2 py-1 bg-blue-600 rounded text-sm">Add Today</button>
          </div>
          <div className="space-y-2 text-sm">
            {holidays.map((h:any)=> (
              <div key={h.id} className="flex justify-between">
                <span>{new Date(h.date).toLocaleDateString()}</span>
                <span>{h.name}</span>
              </div>
            ))}
            {holidays.length===0 && <div className="text-gray-500">No holidays</div>}
          </div>
        </div>
      </div>
    </div>
  </ProtectedRoute>
);
}

