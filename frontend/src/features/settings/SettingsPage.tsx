/**
 * SettingsPage Component
 *
 * Application settings and data management page.
 */
import React from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Database,
  Download,
  Shield,
  Bell,
  Palette,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ExportButton } from '@/features/data-portability'
import { ExportType } from '@/types/export'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-heading font-bold text-gradient-celestial mb-2">
          Settings
        </h1>
        <p className="text-gray-400">
          Manage your application settings and data.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Data Portability */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Database className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Data Portability</CardTitle>
              </div>
              <CardDescription>
                Export your data for backup or migration to another system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                You can export your entire database or specific data sets in JSON or CSV format.
                All exports include your clients, charts, interpretations, and session notes.
              </p>
              <ExportButton
                exportType={ExportType.FULL}
                variant="primary"
                label="Export All Data"
                className="w-full"
                onExportComplete={(filename) => {
                  console.log('Export completed:', filename)
                }}
              />
              <div className="pt-2 border-t border-cosmic-700">
                <p className="text-xs text-gray-500">
                  Exports are downloaded directly to your device. Your data never leaves your control.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Security & Privacy</CardTitle>
              </div>
              <CardDescription>
                Manage your password and security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Security settings coming soon. This will include password management,
                session controls, and data encryption options.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Bell className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Configure notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Notification settings coming soon. This will include alerts for transits,
                calculation completions, and system updates.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Palette className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                Theme and appearance settings coming soon. The current cosmic theme
                is optimized for dark mode viewing.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-cosmic-600">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-gradient-to-br from-celestial-gold to-celestial-pink p-3">
                <Download className="h-6 w-6 text-cosmic-950" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-lg mb-1">
                  Regular Backups Recommended
                </h3>
                <p className="text-sm text-gray-400">
                  We recommend exporting your data regularly to ensure you always have a backup.
                  Exports are portable and can be imported into any compatible astrology software.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
