'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function CalendarWidget() {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      const [hoursRes, holidaysRes] = await Promise.all([
        fetch('/api/calendar/business-hours', { credentials: 'include' }),
        fetch('/api/calendar/holidays', { credentials: 'include' })
      ]);

      if (hoursRes.ok && holidaysRes.ok) {
        const [hoursData, holidaysData] = await Promise.all([
          hoursRes.json(),
          holidaysRes.json()
        ]);
        setBusinessHours(hoursData.hours || []);
        setHolidays(holidaysData.holidays || []);
      }
    } catch (error) {
      console.error('Takvim verisi yüklenemedi:', error);
      setError('Takvim verisi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getTodayInfo = () => {
    const today = new Date();
    const todayWeekday = today.getDay();
    const todayStr = today.toISOString().split('T')[0];
    
    const todayHours = businessHours.find(h => h.weekday === todayWeekday);
    const todayHoliday = holidays.find(h => h.date.startsWith(todayStr));
    
    return { todayHours, todayHoliday, todayWeekday };
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    return holidays
      .filter(h => new Date(h.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center">
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              loadCalendarData();
            }}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  const { todayHours, todayHoliday } = getTodayInfo();
  const upcomingHolidays = getUpcomingHolidays();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Takvim</h3>
        <Link 
          href="/calendar" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Tümünü Gör
        </Link>
      </div>

      {/* Bugünkü Durum */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Bugün</h4>
        {todayHoliday ? (
          <div className="text-red-600 text-sm">
            🎉 {todayHoliday.name} - Tatil
          </div>
        ) : todayHours ? (
          <div className="text-green-600 text-sm">
            ✅ Açık: {todayHours.startTime} - {todayHours.endTime}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">
            ❓ Çalışma saatleri belirlenmemiş
          </div>
        )}
      </div>

      {/* Çalışma Saatleri */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Çalışma Saatleri</h4>
        <div className="space-y-1 text-sm">
          {businessHours.slice(0, 3).map((hour) => (
            <div key={hour.weekday} className="flex justify-between">
              <span className="text-gray-600">{WEEKDAYS[hour.weekday]}</span>
              <span className="text-gray-900">
                {hour.startTime} - {hour.endTime}
              </span>
            </div>
          ))}
          {businessHours.length > 3 && (
            <div className="text-gray-500 text-xs">
              +{businessHours.length - 3} gün daha
            </div>
          )}
        </div>
      </div>

      {/* Yaklaşan Tatiller */}
      {upcomingHolidays.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Yaklaşan Tatiller</h4>
          <div className="space-y-1 text-sm">
            {upcomingHolidays.map((holiday) => (
              <div key={holiday.id} className="text-red-600">
                {holiday.name} - {new Date(holiday.date).toLocaleDateString('tr-TR')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}