"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Mail, 
  Bell, 
  Shield, 
  Building2,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Info
} from "lucide-react";
import { useSettings, useUpdateSettings, useTestEmailConnection } from "@/hooks/useSettings";
import type { EmailSettings, NotificationSettings, GeneralSettings } from "@/hooks/useSettings";

export default function SettingsPage() {
  useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [hasChanges, setHasChanges] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email settings
  const { data: emailData, isLoading: emailLoading } = useSettings('email');
  const updateEmail = useUpdateSettings('email');
  const testEmail = useTestEmailConnection();
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    smtp_from: '',
  });

  // Notification settings
  const { data: notificationData, isLoading: notificationLoading } = useSettings('notification');
  const updateNotification = useUpdateSettings('notification');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: 'true',
    push_notifications: 'true',
    sms_notifications: 'false',
    low_stock_threshold: '10',
    order_notifications: 'true',
  });

  // General settings
  const { data: generalData, isLoading: generalLoading } = useSettings('general');
  const updateGeneral = useUpdateSettings('general');
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    company_name: 'Fulexo',
    support_email: '',
    contact_phone: '',
    address: '',
    timezone: 'Europe/Istanbul',
    currency: 'TRY',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
  });

  // Load settings from API
  useEffect(() => {
    if (emailData) {
      setEmailSettings((prev) => ({ ...prev, ...(emailData as any) }));
    }
  }, [emailData]);

  useEffect(() => {
    if (notificationData) {
      setNotificationSettings((prev) => ({ ...prev, ...(notificationData as any) }));
    }
  }, [notificationData]);

  useEffect(() => {
    if (generalData) {
      setGeneralSettings((prev) => ({ ...prev, ...(generalData as any) }));
    }
  }, [generalData]);

  const handleEmailChange = (key: keyof EmailSettings, value: string) => {
    setEmailSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: string) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleGeneralChange = (key: keyof GeneralSettings, value: string) => {
    setGeneralSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveEmail = async () => {
    try {
      await updateEmail.mutateAsync(emailSettings);
      setHasChanges(false);
      setTestResult({ success: true, message: 'Email settings saved successfully!' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to save email settings' });
    }
  };

  const handleTestEmail = async () => {
    setTestResult(null);
    try {
      const result = await testEmail.mutateAsync();
      const data = result as any;
      setTestResult({ 
        success: data.connected, 
        message: data.message || (data.connected ? 'Connection successful!' : 'Connection failed') 
      });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Connection test failed' });
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotification.mutateAsync(notificationSettings);
      setHasChanges(false);
      setTestResult({ success: true, message: 'Notification settings saved successfully!' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to save notification settings' });
    }
  };

  const handleSaveGeneral = async () => {
    try {
      await updateGeneral.mutateAsync(generalSettings);
      setHasChanges(false);
      setTestResult({ success: true, message: 'General settings saved successfully!' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Failed to save general settings' });
    }
  };

  const isLoading = emailLoading || notificationLoading || generalLoading;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <PageHeader
            title="Settings"
            description="Configure your platform settings, email notifications, and integrations"
            icon={SettingsIcon}
          />

          {/* Status Messages */}
          {testResult && (
            <Card className={testResult.success ? "bg-accent/10 border-border" : "bg-accent/10 border-border"}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-foreground" />
                  ) : (
                    <XCircle className="h-5 w-5 text-foreground" />
                  )}
                  <span className="text-foreground">{testResult.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTestResult(null)}
                    className="ml-auto"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                  <span className="ml-3 text-foreground">Loading settings...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
                    <TabsTrigger value="general" className="gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">General</span>
                    </TabsTrigger>
                    <TabsTrigger value="email" className="gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="hidden sm:inline">Email</span>
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                      <Bell className="h-4 w-4" />
                      <span className="hidden sm:inline">Notifications</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* General Settings */}
                  <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company_name">Company Name</Label>
                          <Input
                            id="company_name"
                            value={generalSettings.company_name}
                            onChange={(e) => handleGeneralChange('company_name', e.target.value)}
                            placeholder="Your Company Name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="support_email">Support Email</Label>
                          <Input
                            id="support_email"
                            type="email"
                            value={generalSettings.support_email}
                            onChange={(e) => handleGeneralChange('support_email', e.target.value)}
                            placeholder="support@fulexo.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contact_phone">Contact Phone</Label>
                          <Input
                            id="contact_phone"
                            type="tel"
                            value={generalSettings.contact_phone}
                            onChange={(e) => handleGeneralChange('contact_phone', e.target.value)}
                            placeholder="+90 XXX XXX XX XX"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select 
                            value={generalSettings.timezone} 
                            onValueChange={(value) => handleGeneralChange('timezone', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Europe/Istanbul">Europe/Istanbul (GMT+3)</SelectItem>
                              <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                              <SelectItem value="America/New_York">America/New York (GMT-5)</SelectItem>
                              <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select 
                            value={generalSettings.currency} 
                            onValueChange={(value) => handleGeneralChange('currency', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TRY">TRY (₺)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="date_format">Date Format</Label>
                          <Select 
                            value={generalSettings.date_format} 
                            onValueChange={(value) => handleGeneralChange('date_format', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Business Address</Label>
                        <Input
                          id="address"
                          value={generalSettings.address}
                          onChange={(e) => handleGeneralChange('address', e.target.value)}
                          placeholder="Enter your business address"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGeneralSettings({
                            company_name: 'Fulexo',
                            support_email: '',
                            contact_phone: '',
                            address: '',
                            timezone: 'Europe/Istanbul',
                            currency: 'TRY',
                            date_format: 'DD/MM/YYYY',
                            time_format: '24h',
                          });
                          setHasChanges(false);
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={handleSaveGeneral}
                        disabled={updateGeneral.isPending || !hasChanges}
                        className="gap-2"
                      >
                        {updateGeneral.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Email Settings */}
                  <TabsContent value="email" className="space-y-6 mt-6">
                    <ProtectedComponent permission="settings.manage">
                      <div className="rounded-lg border border-border bg-accent/5 p-4 mb-6">
                        <div className="flex gap-3">
                          <Info className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Email Configuration</p>
                            <p className="text-sm text-muted-foreground">
                              Configure SMTP settings to enable email notifications, welcome emails, password resets, and order notifications.
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 For Gmail: Use App Password (not regular password) - 
                              <a href="https://support.google.com/accounts/answer/185833" target="_blank" className="underline ml-1">
                                Learn more
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="smtp_host">SMTP Host *</Label>
                            <Input
                              id="smtp_host"
                              value={emailSettings.smtp_host}
                              onChange={(e) => handleEmailChange('smtp_host', e.target.value)}
                              placeholder="smtp.gmail.com"
                            />
                            <p className="text-xs text-muted-foreground">
                              Common: smtp.gmail.com, smtp.office365.com
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtp_port">SMTP Port *</Label>
                            <Select 
                              value={emailSettings.smtp_port} 
                              onValueChange={(value) => handleEmailChange('smtp_port', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="587">587 (TLS)</SelectItem>
                                <SelectItem value="465">465 (SSL)</SelectItem>
                                <SelectItem value="25">25 (Plain)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtp_user">SMTP Username *</Label>
                            <Input
                              id="smtp_user"
                              type="email"
                              value={emailSettings.smtp_user}
                              onChange={(e) => handleEmailChange('smtp_user', e.target.value)}
                              placeholder="yourapp@gmail.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtp_pass">SMTP Password *</Label>
                            <Input
                              id="smtp_pass"
                              type="password"
                              value={emailSettings.smtp_pass}
                              onChange={(e) => handleEmailChange('smtp_pass', e.target.value)}
                              placeholder="••••••••••••••••"
                            />
                            <p className="text-xs text-muted-foreground">
                              Gmail: Use App Password, not account password
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="smtp_from">From Email *</Label>
                            <Input
                              id="smtp_from"
                              type="email"
                              value={emailSettings.smtp_from}
                              onChange={(e) => handleEmailChange('smtp_from', e.target.value)}
                              placeholder="noreply@fulexo.com"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Security</Label>
                            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                              <div>
                                <p className="text-sm font-medium text-foreground">Use TLS/SSL</p>
                                <p className="text-xs text-muted-foreground">Enable for ports 465, 587</p>
                              </div>
                              <Switch
                                checked={emailSettings.smtp_secure === 'true'}
                                onCheckedChange={(checked) =>
                                  handleEmailChange('smtp_secure', checked ? 'true' : 'false')
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={handleTestEmail}
                          disabled={testEmail.isPending || !emailSettings.smtp_host || !emailSettings.smtp_user}
                          className="gap-2"
                        >
                          {testEmail.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <TestTube className="h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleSaveEmail}
                          disabled={updateEmail.isPending || !hasChanges}
                          className="gap-2"
                        >
                          {updateEmail.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Email Settings
                            </>
                          )}
                        </Button>
                      </div>
                    </ProtectedComponent>
                  </TabsContent>

                  {/* Notification Settings */}
                  <TabsContent value="notifications" className="space-y-6 mt-6">
                    <div className="rounded-lg border border-border bg-accent/5 p-4 mb-6">
                      <div className="flex gap-3">
                        <Bell className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Notification Channels</p>
                          <p className="text-sm text-muted-foreground">
                            Configure which events trigger notifications and through which channels.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label>Notification Channels</Label>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">Email Notifications</p>
                              <p className="text-xs text-muted-foreground">Send notifications via email</p>
                            </div>
                            <Switch
                              checked={notificationSettings.email_notifications === 'true'}
                              onCheckedChange={(checked) =>
                                handleNotificationChange('email_notifications', checked ? 'true' : 'false')
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">Push Notifications</p>
                              <p className="text-xs text-muted-foreground">Browser push notifications</p>
                            </div>
                            <Switch
                              checked={notificationSettings.push_notifications === 'true'}
                              onCheckedChange={(checked) =>
                                handleNotificationChange('push_notifications', checked ? 'true' : 'false')
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">SMS Notifications</p>
                              <p className="text-xs text-muted-foreground">Send notifications via SMS</p>
                            </div>
                            <Switch
                              checked={notificationSettings.sms_notifications === 'true'}
                              onCheckedChange={(checked) =>
                                handleNotificationChange('sms_notifications', checked ? 'true' : 'false')
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Notification Rules</Label>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">Order Notifications</p>
                              <p className="text-xs text-muted-foreground">Notify on new orders</p>
                            </div>
                            <Switch
                              checked={notificationSettings.order_notifications === 'true'}
                              onCheckedChange={(checked) =>
                                handleNotificationChange('order_notifications', checked ? 'true' : 'false')
                              }
                            />
                          </div>

                          <div className="rounded-lg border border-border bg-background p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">Low Stock Threshold</p>
                                <p className="text-xs text-muted-foreground">Alert when stock falls below this number</p>
                              </div>
                              <Badge variant="outline">{notificationSettings.low_stock_threshold} units</Badge>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={notificationSettings.low_stock_threshold}
                              onChange={(e) => handleNotificationChange('low_stock_threshold', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNotificationSettings({
                            email_notifications: 'true',
                            push_notifications: 'true',
                            sms_notifications: 'false',
                            low_stock_threshold: '10',
                            order_notifications: 'true',
                          });
                          setHasChanges(false);
                        }}
                      >
                        Reset to Defaults
                      </Button>
                      <Button
                        onClick={handleSaveNotifications}
                        disabled={updateNotification.isPending || !hasChanges}
                        className="gap-2"
                      >
                        {updateNotification.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Notification Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card className="bg-accent/5 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-foreground" />
                Configuration Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Email Configuration (Gmail):</p>
                <div className="text-xs text-muted-foreground space-y-1 pl-4">
                  <p>1. Enable 2-Factor Authentication on your Google account</p>
                  <p>2. Go to: Google Account → Security → 2-Step Verification → App Passwords</p>
                  <p>3. Generate an "App Password" for "Mail"</p>
                  <p>4. Use that password in SMTP Password field above</p>
                  <p>5. SMTP Host: smtp.gmail.com, Port: 587</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Other Email Providers:</p>
                <div className="text-xs text-muted-foreground space-y-1 pl-4">
                  <p>• Office 365: smtp.office365.com:587</p>
                  <p>• Outlook: smtp-mail.outlook.com:587</p>
                  <p>• Yahoo: smtp.mail.yahoo.com:587</p>
                  <p>• SendGrid: smtp.sendgrid.net:587</p>
                  <p>• Mailgun: smtp.mailgun.org:587</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
