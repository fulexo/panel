'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { BaseLinkerSettings } from '@/components/settings/BaseLinkerSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { Shield } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Ayarlar
        </h1>
        <p className="text-gray-600 mt-2">
          Sistem ayarlarınızı bu sayfadan yönetebilirsiniz.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="email">E-posta</TabsTrigger>
          <TabsTrigger value="baselinker">BaseLinker</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailSettings />
        </TabsContent>

        <TabsContent value="baselinker" className="space-y-4">
          <BaseLinkerSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}