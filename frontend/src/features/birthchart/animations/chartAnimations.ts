/**
 * Chart Animation Definitions
 *
 * Comprehensive animation system using Framer Motion for the birth chart feature.
 * Provides consistent, performant animations across all chart components.
 *
 * @module chartAnimations
 */

import type { Variants } from 'framer-motion'

/**
 * Check if user prefers reduced motion
 * Returns animation config respecting accessibility preferences
 */
export function getAnimationConfig() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    enabled: !prefersReducedMotion,
    duration: prefersReducedMotion ? 0 : undefined,
    delay: prefersReducedMotion ? 0 : undefined,
  }
}

/**
 * Apply reduced motion settings to variants
 */
export function withReducedMotion(variants: Variants): Variants {
  const config = getAnimationConfig()
  if (!config.enabled) {
    // Return instant transitions if reduced motion is preferred
    return Object.keys(variants).reduce((acc, key) => {
      acc[key] = {
        ...variants[key],
        transition: { duration: 0, delay: 0 }
      }
      return acc
    }, {} as Variants)
  }
  return variants
}

// ============================================================================
// PAGE & LAYOUT ANIMATIONS
// ============================================================================

/**
 * Page entrance animation
 * Smooth fade + slide up effect for initial page load
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3
    }
  }
}

/**
 * Panel slide animation
 * Used for collapsible panels and filters
 */
export const panelVariants: Variants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  },
  open: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  }
}

/**
 * Tab content transition
 * Smooth transition when switching between tabs
 */
export const tabContentVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
}

// ============================================================================
// CHART WHEEL ANIMATIONS
// ============================================================================

/**
 * Zodiac wheel entrance animation
 * Main wheel scales up and rotates into place
 */
export const wheelVariants: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
    rotate: -10
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smooth motion
      rotate: { duration: 1.2 }
    }
  }
}

/**
 * Zodiac ring segment animation
 * Each sign segment animates in with a stagger
 *
 * @param i - Segment index for stagger calculation
 */
export const zodiacSegmentVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95
  },
  animate: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.03, // 30ms stagger between segments
      duration: 0.4,
      ease: 'easeOut'
    }
  })
}

/**
 * House cusp line animation
 * Lines fade and draw from center outward
 */
export const houseCuspVariants: Variants = {
  initial: {
    opacity: 0,
    pathLength: 0
  },
  animate: (delay: number = 0) => ({
    opacity: 1,
    pathLength: 1,
    transition: {
      delay,
      duration: 0.5,
      ease: 'easeOut'
    }
  })
}

// ============================================================================
// ASPECT LINE ANIMATIONS
// ============================================================================

/**
 * Aspect line drawing animation
 * Lines draw from planet to planet with configurable delay
 *
 * @param delay - Delay before animation starts (default: 0)
 */
export const aspectLineVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0
  },
  animate: (delay: number = 0) => ({
    pathLength: 1,
    opacity: 0.3,
    transition: {
      delay,
      duration: 0.5,
      ease: 'easeOut'
    }
  })
}

/**
 * Aspect line highlight animation
 * Pulses when related planet is selected
 */
export const aspectHighlightVariants: Variants = {
  rest: {
    opacity: 0.3,
    strokeWidth: 1
  },
  highlight: {
    opacity: 0.8,
    strokeWidth: 3,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  }
}

// ============================================================================
// CARD & LIST ANIMATIONS
// ============================================================================

/**
 * Card entrance animation
 * Used for planet info cards, house info cards, etc.
 *
 * @param i - Card index for stagger calculation
 */
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05, // 50ms stagger between cards
      duration: 0.4,
      ease: 'easeOut'
    }
  })
}

/**
 * List item animation
 * Subtle entrance for list items
 *
 * @param i - Item index for stagger calculation
 */
export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -10
  },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'easeOut'
    }
  })
}

// ============================================================================
// INTERACTION ANIMATIONS
// ============================================================================

/**
 * Glow pulse animation
 * Used for selected or highlighted elements
 */
export const glowVariants: Variants = {
  rest: {
    scale: 1,
    opacity: 0.8
  },
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

/**
 * Tooltip animation
 * Quick fade + scale for responsive tooltips
 */
export const tooltipVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: -5
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -5,
    transition: {
      duration: 0.1,
      ease: 'easeIn'
    }
  }
}

/**
 * Button hover animation
 * Subtle lift effect on hover
 */
export const buttonHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  tap: {
    scale: 0.95,
    y: 0,
    transition: {
      duration: 0.1
    }
  }
}

// ============================================================================
// CHART DATA VISUALIZATION ANIMATIONS
// ============================================================================

/**
 * Bar chart bar animation
 * Grows from bottom with bounce
 */
export const barChartVariants: Variants = {
  initial: {
    scaleY: 0,
    originY: 1
  },
  animate: (i: number) => ({
    scaleY: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1] // Bounce easing
    }
  })
}

/**
 * Pie chart segment animation
 * Sweeps in from 0 to final angle
 */
export const pieChartVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0
  },
  animate: (delay: number = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      delay,
      duration: 0.8,
      ease: 'easeOut'
    }
  })
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create stagger container for child animations
 * Wraps children with staggered animation timing
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

/**
 * Create fade-through animation
 * Element fades out and new one fades in
 */
export const fadeThroughVariants: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeInOut'
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeInOut'
    }
  }
}

/**
 * Scale fade animation
 * Combined scale and opacity for emphasis
 */
export const scaleFadeVariants: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION
// ============================================================================

/**
 * Default transition config optimized for performance
 * Uses GPU-accelerated properties only (transform, opacity)
 */
export const performantTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.3
}

/**
 * Spring transition config for bouncy effects
 */
export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 20,
  mass: 0.8
}

/**
 * Layout transition for elements that change size
 */
export const layoutTransition = {
  layout: true,
  transition: {
    duration: 0.3,
    ease: 'easeInOut'
  }
}
