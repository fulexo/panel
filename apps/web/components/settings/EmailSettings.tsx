'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EmailSettingsData {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: string;
}

export function EmailSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<EmailSettingsData>({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_secure: 'true',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/email', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: 'Başarılı',
          description: 'E-posta ayarları kaydedildi.',
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Ayarlar kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ service: 'email' }),
      });

      const result = await response.json();
      
      toast({
        title: result.connected ? 'Başarılı' : 'Başarısız',
        description: result.message,
        variant: result.connected ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Test sırasında bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          E-posta Ayarları
        </CardTitle>
        <CardDescription>
          Sistem e-postalarının gönderimi için SMTP ayarlarını yapılandırın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Gmail kullanıyorsanız, uygulama şifresi oluşturmanız gerekebilir.
            Outlook/Hotmail için SMTP erişimini etkinleştirdiğinizden emin olun.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Sunucu</Label>
              <Input
                id="smtp_host"
                placeholder="smtp.gmail.com"
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="smtp_port">Port</Label>
              <Select
                value={settings.smtp_port}
                onValueChange={(value) => setSettings({ ...settings, smtp_port: value })}
              >
                <SelectTrigger id="smtp_port">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 (SMTP)</SelectItem>
                  <SelectItem value="587">587 (TLS)</SelectItem>
                  <SelectItem value="465">465 (SSL)</SelectItem>
                  <SelectItem value="2525">2525 (Alternatif)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_user">Kullanıcı Adı (E-posta)</Label>
            <Input
              id="smtp_user"
              type="email"
              placeholder="your-email@gmail.com"
              value={settings.smtp_user}
              onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_pass">Şifre / Uygulama Şifresi</Label>
            <Input
              id="smtp_pass"
              type="password"
              placeholder="••••••••••••"
              value={settings.smtp_pass}
              onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_from">Gönderen E-posta</Label>
            <Input
              id="smtp_from"
              type="email"
              placeholder="noreply@yourdomain.com"
              value={settings.smtp_from}
              onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_secure">Güvenlik</Label>
            <Select
              value={settings.smtp_secure}
              onValueChange={(value) => setSettings({ ...settings, smtp_secure: value })}
            >
              <SelectTrigger id="smtp_secure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">TLS/STARTTLS</SelectItem>
                <SelectItem value="false">Güvenlik Yok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !settings.smtp_host || !settings.smtp_user}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test Ediliyor...
              </>
            ) : (
              'Bağlantıyı Test Et'
            )}
          </Button>
          
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}