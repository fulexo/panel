'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Clock } from 'lucide-react';

interface BusinessHours {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface BusinessHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hours: Array<{ day: string; startTime?: string; endTime?: string; isWorkingDay?: boolean }>) => void;
  currentHours: BusinessHours[];
}

const weekdays = [
  { value: 'sunday', label: 'Pazar', number: 0 },
  { value: 'monday', label: 'Pazartesi', number: 1 },
  { value: 'tuesday', label: 'Salı', number: 2 },
  { value: 'wednesday', label: 'Çarşamba', number: 3 },
  { value: 'thursday', label: 'Perşembe', number: 4 },
  { value: 'friday', label: 'Cuma', number: 5 },
  { value: 'saturday', label: 'Cumartesi', number: 6 },
];

export function BusinessHoursModal({ isOpen, onClose, onSave, currentHours }: BusinessHoursModalProps) {
  const [hours, setHours] = useState<Array<{ day: string; startTime: string; endTime: string; isWorkingDay: boolean }>>([]);

  useEffect(() => {
    if (isOpen) {
      const initialHours = weekdays.map(day => {
        const existing = currentHours.find(h => h.weekday === day.number);
        return {
          day: day.value,
          startTime: existing?.startTime || '09:00',
          endTime: existing?.endTime || '17:00',
          isWorkingDay: existing ? true : day.number >= 1 && day.number <= 5, // Default: Monday-Friday
        };
      });
      setHours(initialHours);
    }
  }, [isOpen, currentHours]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(hours);
  };

  const updateDay = (day: string, field: string, value: string | boolean) => {
    setHours(prev => prev.map(h => 
      h.day === day ? { ...h, [field]: value } : h
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Çalışma Saatleri
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Haftalık çalışma saatlerinizi ayarlayın
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {weekdays.map(day => {
              const dayHours = hours.find(h => h.day === day.value);
              return (
                <div key={day.value} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <Label className="font-medium">{day.label}</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={dayHours?.isWorkingDay || false}
                      onCheckedChange={(checked) => updateDay(day.value, 'isWorkingDay', checked)}
                    />
                    <Label>Çalışma günü</Label>
                  </div>

                  {dayHours?.isWorkingDay && (
                    <div className="flex items-center gap-2">
                      <div>
                        <Label htmlFor={`start-${day.value}`} className="text-sm">Başlangıç</Label>
                        <Input
                          id={`start-${day.value}`}
                          type="time"
                          value={dayHours.startTime}
                          onChange={(e) => updateDay(day.value, 'startTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <span className="text-muted-foreground">-</span>
                      <div>
                        <Label htmlFor={`end-${day.value}`} className="text-sm">Bitiş</Label>
                        <Input
                          id={`end-${day.value}`}
                          type="time"
                          value={dayHours.endTime}
                          onChange={(e) => updateDay(day.value, 'endTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" variant="default">
                Kaydet
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}