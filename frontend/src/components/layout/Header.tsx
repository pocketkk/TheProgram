import { motion } from 'framer-motion'
import { Sparkles, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

export const Header = () => {
  const { logout } = useAuthStore()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-strong border-b border-cosmic-700/50 sticky top-0 z-40"
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-cosmic-600 to-cosmic-500 p-2">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-gradient-celestial">
                The Program
              </h1>
              <p className="text-xs text-gray-500">
                Astrological Chart Calculation
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
