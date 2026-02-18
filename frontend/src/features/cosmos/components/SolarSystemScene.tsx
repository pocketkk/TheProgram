/**
 * Solar System Scene - Main Visualization Component
 *
 * This module provides the top-level scene component that orchestrates the entire
 * cosmic visualization. It manages camera controls, reference frame switching,
 * body rendering, astrological overlays, and user interactions.
 *
 * Key Responsibilities:
 * - Scene setup (Three.js Canvas, camera, lighting)
 * - Reference frame management (heliocentric/geocentric)
 * - Camera mode control (default orbital view, Earth perspective view)
 * - Body visibility and interaction management
 * - Astrological feature overlays (aspects, houses, natal charts)
 * - Zodiac ring and footprint system
 *
 * @module SolarSystemScene
 */

import { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei'
import * as THREE from 'three'
import { CelestialBody } from './CelestialBody'
import { ZodiacRing3D } from './ZodiacRing3D'
import { EnhancedStarfield } from './EnhancedStarfield'
import { AspectLines } from './AspectLines'
import { HouseSystem } from './HouseSystem'
import { EclipticRuler } from './EclipticRuler'
import { NatalPlanetOverlay } from './NatalPlanetOverlay'
import { TransitAspectLines } from './TransitAspectLines'
import { PlanetKey } from './PlanetKey'
import { FootprintConnections } from './FootprintConnections'
import { celestialBodies } from '../data'
import { getRetrogradeStatus, calculatePlanetPosition, calculateAllGeocentricPositions } from '@/lib/astronomy/planetaryData'
import { BirthChart } from '@/lib/astronomy/birthChart'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { BodyVisibility, SceneContext, PositionOverride } from '../types'
import type { CompassMarker } from './shared'
import { BODY_SCALE_MULTIPLIERS, ANIMATION_CONSTANTS } from '../constants'

/**
 * Camera Controller for smooth transitions to Earth view
 *
 * Manages camera positioning and behavior for two distinct view modes:
 * - Default: Orbital camera with full 3D controls
 * - Earth: First-person view from Earth's perspective looking at the zodiac
 *
 * In Earth view, the camera is locked to Earth's position on the ecliptic plane,
 * allowing horizontal rotation to look around the zodiac circle while maintaining
 * a horizon-level perspective.
 */
interface CameraControllerProps {
  mode: 'default' | 'earth'
  earthPosition: THREE.Vector3
  controlsRef: React.RefObject<any>
}

const CameraController = ({ mode, earthPosition, controlsRef }: CameraControllerProps) => {
  const { camera, gl } = useThree()
  const isTransitioning = useRef(false)
  const previousMode = useRef(mode)
  const targetDistance = useRef(10) // Distance to look target in Earth view
  const isDragging = useRef(false)
  const previousMouseX = useRef(0)
  const rotationAngle = useRef(0) // Current rotation angle in radians

  // Default view parameters
  const defaultPosition = useMemo(() => new THREE.Vector3(0, 15, 15), [])
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  // Detect mode change and start transition
  useEffect(() => {
    if (mode !== previousMode.current) {
      isTransitioning.current = true
      previousMode.current = mode

      if (!controlsRef.current) return
      const controls = controlsRef.current

      if (mode === 'earth') {
        // Initialize Earth view: camera at Earth, looking at a point in the distance
        camera.position.set(earthPosition.x, 0, earthPosition.z)

        // Set initial rotation to 0 (looking in the direction of Aries/0°)
        rotationAngle.current = 0

        // Set initial target to look in the direction of Aries (0°)
        controls.target.set(earthPosition.x + targetDistance.current, 0, earthPosition.z)
        controls.update()
      }
    }
  }, [mode, earthPosition, camera, controlsRef])

  // Configure controls based on mode
  useEffect(() => {
    if (!controlsRef.current) return

    const controls = controlsRef.current

    if (mode === 'earth') {
      // For Earth view: disable orbit controls, we'll handle rotation manually
      controls.enableRotate = false
      controls.enablePan = false
      controls.minPolarAngle = Math.PI / 2 // Lock to horizon
      controls.maxPolarAngle = Math.PI / 2 // Lock to horizon
      controls.enableZoom = true
    } else {
      // Restore full controls for default view
      controls.enableRotate = true
      controls.enablePan = true
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI
      controls.enableZoom = true
    }
  }, [mode, controlsRef])

  // Custom mouse handling for Earth view rotation
  useEffect(() => {
    if (mode !== 'earth') return

    const canvas = gl.domElement

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true
      previousMouseX.current = e.clientX
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return

      const deltaX = e.clientX - previousMouseX.current
      previousMouseX.current = e.clientX

      // Rotate view based on mouse movement (sensitivity: 0.01 radians per pixel)
      rotationAngle.current -= deltaX * 0.01
    }

    const handleMouseUp = () => {
      isDragging.current = false
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [mode, gl])

  useFrame((_state, delta) => {
    if (!controlsRef.current) return

    const controls = controlsRef.current

    if (mode === 'earth') {
      // Keep camera locked at Earth's position on ecliptic plane
      camera.position.set(earthPosition.x, 0, earthPosition.z)

      // Calculate target position based on rotation angle
      // Target is on the ecliptic plane, at a fixed distance from Earth
      const targetX = earthPosition.x + Math.cos(rotationAngle.current) * targetDistance.current
      const targetZ = earthPosition.z + Math.sin(rotationAngle.current) * targetDistance.current

      controls.target.set(targetX, 0, targetZ)
      controls.update()
    } else {
      if (isTransitioning.current) {
        // Only transition back to default view if we just switched modes
        const positionDiff = camera.position.distanceTo(defaultPosition)
        const targetDiff = controls.target.distanceTo(defaultTarget)

        if (positionDiff < 0.1 && targetDiff < 0.1) {
          // Transition complete
          isTransitioning.current = false
          camera.position.copy(defaultPosition)
          controls.target.copy(defaultTarget)
        } else {
          // Smoothly transition
          camera.position.lerp(defaultPosition, Math.min(delta * 2, 0.1))
          controls.target.lerp(defaultTarget, Math.min(delta * 2, 0.1))
        }
        controls.update()
      }
    }
  })

  return null
}

/**
 * Cinematic Camera Controller
 *
 * When `targetId` is set, smoothly lerps the camera to a dramatic close-up
 * of the named planet. When `targetId` is null, eases the camera back to the
 * default overview position. OrbitControls are disabled while active.
 */
interface CinematicCameraControllerProps {
  targetId: string | null | undefined   // undefined = cinematic inactive
  planetPositions: CompassMarker[]
  controlsRef: React.RefObject<any>
  cameraLocked: boolean
}

const CinematicCameraController = ({
  targetId,
  planetPositions,
  controlsRef,
  cameraLocked,
}: CinematicCameraControllerProps) => {
  const { camera } = useThree()
  const lerpedCamPos = useRef(new THREE.Vector3(0, 15, 15))
  const lerpedLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const orbitTimeRef = useRef(0)
  const isActive = targetId !== undefined

  // Reset orbit clock whenever we enter orbit mode
  useEffect(() => {
    if (targetId === '__orbit__') {
      orbitTimeRef.current = 0
    }
  }, [targetId])

  useFrame((_state, delta) => {
    if (!controlsRef.current || !isActive) return
    const controls = controlsRef.current
    controls.enabled = false

    let desiredCamPos: THREE.Vector3
    let desiredLookAt: THREE.Vector3

    if (targetId === '__orbit__') {
      // ── Slow majestic orbit around the solar system ──────────────────────
      orbitTimeRef.current += delta

      const t = orbitTimeRef.current
      const RADIUS      = 24                         // distance from origin
      const AZ_SPEED    = (Math.PI / 180) * 5        // 5°/s → full circle in 72 s
      const BASE_AZ     = Math.PI / 4                // start at 45° (near default)
      const BASE_ELEV   = (Math.PI / 180) * 28       // 28° base elevation
      const ELEV_AMP    = (Math.PI / 180) * 18       // ±18° gentle dip & rise
      const ELEV_PERIOD = 0.08                       // slow sine period

      const azimuth   = BASE_AZ + t * AZ_SPEED
      const elevation = BASE_ELEV + Math.sin(t * ELEV_PERIOD) * ELEV_AMP

      desiredCamPos = new THREE.Vector3(
        RADIUS * Math.cos(elevation) * Math.cos(azimuth),
        RADIUS * Math.sin(elevation),
        RADIUS * Math.cos(elevation) * Math.sin(azimuth),
      )
      desiredLookAt = new THREE.Vector3(0, 0, 0)

    } else if (targetId !== null) {
      // ── Planet close-up ──────────────────────────────────────────────────
      const marker = planetPositions.find(p => p.id === targetId)
      const planetPos = marker ? marker.position.clone() : new THREE.Vector3(0, 0, 0)

      const dirToSun = planetPos.length() > 0.3
        ? planetPos.clone().normalize().negate()
        : new THREE.Vector3(0, 0, 1)

      const dist = targetId === 'sun' ? 7 : Math.max(planetPos.length() * 0.55, 3)
      desiredCamPos = planetPos.clone()
        .add(dirToSun.multiplyScalar(dist))
        .add(new THREE.Vector3(0, dist * 0.45, 0))
      desiredLookAt = planetPos

    } else {
      // ── Pull back to overview ─────────────────────────────────────────────
      desiredCamPos = new THREE.Vector3(0, 15, 15)
      desiredLookAt = new THREE.Vector3(0, 0, 0)
    }

    const alpha = Math.min(delta * 3.5, 0.12)
    lerpedCamPos.current.lerp(desiredCamPos, alpha)
    lerpedLookAt.current.lerp(desiredLookAt, alpha)

    camera.position.copy(lerpedCamPos.current)
    controls.target.copy(lerpedLookAt.current)
    controls.update()
  })

  // Re-enable controls when cinematic ends
  useEffect(() => {
    if (targetId === undefined && controlsRef.current) {
      controlsRef.current.enabled = !cameraLocked
      controlsRef.current.update()
      lerpedCamPos.current.copy(camera.position)
      lerpedLookAt.current.copy(controlsRef.current.target)
    }
  }, [targetId, controlsRef, cameraLocked, camera])

  return null
}

/**
 * Cinematic Planet Highlight — corner-bracket targeting reticle
 *
 * Renders an HTML overlay at the planet's 3D position using drei's Html.
 * Four corner brackets in the planet's color create a classic HUD reticle
 * that frames the planet without covering it.
 */
const CinematicPlanetHighlight = ({
  targetId,
  planetPositions,
  color,
}: {
  targetId: string
  planetPositions: CompassMarker[]
  color: string
}) => {
  const marker = planetPositions.find(p => p.id === targetId)
  if (!marker) return null

  const c = color || '#ffffff'
  const glow = `0 0 10px ${c}aa`

  const cornerStyle = (pos: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: 18,
    height: 18,
    ...pos,
    boxShadow: glow,
  })

  return (
    <Html
      position={[marker.position.x, marker.position.y, marker.position.z]}
      center
      distanceFactor={9}
      zIndexRange={[50, 0]}
      style={{ pointerEvents: 'none' }}
    >
      {/* Outer reticle */}
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        {/* TL */}
        <div style={cornerStyle({ top: 0, left: 0, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` })} />
        {/* TR */}
        <div style={cornerStyle({ top: 0, right: 0, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` })} />
        {/* BL */}
        <div style={cornerStyle({ bottom: 0, left: 0, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` })} />
        {/* BR */}
        <div style={cornerStyle({ bottom: 0, right: 0, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` })} />

        {/* Center crosshair dot */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 5, height: 5,
          borderRadius: '50%',
          background: c,
          boxShadow: `0 0 12px 3px ${c}88`,
        }} />
      </div>
    </Html>
  )
}

interface SolarSystemSceneProps {
  julianDay: number
  showAspects?: boolean
  showPatterns?: boolean
  showHouses?: boolean
  showFootprints?: boolean
  showFootprintConnections?: boolean
  visiblePlanets?: Record<string, boolean>
  visiblePlanetFootprints?: Record<string, boolean>
  visiblePlanetOrbits?: Record<string, boolean>
  visiblePlanetLabels?: Record<string, boolean>
  visiblePlanetTrails?: Record<string, boolean>
  visiblePlanetToFootprintLines?: Record<string, boolean>
  showSunFootprint?: boolean
  showSunToFootprintLine?: boolean
  cameraMode?: 'default' | 'earth'
  referenceFrame?: 'heliocentric' | 'geocentric'
  zodiacBrightness?: number
  zodiacGlowRadius?: number
  stadiumOpacity?: number
  showBackground?: boolean
  birthChart?: BirthChart | null
  showNatalOverlay?: boolean
  showTransitAspects?: boolean
  onPlanetClick?: (planetName: string) => void
  speed?: number // Days per frame for trail length adjustment
  cameraLocked?: boolean // Camera lock state
  resetCameraTrigger?: number // Increment to trigger camera reset
  cinematicTargetId?: string | null // Which planet to focus on in cinematic mode (undefined = inactive)
  cinematicColor?: string           // Planet accent color for the targeting reticle
}

/**
 * Frame counter component for retrograde throttling
 * Moved outside SolarSystemScene to prevent re-creation on every render
 */
const FrameCounter = ({ onFrame }: { onFrame: () => void }) => {
  useFrame(() => {
    onFrame()
  })
  return null
}

export const SolarSystemScene = ({
  julianDay,
  showAspects = true,
  showPatterns = true,
  showHouses = false,
  showFootprints = true,
  showFootprintConnections = false,
  visiblePlanets = {},
  visiblePlanetFootprints = {},
  visiblePlanetOrbits = {},
  visiblePlanetLabels = {},
  visiblePlanetTrails = {},
  visiblePlanetToFootprintLines = {},
  showSunFootprint = true,
  showSunToFootprintLine = true,
  cameraMode = 'default',
  referenceFrame = 'heliocentric',
  zodiacBrightness = 1.0,
  zodiacGlowRadius = 1.0,
  stadiumOpacity = 0.5,
  showBackground = true,
  birthChart = null,
  showNatalOverlay = false,
  showTransitAspects = false,
  onPlanetClick,
  speed = 1,
  cameraLocked = true,
  resetCameraTrigger = 0,
  cinematicTargetId = undefined,
  cinematicColor = '#ffffff',
}: SolarSystemSceneProps) => {
  const controlsRef = useRef<any>(null)
  const [selectedPlanets, setSelectedPlanets] = useState<string[]>([])

  // Frame counter and cached retrograde status for throttling
  const [frameCount, setFrameCount] = useState(0)
  const [cachedRetrogradeStatus, setCachedRetrogradeStatus] = useState<Record<string, boolean>>({})

  const handlePlanetClick = (planetName: string) => {
    onPlanetClick?.(planetName)
  }

  const handlePlanetSelect = (planetName: string) => {
    // Toggle selection - if already selected, deselect
    const isCurrentlySelected = selectedPlanets.includes(planetName)

    if (isCurrentlySelected) {
      setSelectedPlanets(prev => prev.filter(p => p !== planetName))
    } else {
      setSelectedPlanets(prev => [...prev, planetName])
    }

    // Always trigger planet click to toggle panel
    handlePlanetClick(planetName)
  }

  // Update retrograde status every N frames (throttled)
  useEffect(() => {
    // Only recalculate on interval frames to avoid performance hit
    if (frameCount % ANIMATION_CONSTANTS.RETROGRADE_CHECK_INTERVAL === 0) {
      const newStatus = getRetrogradeStatus(julianDay)
      setCachedRetrogradeStatus(newStatus)
    }
  }, [julianDay, frameCount])

  // Use cached retrograde status
  const retrogradeStatus = cachedRetrogradeStatus

  // Scale factor for visibility (AU to scene units)
  const baseScale = 2

  // Scale multipliers for outer planets (imported from constants)
  const scaleMultipliers = BODY_SCALE_MULTIPLIERS

  // Calculate Earth's position for camera following
  const earthPosition = useMemo(() => {
    const earthData = celestialBodies.find(b => b.id === 'earth')
    if (!earthData) return new THREE.Vector3(0, 0, 0)

    const pos = calculatePlanetPosition({
      name: earthData.name,
      color: earthData.color,
      radius: earthData.radius,
      orbitRadius: earthData.orbitRadius,
      orbitPeriod: earthData.orbitPeriod,
      inclination: earthData.inclination,
      rotationPeriod: earthData.rotationPeriod,
      symbol: earthData.symbol || '',
    }, julianDay)
    return new THREE.Vector3(pos.x * baseScale, pos.y, pos.z * baseScale)
  }, [julianDay, baseScale])

  // Zodiac ring rotation - should remain fixed regardless of reference frame
  // The zodiac represents the fixed celestial sphere and doesn't rotate with Earth
  const zodiacRotationOffset = 0

  // Calculate geocentric positions when in geocentric reference frame
  const geocentricPositions = useMemo(() => {
    if (referenceFrame === 'geocentric') {
      return calculateAllGeocentricPositions(julianDay)
    }
    return null
  }, [referenceFrame, julianDay])

  // Create scene context for all celestial bodies
  const sceneContext: SceneContext = useMemo(() => ({
    julianDay,
    speed,
    referenceFrame,
    scale: baseScale,
    showFootprints,
  }), [julianDay, speed, referenceFrame, baseScale, showFootprints])

  /**
   * Get visibility configuration for a specific body
   *
   * Constructs a BodyVisibility object from the various visibility prop records
   * (visiblePlanets, visiblePlanetOrbits, etc.). Applies special logic for:
   * - Sun's orbit (doesn't exist in heliocentric mode)
   * - Sun's trail (doesn't move in heliocentric mode)
   * - Orbit visibility in geocentric mode (hides all orbits)
   *
   * @param bodyId - Body identifier (e.g., 'earth', 'mars')
   * @returns Complete visibility configuration for the body
   */
  const getBodyVisibility = (bodyId: string): BodyVisibility => {
    // All bodies (including Sun) now use unified visibility controls
    return {
      body: visiblePlanets[bodyId] !== false,
      orbit: (visiblePlanetOrbits[bodyId] ?? true) && referenceFrame !== 'geocentric' && bodyId !== 'sun', // Sun has no orbit
      label: visiblePlanetLabels[bodyId] ?? true,
      trail: bodyId === 'sun' ? false : (visiblePlanetTrails[bodyId] ?? false), // Sun doesn't move in heliocentric
      footprint: showFootprints && ((visiblePlanetFootprints[bodyId] ?? (bodyId === 'sun' ? showSunFootprint : true))),
      projectionLine: visiblePlanetToFootprintLines[bodyId] ?? (bodyId === 'sun' ? showSunToFootprintLine : true),
      glow: true,
      rings: true,
    }
  }

  /**
   * Get position override for geocentric mode
   *
   * In geocentric mode, all body positions are pre-computed relative to Earth
   * at the origin. This function retrieves those pre-computed positions when
   * available.
   *
   * @param bodyId - Body identifier
   * @returns Position override if in geocentric mode, null otherwise
   */
  const getPositionOverride = (bodyId: string): PositionOverride | null => {
    if (referenceFrame === 'geocentric' && geocentricPositions) {
      const pos = geocentricPositions[bodyId]
      if (pos) {
        return {
          x: pos.x,
          y: pos.y,
          z: pos.z,
          mode: 'geocentric',
        }
      }
    }
    return null
  }

  // Calculate all planet 3D positions for compass footprints
  const allPlanetPositions: CompassMarker[] = useMemo(() => {
    return celestialBodies
      .filter(body => body.type === 'planet' || body.type === 'star')
      .map(body => {
        const bodyScale = baseScale * (scaleMultipliers[body.id] || 1.0)
        const override = getPositionOverride(body.id)

        let pos: THREE.Vector3
        if (override) {
          pos = new THREE.Vector3(
            override.x * bodyScale,
            override.y * bodyScale,
            override.z * bodyScale
          )
        } else if (body.id === 'sun') {
          pos = new THREE.Vector3(0, 0, 0)
        } else {
          const position = calculatePlanetPosition({
            name: body.name,
            color: body.color,
            radius: body.radius,
            orbitRadius: body.orbitRadius,
            orbitPeriod: body.orbitPeriod,
            inclination: body.inclination,
            rotationPeriod: body.rotationPeriod,
            symbol: body.symbol || '',
          }, julianDay)
          pos = new THREE.Vector3(
            position.x * bodyScale,
            position.y * bodyScale,
            position.z * bodyScale
          )
        }

        return {
          id: body.id,
          name: body.name,
          position: pos,
          color: body.color,
        }
      })
  }, [celestialBodies, julianDay, referenceFrame, geocentricPositions, baseScale])

  // Effect to update OrbitControls based on cameraLocked state
  // Only applies when not in Earth view mode or cinematic mode
  useEffect(() => {
    if (!controlsRef.current || cameraMode === 'earth' || cinematicTargetId !== undefined) return

    const controls = controlsRef.current
    controls.enabled = !cameraLocked
    controls.update()
  }, [cameraLocked, cameraMode, cinematicTargetId])

  // Effect to reset camera position when resetCameraTrigger changes
  useEffect(() => {
    if (!controlsRef.current || resetCameraTrigger === 0 || cinematicTargetId !== undefined) return

    const controls = controlsRef.current

    // Reset to default position
    controls.object.position.set(0, 15, 15)
    controls.target.set(0, 0, 0)
    controls.update()
  }, [resetCameraTrigger, cinematicTargetId])

  // Callback for frame counter to prevent re-creation
  const incrementFrameCount = useCallback(() => {
    setFrameCount(prev => prev + 1)
  }, [])

  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 15, 15]} fov={60} />

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={cameraMode === 'earth' ? 0.5 : 5}
          maxDistance={50}
          zoomSpeed={0.5}
        />

        {/* Camera Controller for Earth view */}
        <CameraController
          mode={cameraMode}
          earthPosition={earthPosition}
          controlsRef={controlsRef}
        />

        {/* Cinematic camera — active only during demo mode */}
        {cinematicTargetId !== undefined && (
          <CinematicCameraController
            targetId={cinematicTargetId}
            planetPositions={allPlanetPositions}
            controlsRef={controlsRef}
            cameraLocked={cameraLocked}
          />
        )}

        {/* Cinematic targeting reticle — corner brackets around featured planet */}
        {cinematicTargetId !== undefined && cinematicTargetId !== null && cinematicTargetId !== '__orbit__' && (
          <CinematicPlanetHighlight
            targetId={cinematicTargetId}
            planetPositions={allPlanetPositions}
            color={cinematicColor}
          />
        )}

        {/* Frame counter for retrograde throttling */}
        <FrameCounter onFrame={incrementFrameCount} />

        {/* Advanced Lighting Setup */}
        {/* Ambient light - very subtle base illumination */}
        <ambientLight intensity={0.02} color="#1a1a3e" />

        {/* Hemisphere light for realistic sky/ground lighting */}
        <hemisphereLight
          args={['#87CEEB', '#1a1a2e', 0.3]}
          position={[0, 50, 0]}
        />

        {/* Directional light from Sun - simulates sunlight */}
        <directionalLight
          position={[0, 0, 0]}
          intensity={2}
          color="#FFF8DC"
          castShadow={false}
        />

        {/* Rim light for planets - helps separate from background */}
        <directionalLight
          position={[10, 10, 10]}
          intensity={0.3}
          color="#6495ED"
        />

        {/* Back light for depth */}
        <directionalLight
          position={[-10, -5, -10]}
          intensity={0.2}
          color="#4169E1"
        />

        {/* Enhanced Starfield */}
        <Suspense fallback={null}>
          <EnhancedStarfield />
        </Suspense>

        {/* Render all celestial bodies using unified component */}
        {celestialBodies.map(body => {
          // Skip Moon - it needs special parent positioning
          if (body.id === 'moon') return null

          const bodyScale = baseScale * (scaleMultipliers[body.id] || 1.0)
          const visibility = getBodyVisibility(body.id)
          const override = getPositionOverride(body.id)

          // Create scene context with body-specific scale
          const bodyContext: SceneContext = {
            ...sceneContext,
            scale: bodyScale,
          }

          return (
            <CelestialBody
              key={body.id}
              data={body}
              context={bodyContext}
              visibility={visibility}
              override={override}
              onClick={() => handlePlanetSelect(body.id)}
              isHighlighted={selectedPlanets.includes(body.id)}
              isRetrograde={retrogradeStatus[body.id] || false}
              allPlanetPositions={allPlanetPositions}
            />
          )
        })}

        {/* Moon - special handling for satellite with parent positioning */}
        {(() => {
          const moon = celestialBodies.find(b => b.id === 'moon')
          if (!moon) return null

          // Moon visibility is controlled by Earth's settings
          const moonVisibility: BodyVisibility = {
            body: true,
            orbit: (visiblePlanetOrbits.earth ?? true) && referenceFrame !== 'geocentric',
            label: visiblePlanetLabels.earth ?? true,
            trail: false,
            footprint: false,
            projectionLine: false,
            glow: true,
            rings: false,
          }

          // Moon needs a custom position override that accounts for parent position
          // This would need to be calculated in the CelestialBody component
          // For now, we'll use a simplified approach
          // Note: Moon positioning is handled by useBodyPosition hook with parentId

          return (
            <CelestialBody
              key={moon.id}
              data={moon}
              context={{
                ...sceneContext,
                scale: baseScale,
              }}
              visibility={moonVisibility}
              onClick={() => handlePlanetClick('moon')}
              isHighlighted={selectedPlanets.includes('moon')}
            />
          )
        })()}

        {/* Footprint Connection Lines */}
        <FootprintConnections
          planetPositions={allPlanetPositions}
          julianDay={julianDay}
          show={showFootprintConnections}
        />

        {/* Astrological Aspect Lines and Patterns */}
        <AspectLines
          julianDay={julianDay}
          scale={baseScale}
          showAspects={showAspects}
          showPatterns={showPatterns}
          referenceFrame={referenceFrame}
          planetPositions={allPlanetPositions}
        />

        {/* Natal Planet Overlay */}
        {birthChart && showNatalOverlay && (
          <NatalPlanetOverlay
            natalPlanets={birthChart.planets}
            scale={baseScale}
            opacity={0.6}
          />
        )}

        {/* Transit-to-Natal Aspect Lines */}
        {birthChart && showTransitAspects && showNatalOverlay && (
          <TransitAspectLines
            julianDay={julianDay}
            natalPlanets={birthChart.planets}
            scale={baseScale}
            enabled={true}
          />
        )}

        {/* 3D Zodiac Ring */}
        <ZodiacRing3D
          zodiacBrightness={zodiacBrightness}
          zodiacGlowRadius={zodiacGlowRadius}
          stadiumOpacity={stadiumOpacity}
          showBackground={showBackground}
          rotationOffset={zodiacRotationOffset}
        />

        {/* Astrological House System */}
        <HouseSystem julianDay={julianDay} showHouses={showHouses} houseSystem="equal" />

        {/* Ecliptic Ruler Overlay - only in Earth view */}
        {cameraMode === 'earth' && (
          <Html fullscreen>
            <EclipticRuler earthPosition={earthPosition} />
          </Html>
        )}

        {/* Post-processing effects - Enhanced bloom */}
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.7}
            mipmapBlur
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>

      {/* Planet Key UI Overlay */}
      <PlanetKey
        selectedPlanets={selectedPlanets}
        onPlanetSelect={handlePlanetSelect}
      />
    </div>
  )
}
