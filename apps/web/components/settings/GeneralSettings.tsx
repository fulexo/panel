'use client'

import { useState } from 'react'

export function GeneralSettings() {
  const [settings, setSettings] = useState({
    companyName: '',
    website: '',
    phone: ''
  })

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
        <input
          id="companyName"
          value={settings.companyName}
          onChange={(e) => setSettings(prev => ({...prev, companyName: e.target.value}))}
          placeholder="Your Company Name"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1"
        />
      </div>
      <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-foreground text-background hover:bg-muted-foreground h-10 px-4 py-2">
        Save General Settings
      </button>
    </div>
  )
}