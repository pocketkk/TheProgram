/**
 * ExpandTransition Component
 *
 * Framer Motion wrapper for the day view expansion animation.
 * Provides coordinated animations for backdrop, content, and sidebar.
 *
 * Animation choreography:
 * 1. Backdrop fades in (150ms)
 * 2. Content scales up from center (400ms spring)
 * 3. Sidebar slides in from right (300ms delay)
 *
 * @module features/timeline/components/DayView
 */

import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { getAnimationConfig, withReducedMotion } from '@/features/birthchart/animations/chartAnimations'

export interface ExpandTransitionProps {
  isOpen: boolean
  children: React.ReactNode
}

// Backdrop fade animation
const backdropVariants: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  }
}

// Main content scale animation
const contentVariants: Variants = {
  hidden: {
    scale: 0.8,
    opacity: 0
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
      duration: 0.4
    }
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
}

// Sidebar slide animation
const sidebarVariants: Variants = {
  hidden: {
    x: 100,
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.2,
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
}

/**
 * ExpandTransition - Animated wrapper for day view expansion
 *
 * Handles the coordinated animation sequence when a day is expanded.
 * Respects user's reduced motion preferences.
 *
 * @example
 * ```tsx
 * <ExpandTransition isOpen={isDayOpen}>
 *   <DayViewContent />
 * </ExpandTransition>
 * ```
 */
export function ExpandTransition({ isOpen, children }: ExpandTransitionProps) {
  const animConfig = getAnimationConfig()

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          variants={withReducedMotion(backdropVariants)}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Content wrapper with scale animation
 */
export function ExpandContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="relative w-full h-full max-w-[95vw] max-h-[95vh]"
      variants={withReducedMotion(contentVariants)}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

/**
 * Sidebar wrapper with slide animation
 */
export function ExpandSidebar({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={withReducedMotion(sidebarVariants)}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
