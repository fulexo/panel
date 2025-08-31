'use client'

import { useEffect, useState } from 'react'

type BLSettings = {
  api_key?: string
  api_url?: string
  sync_interval?: string
  auto_sync?: string
}

export function BaseLinkerSettings() {
  const [settings, setSettings] = useState<BLSettings>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'
  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : '')
  const api = (path: string, init?: RequestInit) =>
    fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init,
    })

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const r = await api('/settings/baselinker')
      if (!r.ok) throw new Error('Failed to load settings')
      const data = await r.json()
      setSettings({
        api_key: data.api_key || '',
        api_url: data.api_url || '',
        sync_interval: data.sync_interval || '',
        auto_sync: data.auto_sync || '',
      })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const r = await api('/settings/baselinker', { method: 'PUT', body: JSON.stringify({
        api_key: settings.api_key || null,
        api_url: settings.api_url || null,
        sync_interval: settings.sync_interval || null,
        auto_sync: settings.auto_sync || null,
      }) })
      if (!r.ok) throw new Error('Failed to save settings')
      setMessage({ type: 'success', text: 'BaseLinker settings saved' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save settings' })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const r = await api('/settings/test-connection', { method: 'POST', body: JSON.stringify({ service: 'baselinker' }) })
      if (!r.ok) throw new Error('Connection test failed')
      const data = await r.json()
      setMessage({ type: data.connected ? 'success' : 'error', text: data.connected ? 'Connection successful' : 'Connection failed' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Connection test failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`${message.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-200' : 'bg-red-500/20 border-red-500 text-red-200'} border px-4 py-2 rounded`}>${message.text}</div>
      )}

      <div>
        <label htmlFor="bl_api_key" className="text-sm font-medium">BaseLinker API Token</label>
        <input
          id="bl_api_key"
          type="password"
          value={settings.api_key || ''}
          onChange={(e) => setSettings((s) => ({ ...s, api_key: e.target.value }))}
          placeholder="Enter your BaseLinker API token"
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mt-1 text-black"
        />
        <p className="text-sm text-gray-600 mt-1">
          You can find your API token in BaseLinker settings under API section.
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={loading} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
        <button onClick={testConnection} disabled={loading} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-gray-700 text-white hover:bg-gray-600 h-10 px-4 py-2 disabled:opacity-50">
          {loading ? 'Testing…' : 'Test Connection'}
        </button>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-500 h-10 px-3 py-2 disabled:opacity-50">
          Reload
        </button>
      </div>
    </div>
  )
}