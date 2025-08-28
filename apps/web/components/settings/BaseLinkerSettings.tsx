'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link, CheckCircle, XCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BaseLinkerSettingsData {
  api_key: string;
  api_url: string;
  sync_interval: string;
  auto_sync: string;
}

export function BaseLinkerSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<BaseLinkerSettingsData>({
    api_key: '',
    api_url: 'https://api.baselinker.com/connector.php',
    sync_interval: '30',
    auto_sync: 'true',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/baselinker', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch BaseLinker settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/baselinker', {
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
          description: 'BaseLinker ayarları kaydedildi.',
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
        body: JSON.stringify({ service: 'baselinker' }),
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
          <Link className="h-5 w-5" />
          BaseLinker Entegrasyonu
        </CardTitle>
        <CardDescription>
          BaseLinker API bağlantısını ve senkronizasyon ayarlarını yapılandırın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>API Anahtarı Nasıl Alınır?</AlertTitle>
          <AlertDescription>
            1. BaseLinker hesabınıza giriş yapın<br />
            2. Ayarlar → API bölümüne gidin<br />
            3. Yeni API anahtarı oluşturun ve buraya yapıştırın
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="api_key">API Anahtarı</Label>
            <Input
              id="api_key"
              type="password"
              placeholder="BaseLinker API anahtarınızı girin"
              value={settings.api_key}
              onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_url">API URL</Label>
            <Input
              id="api_url"
              placeholder="https://api.baselinker.com/connector.php"
              value={settings.api_url}
              onChange={(e) => setSettings({ ...settings, api_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync_interval">Senkronizasyon Aralığı</Label>
            <Select
              value={settings.sync_interval}
              onValueChange={(value) => setSettings({ ...settings, sync_interval: value })}
            >
              <SelectTrigger id="sync_interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 dakika</SelectItem>
                <SelectItem value="10">10 dakika</SelectItem>
                <SelectItem value="15">15 dakika</SelectItem>
                <SelectItem value="30">30 dakika</SelectItem>
                <SelectItem value="60">1 saat</SelectItem>
                <SelectItem value="120">2 saat</SelectItem>
                <SelectItem value="240">4 saat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="auto_sync">Otomatik Senkronizasyon</Label>
              <div className="text-sm text-muted-foreground">
                Verileri belirtilen aralıklarla otomatik senkronize et
              </div>
            </div>
            <Switch
              id="auto_sync"
              checked={settings.auto_sync === 'true'}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, auto_sync: checked ? 'true' : 'false' })
              }
            />
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Senkronize Edilecek Veriler:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ürünler ve stok bilgileri</li>
            <li>• Siparişler ve durumları</li>
            <li>• Müşteri bilgileri</li>
            <li>• Fiyatlandırma ve kampanyalar</li>
          </ul>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !settings.api_key}
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