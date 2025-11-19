import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

export interface GlowLayerConfig {
  radiusMultiplier: number
  color: string | 'inherit'
  opacity: number
  segments?: number
  side?: THREE.Side
}

export interface GlowLayersProps {
  radius: number
  baseColor: string
  layers: GlowLayerConfig[]
  pulsing?: boolean
  pulseSpeed?: number
  pulseAmount?: number
}

export const GlowLayers: React.FC<GlowLayersProps> = ({
  radius,
  baseColor,
  layers,
  pulsing = false,
  pulseSpeed = 2,
  pulseAmount = 0.1,
}) => {
  const glowRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((state) => {
    if (pulsing) {
      const time = state.clock.getElapsedTime()
      const pulse = Math.sin(time * pulseSpeed) * pulseAmount + 1

      glowRefs.current.forEach((mesh) => {
        if (mesh) {
          mesh.scale.setScalar(pulse)
        }
      })
    }
  })

  return (
    <>
      {layers.map((layer, index) => {
        const layerColor = layer.color === 'inherit' ? baseColor : layer.color
        const layerRadius = radius * layer.radiusMultiplier
        const segments = layer.segments || 16
        const side = layer.side || THREE.BackSide

        return (
          <Sphere
            key={index}
            ref={(ref) => (glowRefs.current[index] = ref)}
            args={[layerRadius, segments, segments]}
          >
            <meshBasicMaterial
              color={layerColor}
              transparent
              opacity={layer.opacity}
              side={side}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </Sphere>
        )
      })}
    </>
  )
}

// Preset configurations for different body types
export const GLOW_PRESETS = {
  star: {
    layers: [
      { radiusMultiplier: 1.15, color: '#FFFF00', opacity: 0.6, segments: 32 },
      { radiusMultiplier: 1.35, color: '#FFA500', opacity: 0.3, segments: 32 },
      { radiusMultiplier: 1.6, color: '#FFD700', opacity: 0.15, segments: 24 },
    ],
    pulsing: true,
    pulseSpeed: 0.5,
    pulseAmount: 0.05,
  },
  planet: {
    layers: [
      { radiusMultiplier: 1.05, color: 'inherit' as const, opacity: 0.15, segments: 16 },
      { radiusMultiplier: 1.15, color: 'inherit' as const, opacity: 0.22, segments: 12 },
      { radiusMultiplier: 1.3, color: 'inherit' as const, opacity: 0.16, segments: 8 },
      { radiusMultiplier: 1.6, color: 'inherit' as const, opacity: 0.10, segments: 8 },
    ],
    pulsing: false,
  },
  satellite: {
    layers: [
      { radiusMultiplier: 1.15, color: 'inherit' as const, opacity: 0.2, segments: 12 },
      { radiusMultiplier: 1.4, color: 'inherit' as const, opacity: 0.12, segments: 8 },
    ],
    pulsing: false,
  },
} as const
