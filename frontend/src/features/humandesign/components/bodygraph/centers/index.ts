/**
 * Center components index
 */
export { HeadCenter, getHeadGatePosition, HEAD_GATES } from './HeadCenter'
export { AjnaCenter, getAjnaGatePosition, AJNA_GATES } from './AjnaCenter'
export { ThroatCenter, getThroatGatePosition, THROAT_GATES } from './ThroatCenter'
export { GCenter, getGCenterGatePosition, G_CENTER_GATES } from './GCenter'
export { HeartCenter, getHeartGatePosition, HEART_GATES } from './HeartCenter'
export { SpleenCenter, getSpleenGatePosition, SPLEEN_GATES } from './SpleenCenter'
export { SolarPlexusCenter, getSolarPlexusGatePosition, SOLAR_PLEXUS_GATES } from './SolarPlexusCenter'
export { SacralCenter, getSacralGatePosition, SACRAL_GATES } from './SacralCenter'
export { RootCenter, getRootGatePosition, ROOT_GATES } from './RootCenter'

// Helper to get any gate position given gate number and center positions
import { CENTER_POSITIONS } from '../constants'
import type { Position } from '../types'

// Map of which center each gate belongs to
const GATE_TO_CENTER: Record<number, string> = {
  // Head
  64: 'head', 61: 'head', 63: 'head',
  // Ajna
  47: 'ajna', 24: 'ajna', 4: 'ajna', 17: 'ajna', 43: 'ajna', 11: 'ajna',
  // Throat
  62: 'throat', 23: 'throat', 56: 'throat', 16: 'throat', 20: 'throat',
  35: 'throat', 12: 'throat', 45: 'throat', 31: 'throat', 8: 'throat', 33: 'throat',
  // G Center
  7: 'g_center', 1: 'g_center', 13: 'g_center', 10: 'g_center', 25: 'g_center',
  46: 'g_center', 2: 'g_center', 15: 'g_center',
  // Heart
  21: 'heart', 51: 'heart', 26: 'heart', 40: 'heart',
  // Spleen
  48: 'spleen', 57: 'spleen', 44: 'spleen', 50: 'spleen',
  32: 'spleen', 28: 'spleen', 18: 'spleen',
  // Solar Plexus
  22: 'solar_plexus', 36: 'solar_plexus', 37: 'solar_plexus', 6: 'solar_plexus',
  49: 'solar_plexus', 55: 'solar_plexus', 30: 'solar_plexus',
  // Sacral
  5: 'sacral', 14: 'sacral', 29: 'sacral', 27: 'sacral', 34: 'sacral',
  59: 'sacral', 42: 'sacral', 3: 'sacral', 9: 'sacral',
  // Root
  58: 'root', 38: 'root', 54: 'root', 52: 'root', 60: 'root',
  53: 'root', 19: 'root', 39: 'root', 41: 'root',
}

import { getHeadGatePosition } from './HeadCenter'
import { getAjnaGatePosition } from './AjnaCenter'
import { getThroatGatePosition } from './ThroatCenter'
import { getGCenterGatePosition } from './GCenter'
import { getHeartGatePosition } from './HeartCenter'
import { getSpleenGatePosition } from './SpleenCenter'
import { getSolarPlexusGatePosition } from './SolarPlexusCenter'
import { getSacralGatePosition } from './SacralCenter'
import { getRootGatePosition } from './RootCenter'

const GATE_POSITION_GETTERS: Record<string, (gate: number, cx: number, cy: number) => Position | null> = {
  head: getHeadGatePosition,
  ajna: getAjnaGatePosition,
  throat: getThroatGatePosition,
  g_center: getGCenterGatePosition,
  heart: getHeartGatePosition,
  spleen: getSpleenGatePosition,
  solar_plexus: getSolarPlexusGatePosition,
  sacral: getSacralGatePosition,
  root: getRootGatePosition,
}

export const getGatePosition = (gate: number): Position | null => {
  const centerName = GATE_TO_CENTER[gate]
  if (!centerName) return null

  const centerPos = CENTER_POSITIONS[centerName as keyof typeof CENTER_POSITIONS]
  if (!centerPos) return null

  const getter = GATE_POSITION_GETTERS[centerName]
  if (!getter) return null

  return getter(gate, centerPos.x, centerPos.y)
}

export { GATE_TO_CENTER }
