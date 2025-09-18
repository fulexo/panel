"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "order",
      title: "Yeni Sipariş",
      message: "Sipariş #12345 alındı - 1,250.00 TL",
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

  const tabs = [
    { id: "all", label: "Tümü", count: notifications.length },
    { id: "unread", label: "Okunmamış", count: notifications.filter(n => !n.read).length },
    { id: "orders", label: "Siparişler", count: notifications.filter(n => n.type === "order").length },
    { id: "inventory", label: "Stok", count: notifications.filter(n => n.type === "inventory").length },
    { id: "customers", label: "Müşteriler", count: notifications.filter(n => n.type === "customer").length },
    { id: "system", label: "Sistem", count: notifications.filter(n => n.type === "system").length },
  ];

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    return notification.type === activeTab;
  });

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-600 bg-red-100";
      case "high": return "text-orange-600 bg-orange-100";
      case "medium": return "text-blue-600 bg-blue-100";
      case "low": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order": return "📦";
      case "inventory": return "📋";
      case "customer": return "👤";
      case "system": return "⚙️";
      case "return": return "↩️";
      default: return "🔔";
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Notifications</h1>
              <p className="text-muted-foreground mobile-text">
                Manage your notifications and alerts
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="btn btn-outline btn-sm"
              >
                Mark All Read
              </button>
              <button className="btn btn-outline btn-sm">
                Settings
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Notifications List */}
            <div className="lg:col-span-3">
              <div className="bg-card rounded-lg border border-border">
                {/* Tabs */}
                <div className="border-b border-border p-4">
                  <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        {tab.label}
                        {tab.count > 0 && (
                          <span className="ml-2 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notifications */}
                <div className="divide-y divide-border">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <div className="text-4xl mb-4">🔔</div>
                      <p>No notifications found</p>
                    </div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-accent transition-colors ${
                          !notification.read ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-2xl">
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground">
                                {notification.title}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {notification.time}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="btn btn-sm btn-outline"
                              >
                                Mark Read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="btn btn-sm btn-ghost text-muted-foreground hover:text-destructive"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Settings Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h3>
                
                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">📧 Email Notifications</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.email.newOrders}
                          onChange={(e) => setSettings({
                            ...settings,
                            email: { ...settings.email, newOrders: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">New Orders</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.email.lowStock}
                          onChange={(e) => setSettings({
                            ...settings,
                            email: { ...settings.email, lowStock: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Low Stock Alerts</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.email.customerMessages}
                          onChange={(e) => setSettings({
                            ...settings,
                            email: { ...settings.email, customerMessages: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Customer Messages</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.email.systemUpdates}
                          onChange={(e) => setSettings({
                            ...settings,
                            email: { ...settings.email, systemUpdates: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">System Updates</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.email.returns}
                          onChange={(e) => setSettings({
                            ...settings,
                            email: { ...settings.email, returns: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Returns</span>
                      </label>
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">🔔 Push Notifications</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.push.newOrders}
                          onChange={(e) => setSettings({
                            ...settings,
                            push: { ...settings.push, newOrders: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">New Orders</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.push.lowStock}
                          onChange={(e) => setSettings({
                            ...settings,
                            push: { ...settings.push, lowStock: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Low Stock Alerts</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.push.customerMessages}
                          onChange={(e) => setSettings({
                            ...settings,
                            push: { ...settings.push, customerMessages: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Customer Messages</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.push.systemUpdates}
                          onChange={(e) => setSettings({
                            ...settings,
                            push: { ...settings.push, systemUpdates: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">System Updates</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.push.returns}
                          onChange={(e) => setSettings({
                            ...settings,
                            push: { ...settings.push, returns: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Returns</span>
                      </label>
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div>
                    <h4 className="font-medium text-foreground mb-3">📱 SMS Notifications</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.sms.newOrders}
                          onChange={(e) => setSettings({
                            ...settings,
                            sms: { ...settings.sms, newOrders: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">New Orders</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.sms.lowStock}
                          onChange={(e) => setSettings({
                            ...settings,
                            sms: { ...settings.sms, lowStock: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Low Stock Alerts</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.sms.customerMessages}
                          onChange={(e) => setSettings({
                            ...settings,
                            sms: { ...settings.sms, customerMessages: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Customer Messages</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.sms.systemUpdates}
                          onChange={(e) => setSettings({
                            ...settings,
                            sms: { ...settings.sms, systemUpdates: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">System Updates</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={settings.sms.returns}
                          onChange={(e) => setSettings({
                            ...settings,
                            sms: { ...settings.sms, returns: e.target.checked }
                          })}
                          className="form-checkbox"
                        />
                        <span className="text-sm">Returns</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <button className="btn btn-primary w-full">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}