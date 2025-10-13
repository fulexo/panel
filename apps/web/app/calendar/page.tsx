'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent, useBusinessHours, useSetBusinessHours, useHolidays, useCreateHoliday } from '@/hooks/useCalendar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Clock, MapPin, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
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
  general: { label: 'Genel', tone: 'bg-accent/10 text-foreground' },
  meeting: { label: 'Toplantı', tone: 'bg-accent/10 text-foreground' },
  holiday: { label: 'Tatil', tone: 'bg-accent/10 text-foreground' },
  maintenance: { label: 'Bakım', tone: 'bg-accent/10 text-foreground' },
  closed: { label: 'Kapalı', tone: 'bg-muted text-muted-foreground' },
};

const weekdays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export default function CalendarPage() {
  useAuth();
  const { isAdmin } = useRBAC();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    type: 'general',
    startAt: '',
    endAt: '',
    allDay: false,
  });

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
          <div key={day} className="p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
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
                'group flex min-h-[60px] sm:min-h-[80px] flex-col rounded-lg border border-border/70 p-1 sm:p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                !isCurrentMonth && 'bg-muted/40 text-muted-foreground',
                isToday && 'border-border bg-accent/10 text-foreground',
                !isWorking && 'border-border/40 bg-accent/5',
                isSelected && 'ring-2 ring-offset-2 ring-ring',
                'hover:border-border hover:bg-accent/10'
              )}
            >
              <div className="mb-1 flex items-start justify-between">
                <span className={cn('text-xs sm:text-sm font-semibold', isToday && 'text-foreground')}>
                  {format(day, 'd')}
                </span>
                {holiday && (
                  <Badge variant="outline" className="text-[8px] sm:text-[10px] uppercase tracking-wide">
                    Tatil
                  </Badge>
                )}
              </div>

              <div className="space-y-0.5 flex-1">
                {dayEvents.slice(0, 1).map((event: any) => (
                  <div
                    key={event.id}
                    className={cn(
                      'line-clamp-1 rounded px-1 py-0.5 text-[10px] sm:text-xs font-medium shadow-sm',
                      eventTypes[event.type as keyof typeof eventTypes]?.tone || 'bg-muted text-muted-foreground'
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 1 && (
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    +{dayEvents.length - 1}
                  </div>
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
    setEventForm({
      title: '',
      description: '',
      type: 'general',
      startAt: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      endAt: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      allDay: false,
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      type: event.type,
      startAt: format(new Date(event.startAt), 'yyyy-MM-dd'),
      endAt: format(new Date(event.endAt), 'yyyy-MM-dd'),
      allDay: event.allDay || false,
    });
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

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEvent) {
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          data: {
            title: eventForm.title,
            ...(eventForm.description && { description: eventForm.description }),
            type: eventForm.type,
            startDate: eventForm.startAt,
            endDate: eventForm.endAt,
            ...(eventForm.allDay !== undefined && { allDay: eventForm.allDay }),
          },
        });
      } else {
        await createEventMutation.mutateAsync({
          title: eventForm.title,
          ...(eventForm.description && { description: eventForm.description }),
          type: eventForm.type,
          startDate: eventForm.startAt,
          endDate: eventForm.endAt,
          ...(eventForm.allDay !== undefined && { allDay: eventForm.allDay }),
        });
      }
      
      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
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
        <main className="mobile-container py-6 space-y-6">
          <PageHeader
            title="Takvim Yönetimi"
            description="Mağaza operasyonlarınızı, çalışma saatlerini ve özel günleri tek ekrandan planlayın."
            icon={CalendarDays}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="gap-1">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Önceki</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Bugün
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="gap-1">
                  <span className="hidden sm:inline">Sonraki</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleCreateEvent} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Etkinlik Ekle</span>
                  <span className="sm:hidden">Ekle</span>
                </Button>
              </div>
            }
          />

          <div className="text-center text-sm font-medium text-muted-foreground">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </div>

          {/* Calendar */}
          <Card>
            <CardContent className="p-2 sm:p-4">
              {renderCalendar()}
            </CardContent>
          </Card>

          {/* Management Tools */}
          {isAdmin() && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    Çalışma Saatleri
                  </CardTitle>
                  <CardDescription>Haftalık çalışma saatlerini yönetin</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {businessHours.map((bh: any) => (
                      <div
                        key={bh.id}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 px-3 py-2"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-foreground">{weekdays[bh.weekday]}</span>
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
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                    Resmi Tatiller
                  </CardTitle>
                  <CardDescription>Resmi tatil günlerini yönetin</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {holidays.slice(0, 5).map((holiday: any) => (
                      <div
                        key={holiday.id}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-accent/5 px-3 py-2"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-foreground">{holiday.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(holiday.date), 'dd MMM', { locale: tr })}
                        </span>
                      </div>
                    ))}
                    {holidays.length > 5 && (
                      <div className="text-xs sm:text-sm text-muted-foreground text-center">
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
                <CardTitle className="text-base sm:text-lg">
                  {format(selectedDate, 'dd MMMM yyyy', { locale: tr })} Etkinlikleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map((event: any) => (
                    <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border/70 bg-background/80 p-3 gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm sm:text-base">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
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
                          className="gap-1"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Düzenle</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="gap-1"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Sil</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-muted-foreground text-center py-4 text-sm">
                      Bu tarihte etkinlik bulunmuyor
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Modal */}
          <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}</DialogTitle>
                <DialogDescription>
                  {editingEvent ? 'Etkinlik bilgilerini güncelleyin' : 'Yeni bir etkinlik oluşturun'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Başlık *</Label>
                  <Input
                    id="title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Etkinlik başlığı"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Etkinlik açıklaması"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tür</Label>
                  <Select value={eventForm.type} onValueChange={(value) => setEventForm(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Etkinlik türü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(eventTypes).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startAt">Başlangıç Tarihi *</Label>
                    <Input
                      id="startAt"
                      type="date"
                      value={eventForm.startAt}
                      onChange={(e) => setEventForm(prev => ({ ...prev, startAt: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endAt">Bitiş Tarihi *</Label>
                    <Input
                      id="endAt"
                      type="date"
                      value={eventForm.endAt}
                      onChange={(e) => setEventForm(prev => ({ ...prev, endAt: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    <span>{editingEvent ? 'Güncelle' : 'Oluştur'}</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Business Hours Modal */}
          <Dialog open={showBusinessHoursModal} onOpenChange={setShowBusinessHoursModal}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle>Çalışma Saatleri</DialogTitle>
                <DialogDescription>Haftalık çalışma saatlerini düzenleyin</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {weekdays.map((day, index) => {
                  const businessHour = businessHours.find((bh: any) => bh.weekday === index);
                  return (
                    <div key={day} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <span className="text-sm font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          defaultValue={businessHour?.startTime || '09:00'}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          defaultValue={businessHour?.endTime || '18:00'}
                          className="w-24"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={() => setShowBusinessHoursModal(false)} className="flex-1">
                  Kaydet
                </Button>
                <Button
                  onClick={() => setShowBusinessHoursModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  İptal
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Holiday Modal */}
          <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle>Yeni Tatil</DialogTitle>
                <DialogDescription>Resmi tatil günü ekleyin</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveHoliday({
                  name: formData.get('name') as string,
                  date: formData.get('date') as string,
                  description: formData.get('description') as string,
                });
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="holidayName">Tatil Adı *</Label>
                  <Input
                    id="holidayName"
                    name="name"
                    placeholder="Tatil adı"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="holidayDate">Tarih *</Label>
                  <Input
                    id="holidayDate"
                    name="date"
                    type="date"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="holidayDescription">Açıklama</Label>
                  <Textarea
                    id="holidayDescription"
                    name="description"
                    placeholder="Tatil açıklaması"
                    rows={3}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Ekle</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowHolidayModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    İptal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  );
}