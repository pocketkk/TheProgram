/**
 * SettingsPage Component
 *
 * Application settings and data management page.
 */
import { motion } from 'framer-motion'
import {
  Shield,
  Bell,
  Palette,
  Sparkles,
  Info,
  Newspaper,
  Rss,
  Cloud,
  Trophy,
  Brain,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ApiKeySettings } from './components/ApiKeySettings'
import { GoogleApiKeySettings } from './components/GoogleApiKeySettings'
import { NewspaperStyleSettings } from './components/NewspaperStyleSettings'
import { NewsSourcesSettings } from './components/NewsSourcesSettings'
import { RssFeedsSettings } from './components/RssFeedsSettings'
import { WeatherSettings } from './components/WeatherSettings'
import { SportsSettings } from './components/SportsSettings'
import { ReadingPreferencesSettings } from './components/ReadingPreferencesSettings'

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
                Configure your Google API key to enable Gemini AI-powered features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleApiKeySettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Newspaper className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Timeline Settings</CardTitle>
              </div>
              <CardDescription>
                Configure how the Timeline feature generates AI newspapers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewspaperStyleSettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* News Sources Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Newspaper className="h-5 w-5 text-cosmic-400" />
                <CardTitle>News Sources</CardTitle>
              </div>
              <CardDescription>
                Configure API keys for historical news archives. These enable year-specific
                newspapers showing actual news from the date you're viewing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewsSourcesSettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* RSS Feeds */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Rss className="h-5 w-5 text-cosmic-400" />
                <CardTitle>RSS Feeds</CardTitle>
              </div>
              <CardDescription>
                Subscribe to blogs, news sites, and newsletters. Your feeds appear
                in the Chronicle alongside historical news.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RssFeedsSettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* Weather */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Cloud className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Weather</CardTitle>
              </div>
              <CardDescription>
                Configure OpenWeatherMap integration for weather data in your Chronicle.
                Manage your saved locations for quick access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeatherSettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* Sports */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Sports</CardTitle>
              </div>
              <CardDescription>
                Follow your favorite teams. Their scores will appear in the Chronicle sports ticker.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SportsSettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* Reading Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Brain className="h-5 w-5 text-cosmic-400" />
                <CardTitle>Reading Preferences</CardTitle>
              </div>
              <CardDescription>
                Your personal algorithm learns from your reading habits.
                View statistics, manage interests, and control your data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReadingPreferencesSettings />
            </CardContent>
          </Card>
        </motion.div>

        {/* Security & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
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
          transition={{ delay: 0.6 }}
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
          transition={{ delay: 0.7 }}
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
        transition={{ delay: 0.8 }}
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
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
