/**
 * Backup Schedule Settings Component
 *
 * Configure automatic backup scheduling and retention policies
 */
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Clock, Save, AlertCircle, CheckCircle2, Lock, Archive, Shield } from 'lucide-react'
import type { BackupScheduleConfig } from '@/types/backup'

interface BackupScheduleSettingsProps {
  initialConfig?: BackupScheduleConfig
  onSave: (config: BackupScheduleConfig) => Promise<void>
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function BackupScheduleSettings({ initialConfig, onSave }: BackupScheduleSettingsProps) {
  const [config, setConfig] = useState<BackupScheduleConfig>(
    initialConfig || {
      enabled: false,
      frequency: 'daily',
      hour: 2,
      day: 0,
      encrypt: true,
      compress: true,
      verify: true,
      retention_count: 30,
    }
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      await onSave(config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-celestial-cyan" />
          Backup Schedule
        </CardTitle>
        <CardDescription>
          Configure automatic backup scheduling and retention policies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 rounded-lg glass border border-cosmic-700">
          <div>
            <p className="font-medium">Automatic Backups</p>
            <p className="text-sm text-gray-400">
              {config.enabled ? 'Backups will run automatically' : 'Manual backups only'}
            </p>
          </div>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-celestial-cyan' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {config.enabled && (
          <>
            {/* Frequency */}
            <div className="space-y-2">
              <Label>Backup Frequency</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['hourly', 'daily', 'weekly', 'custom'] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setConfig({ ...config, frequency: freq })}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${
                      config.frequency === freq
                        ? 'bg-celestial-cyan/20 border-2 border-celestial-cyan text-white'
                        : 'glass border border-cosmic-700 hover:bg-cosmic-800'
                    }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Settings */}
            {config.frequency === 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="hour">Time of Day (Hour)</Label>
                <Input
                  id="hour"
                  type="number"
                  min="0"
                  max="23"
                  value={config.hour || 2}
                  onChange={(e) =>
                    setConfig({ ...config, hour: parseInt(e.target.value) })
                  }
                  placeholder="0-23"
                />
                <p className="text-xs text-gray-500">
                  Hour in 24-hour format (0 = midnight, 12 = noon)
                </p>
              </div>
            )}

            {config.frequency === 'weekly' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="day">Day of Week</Label>
                  <select
                    id="day"
                    value={config.day || 0}
                    onChange={(e) =>
                      setConfig({ ...config, day: parseInt(e.target.value) })
                    }
                    className="w-full p-2 rounded-lg glass border border-cosmic-700 bg-cosmic-900 text-white"
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hour-weekly">Time of Day (Hour)</Label>
                  <Input
                    id="hour-weekly"
                    type="number"
                    min="0"
                    max="23"
                    value={config.hour || 2}
                    onChange={(e) =>
                      setConfig({ ...config, hour: parseInt(e.target.value) })
                    }
                    placeholder="0-23"
                  />
                </div>
              </>
            )}

            {config.frequency === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="cron">Cron Expression</Label>
                <Input
                  id="cron"
                  value={config.cron_expression || ''}
                  onChange={(e) =>
                    setConfig({ ...config, cron_expression: e.target.value })
                  }
                  placeholder="0 2 * * *"
                />
                <p className="text-xs text-gray-500">
                  Standard cron format (minute hour day month weekday)
                </p>
              </div>
            )}

            {/* Backup Options */}
            <div className="space-y-3">
              <Label>Backup Options</Label>

              <div className="flex items-start gap-3 p-3 rounded-lg glass cursor-pointer hover:bg-cosmic-800" onClick={() => setConfig({ ...config, encrypt: !config.encrypt })}>
                <input
                  type="checkbox"
                  checked={config.encrypt}
                  onChange={(e) => setConfig({ ...config, encrypt: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-cosmic-600 bg-cosmic-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-celestial-cyan" />
                    <p className="font-medium">Encrypt Backups</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Encrypt scheduled backups with AES-256
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass cursor-pointer hover:bg-cosmic-800" onClick={() => setConfig({ ...config, compress: !config.compress })}>
                <input
                  type="checkbox"
                  checked={config.compress}
                  onChange={(e) => setConfig({ ...config, compress: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-cosmic-600 bg-cosmic-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-celestial-pink" />
                    <p className="font-medium">Compress Backups</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Compress scheduled backups to save storage
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass cursor-pointer hover:bg-cosmic-800" onClick={() => setConfig({ ...config, verify: !config.verify })}>
                <input
                  type="checkbox"
                  checked={config.verify}
                  onChange={(e) => setConfig({ ...config, verify: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-cosmic-600 bg-cosmic-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <p className="font-medium">Verify After Creation</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Automatically verify backup integrity
                  </p>
                </div>
              </div>
            </div>

            {/* Retention Policy */}
            <div className="space-y-2">
              <Label htmlFor="retention">Retention Policy</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="retention"
                  type="number"
                  min="1"
                  max="365"
                  value={config.retention_count || 30}
                  onChange={(e) =>
                    setConfig({ ...config, retention_count: parseInt(e.target.value) })
                  }
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">backups</span>
              </div>
              <p className="text-xs text-gray-500">
                Keep the last N backups and automatically delete older ones
              </p>
            </div>
          </>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/50">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-400">Settings saved successfully</p>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
          className="w-full"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Schedule Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
