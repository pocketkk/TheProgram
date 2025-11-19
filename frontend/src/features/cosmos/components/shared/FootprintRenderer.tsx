import * as THREE from 'three'

export interface FootprintConfig {
  size: 'small' | 'standard' | 'large'
  showCompass?: boolean
  showRings?: boolean
  showCenter?: boolean
  color: string
  bodyColor?: string
  opacity?: number
}

export interface CompassMarker {
  id: string
  name: string
  position: THREE.Vector3
  color: string
}

export interface FootprintRendererProps {
  position: { x: number; y: number; z: number }
  config: FootprintConfig
  compassMarkers?: CompassMarker[]
}

export const FootprintRenderer: React.FC<FootprintRendererProps> = ({
  position,
  config,
  compassMarkers = [],
}) => {
  const {
    size,
    showCompass = false,
    showRings = true,
    showCenter = true,
    color,
    bodyColor,
    opacity = 0.6,
  } = config

  // Size configurations
  const sizeConfigs = {
    small: {
      outerRing: { inner: 0.34, outer: 0.36 },
      rings: [
        { inner: 0.06, outer: 0.08, opacity: 0.8 },
        { inner: 0.12, outer: 0.18, opacity: 0.5 },
        { inner: 0.22, outer: 0.3, opacity: 0.3 },
      ],
      center: 0.015,
    },
    standard: {
      outerRing: { inner: 0.52, outer: 0.54 },
      rings: [
        { inner: 0.06, outer: 0.08, opacity: 0.8 },
        { inner: 0.12, outer: 0.18, opacity: 0.5 },
        { inner: 0.22, outer: 0.3, opacity: 0.3 },
        { inner: 0.34, outer: 0.36, opacity: 0.15 },
      ],
      center: 0.015,
    },
    large: {
      outerRing: { inner: 0.72, outer: 0.76 },
      rings: [
        { inner: 0.25, outer: 0.3, opacity: 0.9 },
        { inner: 0.4, outer: 0.5, opacity: 0.6 },
        { inner: 0.6, outer: 0.7, opacity: 0.3 },
      ],
      center: 0.25,
    },
  }

  const sizeConfig = sizeConfigs[size]

  return (
    <group position={[position.x, -2.98, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer ring - main footprint indicator */}
      {showRings && (
        <>
          <mesh>
            <ringGeometry args={[sizeConfig.outerRing.inner, sizeConfig.outerRing.outer, 64]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer glow for ring */}
          <mesh>
            <ringGeometry
              args={[
                sizeConfig.outerRing.inner - 0.02,
                sizeConfig.outerRing.outer + 0.02,
                64,
              ]}
            />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity * 0.5}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Compass markers showing other planet positions */}
      {showCompass && compassMarkers.map((marker) => {
        // Calculate angle from Sun (origin) to marker planet
        const angleFromSun = Math.atan2(marker.position.z, marker.position.x)

        // Place marker on the outer ring at this angle
        const markerRadius = (sizeConfig.outerRing.inner + sizeConfig.outerRing.outer) / 2
        const x = Math.cos(angleFromSun) * markerRadius
        const y = Math.sin(angleFromSun) * markerRadius

        return (
          <group key={`compass-${marker.id}`}>
            {/* Planet marker dot */}
            <mesh position={[x, y, 0]}>
              <circleGeometry args={[0.03, 16]} />
              <meshBasicMaterial
                color={marker.color}
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Glow around marker */}
            <mesh position={[x, y, 0]}>
              <circleGeometry args={[0.06, 16]} />
              <meshBasicMaterial
                color={marker.color}
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })}

      {/* Concentric rings radiating from center */}
      {showRings && sizeConfig.rings.map((ring, index) => (
        <mesh key={`ring-${index}`}>
          <ringGeometry args={[ring.inner, ring.outer, 32]} />
          <meshBasicMaterial
            color={bodyColor || color}
            transparent
            opacity={ring.opacity}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Central glow disc */}
      {showCenter && (
        <mesh>
          <circleGeometry args={[sizeConfig.center, 16]} />
          <meshBasicMaterial
            color={bodyColor || color}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
