'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/forms/FormField';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormSelect } from '@/components/forms/FormSelect';

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
        startDate: startDate.toISOString().split('T')[0] || '',
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0] || '',
        endTime: endDate.toTimeString().slice(0, 5),
        allDay: event.allDay || false,
      });
    } else if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData({
        title: '',
        description: '',
        type: 'general',
        startDate: dateStr || '',
        startTime: '09:00',
        endDate: dateStr || '',
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
      <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {event ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Etkinlik bilgilerini girin
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Başlık"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Etkinlik başlığı"
            />

            <FormTextarea
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Etkinlik açıklaması"
              rows={3}
            />

            <FormSelect
              label="Tür"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              placeholder="Etkinlik türü seçin"
              options={eventTypes.map((type) => ({
                value: type.value,
                label: type.label,
              }))}
            />

            <div className="flex items-center space-x-2">
              <Switch
                id="allDay"
                checked={formData.allDay}
                onCheckedChange={handleAllDayChange}
              />
              <Label htmlFor="allDay">Tüm gün</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Başlangıç Tarihi"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
              {!formData.allDay && (
                <FormField
                  label="Başlangıç Saati"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Bitiş Tarihi"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              />
              {!formData.allDay && (
                <FormField
                  label="Bitiş Saati"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" variant="default">
                {event ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export { EventModal };