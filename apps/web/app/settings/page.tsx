 

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-400">Configure your application settings here.</p>
        </div>

        <div className="grid gap-6">
          

          <div className="rounded-lg border border-gray-800 bg-gray-800 p-6">
            <div className="mb-2">
              <h3 className="text-xl font-semibold">General Settings</h3>
              <p className="text-sm text-gray-400">Basic application configuration</p>
            </div>
            <p className="text-gray-300 text-sm">General settings will be configured here.</p>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-800 p-6">
            <div className="mb-2">
              <h3 className="text-xl font-semibold">Email Settings</h3>
              <p className="text-sm text-gray-400">SMTP configuration for email notifications</p>
            </div>
            <p className="text-gray-300 text-sm">Email settings will be configured here.</p>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-800 p-6">
            <div className="mb-2">
              <h3 className="text-xl font-semibold">Notifications</h3>
              <p className="text-sm text-gray-400">Manage notification preferences</p>
            </div>
            <p className="text-gray-300 text-sm">Notification settings will be configured here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}