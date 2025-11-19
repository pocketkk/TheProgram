/**
 * Login Page
 *
 * Simple password entry screen for single-user authentication.
 * No registration or account management - just password verification.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Sparkles, AlertCircle } from 'lucide-react'
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

export const LoginPage = () => {
  const [password, setPassword] = useState('')

  const { login, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await login(password)
      // Redirect will happen automatically on success via App.tsx
      console.log('Login successful!')
    } catch (err) {
      // Error is already set in the store
      console.error('Login failed:', err)
    }
  }

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

      {/* Login Card */}
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
              <div className="rounded-full bg-gradient-to-br from-cosmic-600 to-cosmic-500 p-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            <CardTitle className="text-3xl text-gradient-celestial font-heading">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-base">
              Enter your password to access The Program
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" required>
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                    autoFocus
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
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              {/* Help Text */}
              <div className="text-center pt-2">
                <p className="text-sm text-gray-400">
                  Forgot your password? You can reset it from the backend database.
                </p>
              </div>
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
          Professional Astrological Chart Calculation
        </motion.p>
      </motion.div>
    </div>
  )
}
