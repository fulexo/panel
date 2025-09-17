'use client';

import { useEffect, useState } from 'react';

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

export default function PublicCalendarPage() {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [hoursRes, holidaysRes] = await Promise.all([
        fetch('/api/calendar/business-hours', { credentials: 'include' }),
        fetch('/api/calendar/holidays', { credentials: 'include' })
      ]);

      if (!hoursRes.ok || !holidaysRes.ok) {
        throw new Error('Takvim verileri yüklenemedi');
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

  const getTodayInfo = () => {
    const today = new Date();
    const todayWeekday = today.getDay();
    const todayStr = today.toISOString().split('T')[0];
    
    const todayHours = businessHours.find(h => h.weekday === todayWeekday);
    const todayHoliday = holidays.find(h => h.date.startsWith(todayStr));
    
    return { todayHours, todayHoliday };
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    return holidays
      .filter(h => new Date(h.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };

  const isOpenNow = () => {
    const { todayHours, todayHoliday } = getTodayInfo();
    
    if (todayHoliday) return false;
    if (!todayHours) return null;
    
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    return currentTime >= todayHours.startTime && currentTime <= todayHours.endTime;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hata</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const { todayHours, todayHoliday } = getTodayInfo();
  const upcomingHolidays = getUpcomingHolidays();
  const openNow = isOpenNow();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Çalışma Saatleri</h1>
          <p className="text-xl text-gray-600">Hizmet verdiğimiz saatleri ve tatil günlerini görüntüleyin</p>
        </div>

        {/* Bugünkü Durum */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Bugün</h2>
          
          {todayHoliday ? (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-red-600 mb-2">{todayHoliday.name}</h3>
              <p className="text-gray-600">Bugün tatil günümüz. Hizmet vermiyoruz.</p>
            </div>
          ) : todayHours ? (
            <div className="text-center">
              <div className={`text-6xl mb-4 ${openNow ? 'text-green-500' : 'text-gray-400'}`}>
                {openNow ? '✅' : '❌'}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${openNow ? 'text-green-600' : 'text-gray-600'}`}>
                {openNow ? 'Açığız!' : 'Kapalıyız'}
              </h3>
              <p className="text-gray-600">
                Çalışma saatleri: <span className="font-semibold">{todayHours.startTime} - {todayHours.endTime}</span>
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">❓</div>
              <h3 className="text-2xl font-bold text-gray-600 mb-2">Bilinmiyor</h3>
              <p className="text-gray-600">Bugünkü çalışma saatleri belirlenmemiş.</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Çalışma Saatleri */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Haftalık Çalışma Saatleri</h3>
            
            {businessHours.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Çalışma saatleri belirlenmemiş</p>
            ) : (
              <div className="space-y-3">
                {WEEKDAYS.map((day, index) => {
                  const hour = businessHours.find(h => h.weekday === index);
                  const isToday = new Date().getDay() === index;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        isToday ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <span className={`font-medium ${isToday ? 'text-blue-900' : 'text-gray-700'}`}>
                        {day} {isToday && '(Bugün)'}
                      </span>
                      <span className={`${isToday ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                        {hour ? `${hour.startTime} - ${hour.endTime}` : 'Kapalı'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tatil Günleri */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Tatil Günleri</h3>
            
            {holidays.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Tatil günü yok</p>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday) => {
                  const holidayDate = new Date(holiday.date);
                  const isToday = holidayDate.toDateString() === new Date().toDateString();
                  const isPast = holidayDate < new Date();
                  
                  return (
                    <div 
                      key={holiday.id} 
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        isToday ? 'bg-red-50 border-2 border-red-200' : 
                        isPast ? 'bg-gray-100' : 'bg-red-50'
                      }`}
                    >
                      <div>
                        <span className={`font-medium ${
                          isToday ? 'text-red-900' : 
                          isPast ? 'text-gray-600' : 'text-red-700'
                        }`}>
                          {holiday.name}
                        </span>
                        {isToday && <span className="ml-2 text-red-600 font-semibold">(Bugün)</span>}
                      </div>
                      <span className={`text-sm ${
                        isToday ? 'text-red-600 font-semibold' : 
                        isPast ? 'text-gray-500' : 'text-red-600'
                      }`}>
                        {holidayDate.toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* İletişim Bilgileri */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Sorularınız mı var?</h3>
          <p className="text-blue-700">
            Çalışma saatleri hakkında daha fazla bilgi için bizimle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
}