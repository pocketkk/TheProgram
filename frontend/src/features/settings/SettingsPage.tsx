/**
 * SettingsPage Component
 *
 * Application settings and data management page.
 */
import { motion } from 'framer-motion'
import {
  Sparkles,
  Info,
  Bug,
  Lightbulb,
  ExternalLink,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ApiKeySettings } from './components/ApiKeySettings'
import { GoogleApiKeySettings } from './components/GoogleApiKeySettings'

const APP_VERSION = '1.0.0'
const GITHUB_REPO = 'pocketkk/TheProgram'

function getSystemInfo(): string {
  const platform = navigator.platform || 'Unknown'
  const userAgent = navigator.userAgent
  let os = 'Unknown'

  if (userAgent.includes('Win')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'

  return `- **OS**: ${os} (${platform})
- **App Version**: ${APP_VERSION}
- **User Agent**: ${userAgent}`
}

function openBugReport() {
  const systemInfo = getSystemInfo()
  const body = encodeURIComponent(`## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
${systemInfo}

## Screenshots
If applicable, add screenshots to help explain your problem.

## Error Messages
\`\`\`
(paste any error messages here)
\`\`\`
`)

  const url = `https://github.com/${GITHUB_REPO}/issues/new?template=bug_report.md&title=${encodeURIComponent('[BUG] ')}&body=${body}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openFeatureRequest() {
  const body = encodeURIComponent(`## Feature Description
A clear description of the feature you'd like to see.

## Use Case
Why would this feature be useful? What problem does it solve?

## Proposed Solution
How do you envision this feature working?

## Alternatives Considered
Are there other ways to achieve this?

## Additional Context
Any other information about the feature request.
`)

  const url = `https://github.com/${GITHUB_REPO}/issues/new?template=feature_request.md&title=${encodeURIComponent('[FEATURE] ')}&body=${body}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

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

      {/* API Keys Help Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="p-4 rounded-xl bg-gradient-to-r from-celestial-gold/10 to-celestial-pink/10 border border-celestial-gold/20">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-celestial-gold/20 p-2.5 mt-0.5">
              <Info className="h-5 w-5 text-celestial-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white mb-1">API Keys Are Optional</h3>
              <p className="text-sm text-gray-300 mb-2">
                The Program works without API keys—all chart calculations, divination tools, and journaling are fully functional.
                API keys unlock AI-powered interpretations and custom image generation.
              </p>
              <a
                href="https://theprogram.us/setup.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-celestial-gold hover:text-celestial-pink transition-colors"
              >
                New to API keys? Follow our 5-minute setup guide
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
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
                Optional. Powers Claude AI interpretations for birth charts, transits, synastry, and the Guide companion.
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
                Optional. Powers Gemini image generation for custom tarot decks and celestial art in the Studio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleApiKeySettings />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Feedback Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-5 w-5 text-cosmic-400" />
              <CardTitle>Feedback</CardTitle>
            </div>
            <CardDescription>
              Help us improve The Program by reporting bugs or requesting new features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={openBugReport}
                className="flex items-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Report a Bug
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
              <Button
                variant="outline"
                onClick={openFeatureRequest}
                className="flex items-center gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Request a Feature
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Opens GitHub in your browser. Version {APP_VERSION}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
