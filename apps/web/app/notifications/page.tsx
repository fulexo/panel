"use client";

import { ComponentProps, useMemo, useState } from "react";
import {
  Bell,
  Package,
  ClipboardList,
  User,
  Settings,
  RotateCcw,
  CheckCircle2,
  Filter,
  Trash2,
  Inbox,
  ShieldAlert,
} from "lucide-react";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { StatusPill } from "@/components/patterns/StatusPill";

type NotificationType = "order" | "inventory" | "customer" | "system" | "return";
type NotificationPriority = "urgent" | "high" | "medium" | "low";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: NotificationPriority;
}

const typeMeta: Record<NotificationType, { label: string; icon: typeof Bell }> = {
  order: { label: "Sipariş", icon: Package },
  inventory: { label: "Stok", icon: ClipboardList },
  customer: { label: "Müşteri", icon: User },
  system: { label: "Sistem", icon: Settings },
  return: { label: "İade", icon: RotateCcw },
};

const priorityMeta: Record<NotificationPriority, { label: string; badge: ComponentProps<typeof Badge>["variant"]; tone: string }> = {
  urgent: { label: "Acil", badge: "default", tone: "border-border/50 bg-accent/10 text-foreground" },
  high: { label: "Yüksek", badge: "default", tone: "border-border/40 bg-accent/10 text-foreground" },
  medium: { label: "Orta", badge: "info", tone: "border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
  low: { label: "Düşük", badge: "muted", tone: "border-border/70 bg-muted/60 text-muted-foreground" },
};

export default function NotificationsPage() {
  useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: "order",
      title: "Yeni Sipariş",
      message: "Sipariş #12345 alındı - 1.250,00 TL",
      time: "2 dakika önce",
      read: false,
      priority: "high",
    },
    {
      id: 2,
      type: "inventory",
      title: "Düşük Stok Uyarısı",
      message: "iPhone 15 Pro stok seviyesi kritik (5 adet kaldı)",
      time: "1 saat önce",
      read: false,
      priority: "urgent",
    },
    {
      id: 3,
      type: "customer",
      title: "Müşteri Mesajı",
      message: "Ahmet Yılmaz yeni bir destek talebi oluşturdu",
      time: "3 saat önce",
      read: true,
      priority: "medium",
    },
    {
      id: 4,
      type: "system",
      title: "Sistem Güncellemesi",
      message: "Sistem başarıyla güncellendi v2.1.0",
      time: "1 gün önce",
      read: true,
      priority: "low",
    },
    {
      id: 5,
      type: "return",
      title: "İade Talebi",
      message: "Sipariş #12340 için iade talebi oluşturuldu",
      time: "2 gün önce",
      read: true,
      priority: "medium",
    },
  ]);

  const [settings, setSettings] = useState({
    email: {
      newOrders: true,
      lowStock: true,
      customerMessages: true,
      systemUpdates: false,
      returns: true,
    },
    push: {
      newOrders: true,
      lowStock: true,
      customerMessages: false,
      systemUpdates: false,
      returns: true,
    },
    sms: {
      newOrders: false,
      lowStock: true,
      customerMessages: false,
      systemUpdates: false,
      returns: false,
    },
  });

  const tabs = useMemo(() => {
    return [
      { id: "all", label: "Tümü", count: notifications.length, icon: Bell },
      { id: "unread", label: "Okunmamış", count: notifications.filter((n) => !n.read).length, icon: Inbox },
      { id: "order", label: "Siparişler", count: notifications.filter((n) => n.type === "order").length, icon: Package },
      { id: "inventory", label: "Stok", count: notifications.filter((n) => n.type === "inventory").length, icon: ClipboardList },
      { id: "customer", label: "Müşteri", count: notifications.filter((n) => n.type === "customer").length, icon: User },
      { id: "system", label: "Sistem", count: notifications.filter((n) => n.type === "system").length, icon: Settings },
      { id: "return", label: "İadeler", count: notifications.filter((n) => n.type === "return").length, icon: RotateCcw },
    ];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "unread") return notifications.filter((notification) => !notification.read);
    return notifications.filter((notification) => notification.type === activeTab);
  }, [notifications, activeTab]);

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container space-y-8 py-8">
          <PageHeader
            title="Bildirimler"
            description="Siparişler, stok durumları ve sistem uyarıları için gerçek zamanlı bildirimleri yönetin."
            icon={Bell}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={markAllAsRead}>
                  <CheckCircle2 className="h-4 w-4" /> Tümünü okundu işaretle
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" /> Filtrele
                </Button>
              </div>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Gelen Kutusu</CardTitle>
                <CardDescription>Öncelik sırasına göre bildirimlerinizi takip edin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="flex items-center gap-2 rounded-full border border-transparent bg-muted/60 px-4 py-2 text-sm font-medium data-[state=active]:border-border data-[state=active]:bg-accent/10 data-[state=active]:text-foreground"
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        <Badge variant="muted">{tab.count}</Badge>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={activeTab} className="mt-4 space-y-3">
                    {filteredNotifications.length === 0 ? (
                      <EmptyState
                        icon={ShieldAlert}
                        title="Görüntülenecek bildirim yok"
                        description="Seçtiğiniz filtre için herhangi bir bildirim bulunamadı."
                      />
                    ) : (
                      filteredNotifications.map((notification) => {
                        const meta = typeMeta[notification.type];
                        const priority = priorityMeta[notification.priority];

                        return (
                          <div
                            key={notification.id}
                            className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 shadow-sm transition hover:shadow-md lg:flex-row lg:items-center lg:justify-between ${priority.tone}`}
                          >
                            <div className="flex flex-1 items-start gap-3">
                              <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background/80">
                                <meta.icon className="h-5 w-5" />
                              </span>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-semibold text-foreground">{notification.title}</h3>
                                  <StatusPill 
                                    label={priority.label} 
                                    tone={priority.badge === 'info' ? 'info' : priority.badge === 'muted' ? 'muted' : 'default'} 
                                  />
                                  {!notification.read && <StatusPill label="Yeni" tone="info" />}
                                </div>
                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                                <span className="text-xs text-muted-foreground/80">{notification.time}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!notification.read && (
                                <Button variant="muted" size="sm" onClick={() => markAsRead(notification.id)}>
                                  Okundu işaretle
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notification.id)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Bildirim Tercihleri</CardTitle>
                <CardDescription>Email, push ve SMS kanallarını dilediğiniz gibi yapılandırın.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {([
                  { key: "email", label: "E-posta Bildirimleri" },
                  { key: "push", label: "Push Bildirimleri" },
                  { key: "sms", label: "SMS Bildirimleri" },
                ] as const).map((channel) => (
                  <div key={channel.key} className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{channel.label}</h3>
                      <Badge variant="muted" className="uppercase tracking-wide">
                        {channel.key}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(settings[channel.key]).map(([settingKey, value]) => (
                        <div key={settingKey} className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2">
                          <span className="text-sm font-medium text-foreground">
                            {settingKey === "newOrders" && "Yeni siparişler"}
                            {settingKey === "lowStock" && "Düşük stok uyarıları"}
                            {settingKey === "customerMessages" && "Müşteri mesajları"}
                            {settingKey === "systemUpdates" && "Sistem güncellemeleri"}
                            {settingKey === "returns" && "İade süreçleri"}
                          </span>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                [channel.key]: {
                                  ...prev[channel.key],
                                  [settingKey]: checked,
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
