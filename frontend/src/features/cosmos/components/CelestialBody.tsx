/**
 * Celestial Body Rendering Component
 *
 * This module provides the unified rendering component for all celestial bodies
 * in the cosmic visualizer (stars, planets, satellites). It consolidates what were
 * previously separate Sun, Planet, and Satellite components into a single,
 * feature-rich component.
 *
 * Key Features:
 * - Adaptive rendering based on body type (star/planet/satellite)
 * - Granular visibility controls for all visual elements
 * - Orbit visualization with trails and footprints
 * - Glow effects and corona for stars
 * - Ring systems for gas giants
 * - Interactive selection and highlighting
 * - Retrograde motion indicators
 * - Zodiac-based dynamic coloring
 *
 * @module CelestialBody
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Ring } from '@react-three/drei'
import * as THREE from 'three'

// Types
import type {
  CelestialBodyData,
  SceneContext,
  BodyVisibility,
  PositionOverride,
} from '../types'

// Hooks
import {
  useBodyPosition,
  useTrailSystem,
  useZodiacInfo,
  useDisplayRadius,
  calculateTrailLength,
} from '../hooks'

// Shared Components
import {
  GlowLayers,
  GLOW_PRESETS,
  TrailRenderer,
  ProjectionLine,
  BodyLabel,
  HighlightEffect,
  FootprintRenderer,
  OrbitPath,
  type CompassMarker,
} from './shared'

/**
 * Props for CelestialBody component
 *
 * @property data - Celestial body data with all physical and orbital properties
 * @property context - Scene-wide context (time, scale, reference frame)
 * @property visibility - Granular control over which features to render
 * @property override - Optional position override for geocentric mode
 * @property onClick - Callback when body is clicked
 * @property isHighlighted - Whether body is currently selected/highlighted
 * @property isRetrograde - Whether body is in retrograde motion
 * @property allPlanetPositions - Positions of all planets for compass footprints
 */
export interface CelestialBodyProps {
  /** Celestial body data (orbital parameters, visual properties) */
  data: CelestialBodyData
  /** Scene context (time, scale, reference frame) */
  context: SceneContext
  /** Visibility flags for rendering features */
  visibility: BodyVisibility
  /** Position override for geocentric mode (optional) */
  override?: PositionOverride | null
  /** Click handler for interactivity (optional) */
  onClick?: () => void
  /** Whether this body is currently highlighted (optional) */
  isHighlighted?: boolean
  /** Whether body is in retrograde motion (optional) */
  isRetrograde?: boolean
  /** All planet positions for footprint compass markers (optional) */
  allPlanetPositions?: CompassMarker[]
}

/**
 * Unified component for rendering all celestial bodies
 *
 * This component handles rendering of stars, planets, and satellites with full
 * visual features including orbits, trails, labels, glow effects, and special
 * effects like retrograde indicators.
 *
 * **Rendering Strategy:**
 * 1. Calculate 3D position using orbital mechanics
 * 2. Render orbital path (if visible and applicable)
 * 3. Render motion trails in 3D space and at base
 * 4. Render projection line from body to footprint
 * 5. Render main body mesh with appropriate material
 * 6. Add glow layers based on body type
 * 7. Add special effects (corona for stars, rings for planets)
 * 8. Render label and footprint
 *
 * **Performance Considerations:**
 * - Uses React.memo internally via useMemo hooks
 * - Animations run in useFrame (60fps)
 * - Trails are capped at calculated max length
 * - Visibility flags allow selective rendering
 *
 * @example
 * ```typescript
 * <CelestialBody
 *   data={earthData}
 *   context={sceneContext}
 *   visibility={{
 *     body: true,
 *     orbit: true,
 *     label: true,
 *     trail: false,
 *     footprint: true,
 *     projectionLine: true,
 *     glow: true,
 *     rings: false
 *   }}
 *   onClick={() => console.log('Earth clicked!')}
 *   isHighlighted={true}
 * />
 * ```
 */
export const CelestialBody: React.FC<CelestialBodyProps> = ({
  data,
  context,
  visibility,
  override = null,
  onClick,
  isHighlighted = false,
  isRetrograde = false,
  allPlanetPositions = [],
}) => {
  // Refs for animations
  const meshRef = useRef<THREE.Mesh>(null)
  const coronaRefs = useRef<(THREE.Mesh | null)[]>([])

  // Calculate position and zodiac info
  const { position, eclipticLongitude } = useBodyPosition(
    data,
    context,
    override
  )

  // Get zodiac color
  const { zodiacColor } = useZodiacInfo(
    eclipticLongitude,
    data.zodiacEnabled || false,
    data.color
  )

  // Calculate display radius
  const displayRadius = useDisplayRadius(data)

  // Manage trail system
  const maxTrailLength = calculateTrailLength(context.speed)
  const { bodyTrail, footprintTrail } = useTrailSystem(position, {
    enabled: visibility.trail,
    maxLength: maxTrailLength,
    speed: context.speed,
    julianDay: context.julianDay,
  })

  // Animation loop
  useFrame((state) => {
    // Rotate body based on rotation period
    if (meshRef.current && data.rotationPeriod > 0) {
      meshRef.current.rotation.y += 0.01 / data.rotationPeriod
    }

    // Animate corona layers for stars
    if (data.type === 'star' && data.hasCorona) {
      const time = state.clock.getElapsedTime()
      coronaRefs.current.forEach((ref, index) => {
        if (ref) {
          const speed = 0.5 - index * 0.1
          const amount = 0.05 + index * 0.03
          ref.scale.setScalar(1 + Math.sin(time * speed) * amount)
        }
      })
    }
  })

  // Determine glow preset based on body type
  const glowPresetKey = data.type === 'star'
    ? 'star'
    : data.type === 'satellite'
    ? 'satellite'
    : 'planet'
  const glowPreset = GLOW_PRESETS[glowPresetKey]

  // Determine glow color (zodiac for planets, base color for others)
  const glowColor = data.zodiacEnabled && zodiacColor ? zodiacColor : data.color

  // Footprint color (zodiac for enabled, body color otherwise)
  const footprintColor = data.zodiacEnabled && zodiacColor ? zodiacColor : data.color

  // Footprint size based on body type
  const footprintSize = data.type === 'star' ? 'large' : 'standard'

  return (
    <group>
      {/* Orbital path */}
      {visibility.orbit && data.orbitRadius > 0 && !override && (
        <OrbitPath
          orbitRadius={data.orbitRadius}
          inclination={data.inclination}
          scale={context.scale}
          color={data.color}
          opacity={0.2}
        />
      )}

      {/* Motion trail in 3D space */}
      {visibility.trail && bodyTrail.length > 1 && (
        <TrailRenderer
          positions={bodyTrail}
          color={glowColor}
          opacity={0.7}
          fadeEffect={true}
        />
      )}

      {/* Footprint trail at base */}
      {visibility.trail && visibility.footprint && footprintTrail.length > 1 && (
        <TrailRenderer
          positions={footprintTrail}
          color={glowColor}
          opacity={0.7}
          fadeEffect={true}
        />
      )}

      {/* Projection line from body to footprint */}
      {visibility.projectionLine && visibility.footprint && (
        <ProjectionLine
          startPosition={position}
          endPosition={{ x: position.x, y: -3, z: position.z }}
          color={footprintColor}
          bodyRadius={displayRadius}
          opacity={data.type === 'star' ? 0.7 : 0.4}
        />
      )}

      {/* Main body group */}
      {visibility.body && (
        <group position={position}>
          {/* Core sphere */}
          <Sphere
            ref={meshRef}
            args={[displayRadius, 32, 32]}
            onClick={onClick}
            onPointerOver={(e) => {
              if (onClick) {
                e.stopPropagation()
                document.body.style.cursor = 'pointer'
              }
            }}
            onPointerOut={() => {
              if (onClick) {
                document.body.style.cursor = 'auto'
              }
            }}
          >
            {/* Material varies by type */}
            {data.materialType === 'basic' || data.type === 'star' ? (
              <meshBasicMaterial
                color={data.color}
                toneMapped={false}
              />
            ) : (
              <meshStandardMaterial
                color={data.color}
                roughness={data.roughness || 0.7}
                metalness={data.metalness || 0.2}
                emissive={data.color}
                emissiveIntensity={(data.emissiveIntensity || 0.1) * 2.5}
                envMapIntensity={0.8}
              />
            )}
          </Sphere>

          {/* Glow layers */}
          {visibility.glow && (
            <GlowLayers
              radius={displayRadius}
              baseColor={isRetrograde ? '#FF6347' : glowColor}
              layers={[...glowPreset.layers]}
              pulsing={glowPreset.pulsing}
              pulseSpeed={'pulseSpeed' in glowPreset ? glowPreset.pulseSpeed : undefined}
              pulseAmount={'pulseAmount' in glowPreset ? glowPreset.pulseAmount : undefined}
            />
          )}

          {/* Corona effect for stars */}
          {data.type === 'star' && data.hasCorona && (
            <>
              {/* Extended warm halo */}
              <Sphere
                ref={(ref) => (coronaRefs.current[0] = ref)}
                args={[displayRadius * 1.6, 24, 24]}
              >
                <meshBasicMaterial
                  color="#FFD700"
                  transparent
                  opacity={0.15}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </Sphere>

              {/* Point lights for stars */}
              <pointLight
                position={[0, 0, 0]}
                intensity={1.5}
                distance={50}
                color="#FFFACD"
                decay={1.5}
              />
              <pointLight
                position={[0, 0, 0]}
                intensity={0.8}
                distance={80}
                color="#FFE87C"
                decay={2}
              />
            </>
          )}

          {/* Ring system for planets */}
          {visibility.rings && data.hasRings && data.ringData && (
            <group rotation-x={Math.PI / 2}>
              {data.ringData.map((ring) => (
                <Ring
                  key={`ring-${ring.innerRadius}-${ring.outerRadius}`}
                  args={[
                    displayRadius * ring.innerRadius,
                    displayRadius * ring.outerRadius,
                    ring.segments || 32,
                  ]}
                >
                  <meshBasicMaterial
                    color={ring.color}
                    transparent
                    opacity={ring.opacity}
                    side={THREE.DoubleSide}
                  />
                </Ring>
              ))}
            </group>
          )}

          {/* Retrograde indicator */}
          {isRetrograde && (
            <Sphere args={[displayRadius * 1.8, 8, 8]}>
              <meshBasicMaterial
                color="#FF6B6B"
                transparent
                opacity={0.2}
                side={THREE.BackSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </Sphere>
          )}

          {/* Highlight effect when selected */}
          <HighlightEffect
            radius={displayRadius}
            enabled={isHighlighted}
          />

          {/* Label */}
          {visibility.label && (
            <BodyLabel
              name={data.name}
              radius={displayRadius}
              isRetrograde={isRetrograde}
            />
          )}
        </group>
      )}

      {/* Footprint at base of zodiac bowl */}
      {visibility.footprint && context.showFootprints && (
        <FootprintRenderer
          position={{ x: position.x, y: -2.98, z: position.z }}
          config={{
            size: footprintSize,
            showCompass: data.type === 'planet',
            showRings: true,
            showCenter: true,
            color: footprintColor,
            bodyColor: data.color,
            opacity: data.type === 'star' ? 0.8 : 0.6,
          }}
          compassMarkers={data.type === 'planet' ? allPlanetPositions : []}
        />
      )}
    </group>
  )
}
