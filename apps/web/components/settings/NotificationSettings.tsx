'use client'

import { useState } from 'react'

export function NotificationSettings() {
  const [notifications] = useState({
    emailNotifications: true,
    orderAlerts: true,
    stockAlerts: false,
    systemAlerts: true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label htmlFor="emailNotifications" className="text-sm font-medium">Email Notifications</label>
        <input type="checkbox" checked={notifications.emailNotifications} />
      </div>
      <div className="flex items-center justify-between">
        <label htmlFor="orderAlerts" className="text-sm font-medium">Order Alerts</label>
        <input type="checkbox" checked={notifications.orderAlerts} />
      </div>
      <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
        Save Notification Settings
      </button>
    </div>
  )
}