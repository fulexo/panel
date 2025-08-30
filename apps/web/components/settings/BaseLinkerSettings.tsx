'use client'

import { useState } from 'react'

export function BaseLinkerSettings() {
  const [token, setToken] = useState('')

  const handleSave = async () => {
    console.log('Saving BaseLinker token:', token)
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="baselinkerToken" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          BaseLinker API Token
        </label>
        <input
          id="baselinkerToken"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your BaseLinker API token"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 mt-2"
        />
        <p className="text-sm text-gray-600 mt-1">
          You can find your API token in BaseLinker settings under API section.
        </p>
      </div>
      <button
        onClick={handleSave}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors"
      >
        Save BaseLinker Settings
      </button>
    </div>
  )
}