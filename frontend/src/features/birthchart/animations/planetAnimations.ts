/**
 * Planet Animation Definitions
 *
 * Specialized animations for planetary elements in the birth chart.
 * Includes entrance, interaction, and celestial-themed motion effects.
 *
 * @module planetAnimations
 */

import type { Variants } from 'framer-motion'

// ============================================================================
// PLANET ENTRANCE ANIMATIONS
// ============================================================================

/**
 * Planet entrance animation - fly in from sky position
 * Planets enter from positions around the chart perimeter
 * with a spring physics simulation
 *
 * @param index - Planet index to calculate unique entry angle
 */
export const planetEntranceVariants: Variants = {
  initial: (index: number) => {
    // Calculate unique entry position for each planet
    // Spread them around the circle for a "gathering" effect
    const angle = (index * 36) * (Math.PI / 180)
    const distance = 800 // Start far outside the chart
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      scale: 0
    }
  },
  animate: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      mass: 0.8,
      restDelta: 0.001
    }
  }
}

/**
 * Planet fade-in entrance (simpler alternative)
 * Scales up from center position - less dramatic than fly-in
 */
export const planetFadeInVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0
  },
  animate: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.08, // 80ms stagger
      duration: 0.4,
      ease: 'easeOut'
    }
  })
}

/**
 * Planet orbital entrance
 * Planets rotate into position as if orbiting
 */
export const planetOrbitalVariants: Variants = {
  initial: () => ({
    rotate: -360,
    scale: 0.5,
    opacity: 0
  }),
  animate: (index: number) => ({
    rotate: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: index * 0.05,
      duration: 0.8,
      ease: [0.34, 1.56, 0.64, 1], // Bounce
      rotate: { duration: 1.2, ease: 'easeOut' }
    }
  })
}

// ============================================================================
// PLANET INTERACTION ANIMATIONS
// ============================================================================

/**
 * Planet hover animation
 * Subtle scale up on mouse hover
 */
export const planetHoverVariants: Variants = {
  rest: {
    scale: 1,
    filter: 'brightness(1)'
  },
  hover: {
    scale: 1.15,
    filter: 'brightness(1.2)',
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  }
}

/**
 * Planet selection animation
 * More pronounced scale and glow when selected
 */
export const planetSelectionVariants: Variants = {
  unselected: {
    scale: 1,
    filter: 'brightness(1)'
  },
  selected: {
    scale: 1.2,
    filter: 'brightness(1.3)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20
    }
  }
}

/**
 * Planet click feedback
 * Quick bounce on click
 */
export const planetClickVariants: Variants = {
  rest: { scale: 1 },
  tap: {
    scale: 0.9,
    transition: {
      duration: 0.1,
      ease: 'easeInOut'
    }
  }
}

// ============================================================================
// PLANET SPECIAL INDICATORS
// ============================================================================

/**
 * Retrograde indicator animation
 * Pulsing effect for retrograde symbol
 */
export const retrogradeVariants: Variants = {
  initial: {
    opacity: 0.6,
    scale: 0.9
  },
  animate: {
    opacity: [0.6, 1, 0.6],
    scale: [0.9, 1.1, 0.9],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
      times: [0, 0.5, 1]
    }
  }
}

/**
 * Dignified planet glow
 * Special glow for planets in domicile/exaltation
 */
export const dignifiedGlowVariants: Variants = {
  initial: {
    filter: 'drop-shadow(0 0 2px currentColor)'
  },
  animate: {
    filter: [
      'drop-shadow(0 0 2px currentColor)',
      'drop-shadow(0 0 8px currentColor)',
      'drop-shadow(0 0 2px currentColor)'
    ],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

/**
 * Combust planet indicator
 * Dimmed and flickering for planets too close to Sun
 */
export const combustVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.7, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// ============================================================================
// PLANET GROUPING ANIMATIONS
// ============================================================================

/**
 * Clustered planets animation
 * When multiple planets are close together
 */
export const planetClusterVariants: Variants = {
  grouped: {
    scale: 0.85,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  expanded: {
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15
    }
  }
}

/**
 * Stellium highlight animation
 * Pulsing glow for planets in stellium formation
 */
export const stelliumHighlightVariants: Variants = {
  initial: {
    filter: 'drop-shadow(0 0 0px rgba(255, 215, 0, 0))'
  },
  animate: {
    filter: [
      'drop-shadow(0 0 0px rgba(255, 215, 0, 0))',
      'drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))',
      'drop-shadow(0 0 0px rgba(255, 215, 0, 0))'
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// ============================================================================
// PLANET SYMBOL ANIMATIONS
// ============================================================================

/**
 * Planet symbol reveal
 * Symbol fades in after planet circle appears
 */
export const symbolRevealVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.5
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.2,
      duration: 0.3,
      ease: 'easeOut'
    }
  }
}

/**
 * Planet symbol pulse on hover
 * Subtle emphasis when hovering
 */
export const symbolPulseVariants: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.4,
      ease: 'easeInOut'
    }
  }
}

// ============================================================================
// SELECTION RING ANIMATIONS
// ============================================================================

/**
 * Selection ring expansion
 * Ring grows outward when planet is selected
 */
export const selectionRingVariants: Variants = {
  initial: {
    scale: 0,
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
    scale: 1.5,
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}

/**
 * Selection ring pulse
 * Continuous pulsing while selected
 */
export const selectionRingPulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 0.8
  },
  animate: {
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
 * Highlight ring (for related planets)
 * Subtle ring for planets related to selection
 */
export const highlightRingVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9
  },
  animate: {
    opacity: 0.5,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.15
    }
  }
}

// ============================================================================
// ORBITAL PATH ANIMATIONS
// ============================================================================

/**
 * Planet orbit path drawing
 * Draws circular path for planet's orbit
 */
export const orbitPathVariants: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0
  },
  animate: {
    pathLength: 1,
    opacity: 0.2,
    transition: {
      duration: 1.5,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3
    }
  }
}

/**
 * Orbit marker animation (for planet position on orbit)
 * Small dot that travels along orbit path
 */
export const orbitMarkerVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 1.5,
      duration: 0.3
    }
  }
}

// ============================================================================
// ASPECT PATTERN ANIMATIONS
// ============================================================================

/**
 * Grand trine highlight
 * Pulsing effect for planets in grand trine
 */
export const grandTrineVariants: Variants = {
  initial: {
    filter: 'drop-shadow(0 0 0px rgba(76, 175, 80, 0))'
  },
  animate: {
    filter: [
      'drop-shadow(0 0 0px rgba(76, 175, 80, 0))',
      'drop-shadow(0 0 10px rgba(76, 175, 80, 0.9))',
      'drop-shadow(0 0 0px rgba(76, 175, 80, 0))'
    ],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

/**
 * T-square tension indicator
 * Rapid pulse for planets in T-square
 */
export const tSquareVariants: Variants = {
  initial: {
    filter: 'drop-shadow(0 0 0px rgba(244, 67, 54, 0))'
  },
  animate: {
    filter: [
      'drop-shadow(0 0 0px rgba(244, 67, 54, 0))',
      'drop-shadow(0 0 8px rgba(244, 67, 54, 0.8))',
      'drop-shadow(0 0 0px rgba(244, 67, 54, 0))'
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

/**
 * Yod (Finger of God) emphasis
 * Mystical purple glow for yod planets
 */
export const yodVariants: Variants = {
  initial: {
    filter: 'drop-shadow(0 0 0px rgba(156, 39, 176, 0))'
  },
  animate: {
    filter: [
      'drop-shadow(0 0 0px rgba(156, 39, 176, 0))',
      'drop-shadow(0 0 12px rgba(156, 39, 176, 0.9))',
      'drop-shadow(0 0 0px rgba(156, 39, 176, 0))'
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate planet entrance delay based on planetary speed
 * Inner planets animate faster (Mercury, Venus)
 * Outer planets animate slower (Saturn, Uranus, Neptune, Pluto)
 */
export function getPlanetEntranceDelay(planetName: string): number {
  const delays: Record<string, number> = {
    'Sun': 0,
    'Moon': 0.05,
    'Mercury': 0.1,
    'Venus': 0.15,
    'Mars': 0.2,
    'Jupiter': 0.25,
    'Saturn': 0.3,
    'Uranus': 0.35,
    'Neptune': 0.4,
    'Pluto': 0.45,
    'North Node': 0.5,
    'South Node': 0.5,
    'Chiron': 0.5
  }
  return delays[planetName] || 0.2
}

/**
 * Get animation intensity based on planet's orb strength
 * Tighter orbs get more intense animations
 */
export function getAnimationIntensity(orb: number, maxOrb: number = 8): number {
  return Math.max(0.5, 1 - (orb / maxOrb) * 0.5)
}

/**
 * Create custom spring config for planet based on mass
 * Heavier planets (Jupiter, Saturn) have slower, more massive springs
 */
export function getPlanetSpringConfig(planetName: string) {
  const heavyPlanets = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  const isHeavy = heavyPlanets.includes(planetName)

  return {
    type: 'spring' as const,
    stiffness: isHeavy ? 80 : 120,
    damping: isHeavy ? 20 : 15,
    mass: isHeavy ? 1.2 : 0.8
  }
}
