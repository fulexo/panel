'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Calendar } from 'lucide-react';
import { FormField } from '@/components/forms/FormField';
import { FormTextarea } from '@/components/forms/FormTextarea';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  recurring?: boolean;
}

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (holiday: { name: string; date: string; description?: string; recurring?: boolean }) => void;
  holiday?: Holiday | null;
}

export default function HolidayModal({ isOpen, onClose, onSave, holiday }: HolidayModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    recurring: false,
  });

  useEffect(() => {
    if (holiday) {
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0] || '',
        description: holiday.description || '',
        recurring: holiday.recurring || false,
      });
    } else {
      setFormData({
        name: '',
        date: '',
        description: '',
        recurring: false,
      });
    }
  }, [holiday]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date) return;

    onSave({
      name: formData.name,
      date: formData.date,
      description: formData.description,
      recurring: formData.recurring,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg border border-border shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {holiday ? 'Tatili Düzenle' : 'Yeni Tatil'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tatil bilgilerini girin
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Tatil Adı"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: Yılbaşı, Kurban Bayramı"
            />

            <FormField
              label="Tarih"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />

            <FormTextarea
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tatil hakkında açıklama"
              rows={3}
            />

            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={formData.recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, recurring: checked }))}
              />
              <Label htmlFor="recurring">Her yıl tekrarla</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" variant="default">
                {holiday ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export { HolidayModal };