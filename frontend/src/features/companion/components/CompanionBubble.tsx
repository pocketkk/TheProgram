/**
 * CompanionBubble - Minimized floating companion orb
 * Displays the avatar and handles expand interaction
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useCompanionStore } from '../stores/companionStore'
import { CompanionAvatar } from './CompanionAvatar'

interface CompanionBubbleProps {
  onClick: () => void
}

export function CompanionBubble({ onClick }: CompanionBubbleProps) {
  const { avatarState, pendingInsights, connectionStatus } = useCompanionStore()

  const unreadInsights = pendingInsights.filter(i => !i.dismissed).length

  return (
    <motion.button
      className="relative group"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label="Open AI companion"
    >
      {/* Pulsing ring when there are insights */}
      <AnimatePresence>
        {unreadInsights > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-amber-400"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>

      {/* Connection status ring */}
      <motion.div
        className={`absolute inset-0 rounded-full border-2 ${
          connectionStatus === 'connected'
            ? 'border-green-400/50'
            : connectionStatus === 'connecting'
              ? 'border-yellow-400/50'
              : 'border-gray-400/50'
        }`}
        animate={{
          opacity: connectionStatus === 'connecting' ? [0.5, 1, 0.5] : 1,
        }}
        transition={{
          duration: 1,
          repeat: connectionStatus === 'connecting' ? Infinity : 0,
        }}
      />

      {/* Avatar */}
      <CompanionAvatar state={avatarState} size={56} />

      {/* Notification badge */}
      <AnimatePresence>
        {unreadInsights > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            {unreadInsights}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover tooltip */}
      <motion.div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg"
        initial={{ y: 5 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {connectionStatus === 'connected'
          ? 'Chat with your guide'
          : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Click to connect'}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </motion.div>
    </motion.button>
  )
}

export default CompanionBubble
