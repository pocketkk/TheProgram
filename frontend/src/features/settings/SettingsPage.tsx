/**
 * SettingsPage Component
 *
 * Application settings and data management page.
 */
import { motion } from 'framer-motion'
import {
  Sparkles,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ApiKeySettings } from './components/ApiKeySettings'
import { GoogleApiKeySettings } from './components/GoogleApiKeySettings'

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
          Manage your application settings and API keys.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Anthropic AI Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Anthropic AI Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure your Anthropic API key to enable Claude AI-powered chart interpretations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeySettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* Google AI Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Google AI Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure your Google API key to enable Gemini AI-powered image generation in Studio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleApiKeySettings />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-cosmic-600">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-gradient-to-br from-celestial-gold to-celestial-pink p-3">
                <Info className="h-6 w-6 text-cosmic-950" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-lg mb-1">
                  About Your Data
                </h3>
                <p className="text-sm text-gray-400">
                  All your birth chart data is stored locally on your device.
                  Your personal information and astrological calculations remain private and under your control.
                  API keys are stored securely and only used to communicate with their respective services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
