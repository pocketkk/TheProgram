// Custom hooks for celestial body system
export { useBodyPosition } from './useBodyPosition'
export { useAllBodyPositions } from './useAllBodyPositions'
export type { CalculatedPosition } from '../types'

export { useTrailSystem, calculateTrailLength } from './useTrailSystem'
export type { TrailSystemConfig, TrailSystemResult } from './useTrailSystem'

export { useZodiacInfo, calculateEclipticLongitudeFromPosition } from './useZodiacInfo'
export type { ZodiacInfoResult } from './useZodiacInfo'

export { useDisplayRadius, getAtmosphereMultiplier } from './useDisplayRadius'
export type { DisplayRadiusConfig } from './useDisplayRadius'

export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export type { KeyboardShortcut } from './useKeyboardShortcuts'
