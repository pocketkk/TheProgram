/**
 * Body Graph component exports
 */
export { BodyGraph } from './BodyGraph'
export { default } from './BodyGraph'

// Re-export types
export type { GateActivationType, CenterProps, Position } from './types'

// Re-export constants
export { COLORS, SIZES, CENTER_POSITIONS, CHANNELS, VIEWBOX } from './constants'

// Re-export center components for individual use
export {
  HeadCenter,
  AjnaCenter,
  ThroatCenter,
  GCenter,
  HeartCenter,
  SpleenCenter,
  SolarPlexusCenter,
  SacralCenter,
  RootCenter,
  getGatePosition,
} from './centers'
