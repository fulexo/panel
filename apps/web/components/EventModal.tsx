'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Calendar, Clock } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  event?: CalendarEvent | null;
  selectedDate?: Date | null;
}

const eventTypes = [
  { value: 'general', label: 'Genel' },
  { value: 'meeting', label: 'Toplantı' },
  { value: 'holiday', label: 'Tatil' },
  { value: 'maintenance', label: 'Bakım' },
  { value: 'closed', label: 'Kapalı' },
];

export default function EventModal({ isOpen, onClose, onSave, event, selectedDate }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    allDay: false,
  });

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.startAt);
      const endDate = new Date(event.endAt);
      
      setFormData({
        title: event.title,
        description: event.description || '',
        type: event.type,
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        allDay: event.allDay || false,
      });
    } else if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData({
        title: '',
        description: '',
        type: 'general',
        startDate: dateStr,
        startTime: '09:00',
        endDate: dateStr,
        endTime: '17:00',
        allDay: false,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'general',
        startDate: '',
        startTime: '09:00',
        endDate: '',
        endTime: '17:00',
        allDay: false,
      });
    }
  }, [event, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate) return;

    const startAt = formData.allDay 
      ? new Date(formData.startDate + 'T00:00:00')
      : new Date(formData.startDate + 'T' + formData.startTime + ':00');
    
    const endAt = formData.allDay 
      ? new Date(formData.endDate + 'T23:59:59')
      : new Date(formData.endDate + 'T' + formData.endTime + ':00');

    onSave({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: formData.allDay,
    });
  };

  const handleAllDayChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allDay: checked,
      startTime: checked ? '00:00' : '09:00',
      endTime: checked ? '23:59' : '17:00',
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {event ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="title">Başlık *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Etkinlik başlığı"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Etkinlik açıklaması"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Tür</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="allDay"
              checked={formData.allDay}
              onCheckedChange={handleAllDayChange}
            />
            <Label htmlFor="allDay">Tüm gün</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Başlangıç Tarihi *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            {!formData.allDay && (
              <div>
                <Label htmlFor="startTime">Başlangıç Saati</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endDate">Bitiş Tarihi *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
            {!formData.allDay && (
              <div>
                <Label htmlFor="endTime">Bitiş Saati</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit">
              {event ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}