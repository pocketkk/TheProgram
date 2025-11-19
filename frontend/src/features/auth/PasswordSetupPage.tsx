/**
 * Password Setup Page
 *
 * Shown on first-time app launch when no password is configured.
 * Guides user through setting up their local password.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

export const PasswordSetupPage = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const { setupPassword, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    // Validate password match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    // Validate password length (backend requires min 4, we suggest 8+)
    if (password.length < 4) {
      setLocalError('Password must be at least 4 characters')
      return
    }

    // Warn about weak passwords
    if (password.length < 8) {
      setLocalError('Password is too short. We recommend at least 8 characters for security.')
      return
    }

    try {
      await setupPassword(password)
      // Success - the auth store will update and trigger re-render to login page
    } catch (err) {
      // Error is already set in the store
      console.error('Password setup failed:', err)
    }
  }

  const displayError = error || localError

  return (
    <div className="min-h-screen cosmic-bg relative overflow-hidden flex items-center justify-center">
      {/* Starfield background */}
      <div className="starfield" />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-celestial-purple"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Setup Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="border-cosmic-600">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="mb-4 flex justify-center"
            >
              <div className="rounded-full bg-gradient-to-br from-celestial-gold to-celestial-pink p-4">
                <Sparkles className="h-8 w-8 text-cosmic-950" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl text-gradient-celestial font-heading">
              Welcome to The Program
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Set up your password to secure your personal astrology app
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info message */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg bg-cosmic-700/50 border border-cosmic-600 p-3 text-sm text-gray-300"
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-celestial-gold mt-0.5" />
                <div>
                  <p className="font-medium mb-1">First-time setup</p>
                  <p className="text-xs text-gray-400">
                    This is a personal app running on your device. Your password is stored
                    locally and never transmitted to external servers.
                  </p>
                </div>
              </motion.div>

              {/* Error Alert */}
              {displayError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{displayError}</span>
                </motion.div>
              )}

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" required>
                  Create Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Minimum 4 characters. We recommend at least 8 for better security.
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" required>
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="celestial"
                className="w-full"
                size="lg"
                loading={isLoading}
              >
                {isLoading ? 'Setting up...' : 'Set Password & Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          You can change or disable this password later in settings
        </motion.p>
      </motion.div>
    </div>
  )
}
