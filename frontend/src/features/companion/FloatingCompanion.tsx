/**
 * FloatingCompanion - Main container component
 * Renders as a portal to body, handles expand/collapse and positioning
 */

import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useCompanionStore } from './stores/companionStore'
import { CompanionBubble } from './components/CompanionBubble'
import { CompanionPanel } from './components/CompanionPanel'

// Position classes for different placements
const positionClasses = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
}

export function FloatingCompanion() {
  const { isExpanded, position, expand, minimize } = useCompanionStore()

  const positionClass = positionClasses[position]

  // Render via portal to ensure it floats above everything
  return createPortal(
    <div className={`fixed ${positionClass} z-50`}>
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="panel"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <CompanionPanel onMinimize={minimize} />
          </motion.div>
        ) : (
          <motion.div
            key="bubble"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <CompanionBubble onClick={expand} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}

export default FloatingCompanion
