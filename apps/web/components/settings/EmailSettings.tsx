'use client'

import { useState } from 'react'

export function EmailSettings() {
  const [settings, setSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: ''
  })

  const handleSave = async () => {
    console.log('Saving email settings:', settings)
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="smtpHost" className="text-sm font-medium">SMTP Host</label>
        <input
          id="smtpHost"
          value={settings.smtpHost}
          onChange={(e) => setSettings(prev => ({...prev, smtpHost: e.target.value}))}
          placeholder="smtp.gmail.com"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1"
        />
      </div>
      <div>
        <label htmlFor="smtpPort" className="text-sm font-medium">SMTP Port</label>
        <input
          id="smtpPort"
          value={settings.smtpPort}
          onChange={(e) => setSettings(prev => ({...prev, smtpPort: e.target.value}))}
          placeholder="587"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1"
        />
      </div>
      <button
        onClick={handleSave}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
      >
        Save Email Settings
      </button>
    </div>
  )
}