'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';

interface BusinessHours {
  weekday: number;
  startTime: string;
  endTime: string;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = (path: string, init?: RequestInit) => 
    fetch(`/api${path}`, { 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init 
    });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [hoursRes, holidaysRes] = await Promise.all([
        api('/calendar/business-hours'),
        api('/calendar/holidays')
      ]);

      if (!hoursRes.ok || !holidaysRes.ok) {
        throw new Error('Veri yüklenemedi');
      }

      const [hoursData, holidaysData] = await Promise.all([
        hoursRes.json(),
        holidaysRes.json()
      ]);

      setBusinessHours(hoursData.hours || []);
      setHolidays(holidaysData.holidays || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = async () => {
    const date = prompt('Tatil tarihi (YYYY-MM-DD):');
    const name = prompt('Tatil adı:');
    
    if (!date || !name) return;

    try {
      const response = await api('/calendar/holidays', {
        method: 'POST',
        body: JSON.stringify({ date, name })
      });

      if (!response.ok) {
        throw new Error('Tatil eklenemedi');
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tatil eklenemedi');
    }
  };

  const removeHoliday = async (id: string) => {
    if (!confirm('Bu tatili silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await api(`/calendar/holidays/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Tatil silinemedi');
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tatil silinemedi');
    }
  };

  const updateBusinessHours = async () => {
    const hours = businessHours.map(h => ({
      weekday: h.weekday,
      startTime: h.startTime,
      endTime: h.endTime
    }));

    try {
      const response = await api('/calendar/business-hours', {
        method: 'POST',
        body: JSON.stringify({ hours })
      });

      if (!response.ok) {
        throw new Error('Çalışma saatleri güncellenemedi');
      }

      alert('Çalışma saatleri güncellendi!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Çalışma saatleri güncellenemedi');
    }
  };

  const setDefaultHours = () => {
    const defaultHours = WEEKDAYS.map((_, index) => ({
      weekday: index,
      startTime: index === 0 || index === 6 ? '10:00' : '09:00', // Pazar ve Cumartesi 10:00, diğerleri 09:00
      endTime: index === 0 || index === 6 ? '16:00' : '18:00'    // Pazar ve Cumartesi 16:00, diğerleri 18:00
    }));
    setBusinessHours(defaultHours);
  };

  const updateHour = (weekday: number, field: 'startTime' | 'endTime', value: string) => {
    setBusinessHours(prev => 
      prev.map(h => 
        h.weekday === weekday 
          ? { ...h, [field]: value }
          : h
      )
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Takvim Yönetimi</h1>
            <p className="text-gray-600 mt-2">Çalışma saatleri ve tatil günlerini yönetin</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Çalışma Saatleri */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Çalışma Saatleri</h2>
                <div className="space-x-2">
                  <button
                    onClick={setDefaultHours}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                  >
                    Varsayılan
                  </button>
                  <button
                    onClick={updateBusinessHours}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {WEEKDAYS.map((day, index) => {
                  const hour = businessHours.find(h => h.weekday === index) || {
                    weekday: index,
                    startTime: '09:00',
                    endTime: '18:00'
                  };

                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium text-gray-700">
                        {day}
                      </div>
                      <input
                        type="time"
                        value={hour.startTime}
                        onChange={(e) => updateHour(index, 'startTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="time"
                        value={hour.endTime}
                        onChange={(e) => updateHour(index, 'endTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tatil Günleri */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Tatil Günleri</h2>
                <button
                  onClick={addHoliday}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Tatil Ekle
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Henüz tatil günü eklenmemiş</p>
                ) : (
                  holidays.map((holiday) => (
                    <div key={holiday.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-gray-900">{holiday.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(holiday.date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <button
                        onClick={() => removeHoliday(holiday.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Sil
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Önizleme */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Müşteri Görünümü Önizleme</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Çalışma Saatleri</h4>
                <div className="space-y-1 text-sm">
                  {businessHours.map((hour) => (
                    <div key={hour.weekday} className="flex justify-between">
                      <span>{WEEKDAYS[hour.weekday]}</span>
                      <span className="text-gray-600">
                        {hour.startTime} - {hour.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Tatil Günleri</h4>
                <div className="space-y-1 text-sm">
                  {holidays.length === 0 ? (
                    <p className="text-gray-500">Tatil günü yok</p>
                  ) : (
                    holidays.map((holiday) => (
                      <div key={holiday.id} className="text-red-600">
                        {holiday.name} - {new Date(holiday.date).toLocaleDateString('tr-TR')}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}