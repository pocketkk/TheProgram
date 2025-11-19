/**
 * Password Settings Page
 *
 * Allows user to change or disable their password.
 * Accessible from the main settings menu when authenticated.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
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
import { authApi } from '@/lib/api/auth'
import { getErrorMessage } from '@/lib/api/client'
import { useAuthStore } from '@/store/authStore'

export const PasswordSettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'change' | 'disable'>('change')

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gradient-celestial mb-2">
          Password Settings
        </h1>
        <p className="text-gray-400">
          Manage your local password security
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-cosmic-700">
        <button
          onClick={() => setActiveTab('change')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'change'
              ? 'text-celestial-gold border-b-2 border-celestial-gold'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Change Password
        </button>
        <button
          onClick={() => setActiveTab('disable')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'disable'
              ? 'text-celestial-gold border-b-2 border-celestial-gold'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Disable Password
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'change' ? <ChangePasswordForm /> : <DisablePasswordForm />}
    </div>
  )
}

/**
 * Change Password Form
 */
const ChangePasswordForm = () => {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    // Validate password length
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters')
      return
    }

    // Warn about weak passwords
    if (newPassword.length < 8) {
      setError('Password is too short. We recommend at least 8 characters.')
      return
    }

    // Check if new password is same as old
    if (newPassword === oldPassword) {
      setError('New password must be different from old password')
      return
    }

    setIsLoading(true)

    try {
      await authApi.changePassword(oldPassword, newPassword)
      setSuccess('Password changed successfully!')
      // Clear form
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-cosmic-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Success Alert */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/50 p-3 text-sm text-green-400"
            >
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

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

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="old-password" required>
              Current Password
            </Label>
            <Input
              id="old-password"
              type="password"
              placeholder="Enter your current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password" required>
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Minimum 4 characters. We recommend at least 8 for better security.
            </p>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" required>
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="celestial"
            className="w-full"
            loading={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Disable Password Form
 */
const DisablePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { logout } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!confirmDisable) {
      setError('Please confirm that you want to disable password protection')
      return
    }

    setIsLoading(true)

    try {
      await authApi.disablePassword(currentPassword, confirmDisable)
      // Password disabled - logout and redirect to setup
      alert('Password disabled successfully. The app will now be accessible without authentication.')
      logout()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-cosmic-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Disable Password Protection
        </CardTitle>
        <CardDescription>
          Remove password requirement for this app
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warning Alert */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-lg bg-orange-500/10 border border-orange-500/50 p-3 text-sm text-orange-400"
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Warning: Security Risk</p>
              <p className="text-xs">
                Disabling password protection means anyone with access to this device
                can view and modify your astrology data. Only do this if you're the
                sole user of this device and trust your physical security.
              </p>
            </div>
          </motion.div>

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

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password" required>
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="confirm-disable"
              checked={confirmDisable}
              onChange={(e) => setConfirmDisable(e.target.checked)}
              disabled={isLoading}
              className="mt-1"
            />
            <label htmlFor="confirm-disable" className="text-sm text-gray-300 cursor-pointer">
              I understand the risks and want to disable password protection.
              The app will be accessible without authentication.
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="danger"
            className="w-full"
            loading={isLoading}
            disabled={!confirmDisable}
          >
            {isLoading ? 'Disabling...' : 'Disable Password Protection'}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center">
            You can re-enable password protection later by setting up a new password
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
