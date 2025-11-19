import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'

export interface TrailSystemConfig {
  enabled: boolean
  maxLength: number
  speed: number // Days per frame
  julianDay: number
}

export interface TrailSystemResult {
  bodyTrail: THREE.Vector3[] // Trail in 3D space
  footprintTrail: THREE.Vector3[] // Trail at footprint level (y = -2.98)
  clearTrails: () => void
}

/**
 * Manage trail position history for a celestial body
 * Handles both 3D body trail and 2D footprint trail
 *
 * @param position - Current body position
 * @param config - Trail configuration
 * @returns Trail positions and control functions
 */
export function useTrailSystem(
  position: THREE.Vector3,
  config: TrailSystemConfig
): TrailSystemResult {
  const [bodyTrail, setBodyTrail] = useState<THREE.Vector3[]>([])
  const [footprintTrail, setFootprintTrail] = useState<THREE.Vector3[]>([])
  const previousJulianDayRef = useRef(config.julianDay)

  useEffect(() => {
    if (!config.enabled) {
      // Clear trails when disabled
      if (bodyTrail.length > 0 || footprintTrail.length > 0) {
        setBodyTrail([])
        setFootprintTrail([])
      }
      previousJulianDayRef.current = config.julianDay
      return
    }

    // Detect significant time jumps (user scrubbing timeline)
    // Threshold scales with speed: normal playback at high speeds shouldn't reset trails
    const julianDayDiff = Math.abs(config.julianDay - previousJulianDayRef.current)
    const resetThreshold = config.speed * 50 // Allow jumps up to 50 frames worth of time

    if (julianDayDiff > resetThreshold) {
      // Reset trail on large time jumps (user scrubbing, not normal playback)
      setBodyTrail([position.clone()])
      const basePosition = new THREE.Vector3(position.x, -2.98, position.z)
      setFootprintTrail([basePosition])
      previousJulianDayRef.current = config.julianDay
      return
    }

    // Add current position to trail
    setBodyTrail((prev) => {
      const newTrail = [...prev, position.clone()]
      // Keep only the last maxLength positions
      if (newTrail.length > config.maxLength) {
        return newTrail.slice(newTrail.length - config.maxLength)
      }
      return newTrail
    })

    // Add current base position to footprint trail
    const basePosition = new THREE.Vector3(position.x, -2.98, position.z)
    setFootprintTrail((prev) => {
      const newTrail = [...prev, basePosition]
      // Keep only the last maxLength positions (footprint trail is typically shorter)
      const footprintMaxLength = Math.floor(config.maxLength / 3)
      if (newTrail.length > footprintMaxLength) {
        return newTrail.slice(newTrail.length - footprintMaxLength)
      }
      return newTrail
    })

    previousJulianDayRef.current = config.julianDay
  }, [position, config.julianDay, config.enabled, config.maxLength, config.speed])

  const clearTrails = () => {
    setBodyTrail([])
    setFootprintTrail([])
  }

  return {
    bodyTrail,
    footprintTrail,
    clearTrails,
  }
}

/**
 * Calculate maximum trail length based on speed
 * Ensures trails remain visually significant even at high speeds
 *
 * @param speed - Days per frame
 * @param baseLength - Base trail length (default: 225)
 * @param minLength - Minimum trail length (default: 75)
 * @returns Calculated maximum trail length
 */
export function calculateTrailLength(
  speed: number,
  baseLength: number = 225,
  minLength: number = 75
): number {
  // Use square root to give diminishing reduction
  // At 1 day/frame: 225 points
  // At 7 days/frame: ~85 points
  // At 30 days/frame: ~75 points (minimum)
  // At 365 days/frame: ~75 points (minimum)
  return Math.max(minLength, Math.round(baseLength / Math.sqrt(speed)))
}
