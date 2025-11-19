/**
 * Birth Chart Animation System
 *
 * Central export point for all animation definitions and utilities.
 * Import animations from this file for consistent usage across components.
 *
 * @module animations
 *
 * @example
 * ```tsx
 * import { pageVariants, planetEntranceVariants } from './animations'
 *
 * <motion.div variants={pageVariants} initial="initial" animate="animate">
 *   <BirthChartWheel />
 * </motion.div>
 * ```
 */

// Chart-level animations
export {
  // Page & Layout
  pageVariants,
  panelVariants,
  tabContentVariants,

  // Wheel
  wheelVariants,
  zodiacSegmentVariants,
  houseCuspVariants,

  // Aspects
  aspectLineVariants,
  aspectHighlightVariants,

  // Cards & Lists
  cardVariants,
  listItemVariants,

  // Interactions
  glowVariants,
  tooltipVariants,
  buttonHoverVariants,

  // Data Viz
  barChartVariants,
  pieChartVariants,

  // Utilities
  staggerContainerVariants,
  fadeThroughVariants,
  scaleFadeVariants,
  performantTransition,
  springTransition,
  layoutTransition,

  // Accessibility
  getAnimationConfig,
  withReducedMotion,
} from './chartAnimations'

// Planet-specific animations
export {
  // Entrance
  planetEntranceVariants,
  planetFadeInVariants,
  planetOrbitalVariants,

  // Interaction
  planetHoverVariants,
  planetSelectionVariants,
  planetClickVariants,

  // Indicators
  retrogradeVariants,
  dignifiedGlowVariants,
  combustVariants,

  // Grouping
  planetClusterVariants,
  stelliumHighlightVariants,

  // Symbols
  symbolRevealVariants,
  symbolPulseVariants,

  // Selection Rings
  selectionRingVariants,
  selectionRingPulseVariants,
  highlightRingVariants,

  // Orbital
  orbitPathVariants,
  orbitMarkerVariants,

  // Aspect Patterns
  grandTrineVariants,
  tSquareVariants,
  yodVariants,

  // Utilities
  getPlanetEntranceDelay,
  getAnimationIntensity,
  getPlanetSpringConfig,
} from './planetAnimations'

// Re-export loading state components
export { ChartLoadingState, ChartLoadingStateMinimal } from '../components/ChartLoadingState'
