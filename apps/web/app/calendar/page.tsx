'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent, useBusinessHours, useSetBusinessHours, useHolidays, useCreateHoliday } from '@/hooks/useCalendar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Clock, MapPin, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import EventModal from '@/components/EventModal';
import BusinessHoursModal from '@/components/BusinessHoursModal';
import HolidayModal from '@/components/HolidayModal';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
}



const eventTypes = {
  general: { label: 'Genel', tone: 'bg-primary/15 text-primary' },
  meeting: { label: 'Toplantı', tone: 'bg-[hsl(var(--info))]/15 text-[hsl(var(--info))]' },
  holiday: { label: 'Tatil', tone: 'bg-destructive/15 text-destructive' },
  maintenance: { label: 'Bakım', tone: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]' },
  closed: { label: 'Kapalı', tone: 'bg-muted text-muted-foreground' },
};

const weekdays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function CalendarPage() {
  useAuth();
  const { isAdmin } = useRBAC();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Load data using hooks
  const from = startOfMonth(currentDate).toISOString();
  const to = endOfMonth(currentDate).toISOString();
  
  const { data: eventsData, isLoading: eventsLoading } = useCalendarEvents({ from, to });
  const { data: businessHoursData, isLoading: businessHoursLoading } = useBusinessHours();
  const { data: holidaysData, isLoading: holidaysLoading } = useHolidays();

  const events = (eventsData as any)?.events || [];
  const businessHours = (businessHoursData as any)?.hours || [];
  const holidays = (holidaysData as any)?.holidays || [];
  const loading = eventsLoading || businessHoursLoading || holidaysLoading;

  // Mutations
  const createEventMutation = useCreateCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();
  const setBusinessHoursMutation = useSetBusinessHours();
  const createHolidayMutation = useCreateHoliday();

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

  const isWorkingDay = (date: Date) => {
    const weekday = date.getDay();
    const businessHour = businessHours.find((bh: any) => bh.weekday === weekday);
    return businessHour && businessHour.startTime && businessHour.endTime;
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfMonth(monthStart);
    const calendarEnd = endOfMonth(monthEnd);
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const holiday = getHolidayForDate(day);
          const isWorking = isWorkingDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(day)}
              className={cn(
                'group flex min-h-[110px] flex-col rounded-xl border border-border/70 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                !isCurrentMonth && 'bg-muted/40 text-muted-foreground',
                isToday && 'border-primary bg-primary/10 text-primary',
                !isWorking && 'border-destructive/40 bg-destructive/5',
                isSelected && 'ring-2 ring-offset-2 ring-ring',
                'hover:border-primary hover:bg-primary/10'
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>{format(day, 'd')}</span>
                {holiday && (
                  <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                    Tatil
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event: any) => (
                  <div
                    key={event.id}
                    className={cn(
                      'line-clamp-2 rounded-md px-2 py-1 text-xs font-medium shadow-sm',
                      eventTypes[event.type as keyof typeof eventTypes]?.tone || 'bg-muted text-muted-foreground'
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} daha</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;
    
    try {
      await deleteEventMutation.mutateAsync(eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id'>) => {
    try {
      if (editingEvent) {
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          data: {
            title: eventData.title,
            ...(eventData.description && { description: eventData.description }),
            type: eventData.type,
            startDate: eventData.startAt,
            endDate: eventData.endAt,
            ...(eventData.allDay !== undefined && { allDay: eventData.allDay }),
          },
        });
      } else {
        await createEventMutation.mutateAsync({
          title: eventData.title,
          ...(eventData.description && { description: eventData.description }),
          type: eventData.type,
          startDate: eventData.startAt,
          endDate: eventData.endAt,
          ...(eventData.allDay !== undefined && { allDay: eventData.allDay }),
        });
      }
      
      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleSaveBusinessHours = async (hours: Array<{ day: string; startTime?: string; endTime?: string; isWorkingDay?: boolean }>) => {
    try {
      await setBusinessHoursMutation.mutateAsync({ days: hours });
      setShowBusinessHoursModal(false);
    } catch (error) {
      console.error('Error saving business hours:', error);
    }
  };

  const handleSaveHoliday = async (holidayData: { name: string; date: string; description?: string; recurring?: boolean }) => {
    try {
      await createHolidayMutation.mutateAsync(holidayData);
      setShowHolidayModal(false);
    } catch (error) {
      console.error('Error saving holiday:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Takvim yükleniyor...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-8 space-y-6">
          <PageHeader
            title="Takvim Yönetimi"
            description="Mağaza operasyonlarınızı, çalışma saatlerini ve özel günleri tek ekrandan planlayın."
            icon={CalendarDays}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  ← Önceki
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Bugün
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  Sonraki →
                </Button>
                <Button size="sm" onClick={handleCreateEvent} className="gap-2">
                  <Plus className="h-4 w-4" /> Etkinlik Ekle
                </Button>
              </div>
            }
          />

          <div className="text-center text-sm font-medium text-muted-foreground">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </div>

          {/* Calendar */}
          <Card>
            <CardContent className="p-0">
              {renderCalendar()}
            </CardContent>
          </Card>

          {/* Management Tools */}
          {isAdmin() && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Çalışma Saatleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {businessHours.map((bh: any) => (
                      <div
                        key={bh.id}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-2"
                      >
                        <span className="text-sm font-semibold text-foreground">{weekdays[bh.weekday]}</span>
                        <span className="text-xs text-muted-foreground">
                          {bh.startTime} - {bh.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setShowBusinessHoursModal(true)}
                  >
                    Çalışma Saatlerini Düzenle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Resmi Tatiller
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {holidays.slice(0, 5).map((holiday: any) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2"
                      >
                        <span className="text-sm font-semibold text-destructive">{holiday.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(holiday.date), 'dd MMM', { locale: tr })}
                        </span>
                      </div>
                    ))}
                    {holidays.length > 5 && (
                      <div className="text-sm text-muted-foreground text-center">
                        +{holidays.length - 5} daha
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setShowHolidayModal(true)}
                  >
                    Tatil Ekle
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {format(selectedDate, 'dd MMMM yyyy', { locale: tr })} Etkinlikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map((event: any) => (
                    <div key={event.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/80 p-3">
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={eventTypes[event.type as keyof typeof eventTypes]?.tone || 'bg-muted text-muted-foreground'}>
                            {eventTypes[event.type as keyof typeof eventTypes]?.label || event.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.startAt), 'HH:mm')} - {format(new Date(event.endAt), 'HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Bu tarihte etkinlik bulunmuyor
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modals */}
          <EventModal
            isOpen={showEventModal}
            onClose={() => {
              setShowEventModal(false);
              setEditingEvent(null);
            }}
            onSave={handleSaveEvent}
            event={editingEvent}
            selectedDate={selectedDate}
          />

          <BusinessHoursModal
            isOpen={showBusinessHoursModal}
            onClose={() => setShowBusinessHoursModal(false)}
            onSave={handleSaveBusinessHours}
            currentHours={businessHours}
          />

          <HolidayModal
            isOpen={showHolidayModal}
            onClose={() => setShowHolidayModal(false)}
            onSave={handleSaveHoliday}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}