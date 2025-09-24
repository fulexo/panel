'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useCalendarEvents, useHolidays } from '@/hooks/useCalendar';
import Link from 'next/link';


const eventTypes = {
  general: { label: 'Genel', color: 'bg-blue-100 text-blue-800' },
  meeting: { label: 'Toplantı', color: 'bg-green-100 text-green-800' },
  holiday: { label: 'Tatil', color: 'bg-red-100 text-red-800' },
  maintenance: { label: 'Bakım', color: 'bg-yellow-100 text-yellow-800' },
  closed: { label: 'Kapalı', color: 'bg-gray-100 text-gray-800' },
};

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Load data using hooks
  const from = startOfMonth(currentDate).toISOString();
  const to = endOfMonth(currentDate).toISOString();
  
  const { data: eventsData, isLoading: eventsLoading } = useCalendarEvents({ from, to });
  const { data: holidaysData, isLoading: holidaysLoading } = useHolidays();

  const events = (eventsData as any)?.events || [];
  const holidays = (holidaysData as any)?.holidays || [];
  const loading = eventsLoading || holidaysLoading;

  const getEventsForDate = (date: Date) => {
    return events.filter((event: any) => {
      const eventDate = new Date(event.startAt);
      return isSameDay(eventDate, date);
    });
  };

  const getHolidayForDate = (date: Date) => {
    return holidays.find((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return isSameDay(holidayDate, date);
    });
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events
      .filter((event: any) => {
        const eventDate = new Date(event.startAt);
        return eventDate >= today && eventDate <= nextWeek;
      })
      .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5);
  };

  const renderMiniCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfMonth(monthStart);
    const calendarEnd = endOfMonth(monthEnd);
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map(day => (
          <div key={day} className="p-1 text-center font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const holiday = getHolidayForDate(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={`
                p-1 text-center cursor-pointer rounded hover:bg-gray-100
                ${!isCurrentMonth ? 'text-gray-400' : ''}
                ${isToday ? 'bg-blue-100 text-blue-600 font-bold' : ''}
                ${holiday ? 'bg-red-100 text-red-600' : ''}
                ${dayEvents.length > 0 ? 'bg-green-100' : ''}
              `}
            >
              <div className="relative">
                {format(day, 'd')}
                {dayEvents.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const upcomingEvents = getUpcomingEvents();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Takvim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Takvim
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Bugün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              →
            </Button>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {format(currentDate, 'MMMM yyyy', { locale: tr })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Calendar */}
        <div>
          {renderMiniCalendar()}
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Yaklaşan Etkinlikler
            </h4>
            <div className="space-y-2">
              {upcomingEvents.map((event: any) => (
                <div key={event.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(event.startAt), 'dd MMM HH:mm')}
                    </div>
                  </div>
                  <Badge className={eventTypes[event.type as keyof typeof eventTypes]?.color || 'bg-gray-100 text-gray-800'}>
                    {eventTypes[event.type as keyof typeof eventTypes]?.label || event.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Holidays */}
        {holidays.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Tatiller
            </h4>
            <div className="space-y-1">
              {holidays.slice(0, 3).map((holiday: any) => (
                <div key={holiday.id} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{holiday.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(holiday.date), 'dd MMM')}
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Tatil
                  </Badge>
                </div>
              ))}
              {holidays.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{holidays.length - 3} daha
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Full Calendar Button */}
        <div className="pt-2">
          <Link href="/calendar">
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Tam Takvimi Görüntüle
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}