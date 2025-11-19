import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

export interface HighlightEffectProps {
  radius: number
  enabled: boolean
  color?: string
  pulseSpeed?: number
}

export const HighlightEffect: React.FC<HighlightEffectProps> = ({
  radius,
  enabled,
  color = '#00BFFF',
  pulseSpeed = 2,
}) => {
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (glowRef.current && enabled) {
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1 + 1
      glowRef.current.scale.setScalar(pulse)
    }
  })

  if (!enabled) {
    return null
  }

  return (
    <>
      {/* Inner bright highlight ring */}
      <Sphere args={[radius * 2.0, 16, 16]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Sphere>

      {/* Middle pulsing highlight ring */}
      <Sphere ref={glowRef} args={[radius * 2.5, 16, 16]}>
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Sphere>

      {/* Outer highlight glow */}
      <Sphere args={[radius * 3.0, 12, 12]}>
        <meshBasicMaterial
          color="#87CEEB"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Sphere>
    </>
  )
}
