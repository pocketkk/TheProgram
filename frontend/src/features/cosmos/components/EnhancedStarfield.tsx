import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const EnhancedStarfield = () => {
  const starsRef1 = useRef<THREE.Points>(null)
  const starsRef2 = useRef<THREE.Points>(null)
  const starsRef3 = useRef<THREE.Points>(null)

  // Generate star positions with varying densities
  const { positions1, colors1, sizes1 } = useMemo(() => {
    const count = 3000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const radius = 100 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Star colors - warm to cool
      const temp = Math.random()
      if (temp > 0.8) {
        // Blue-white (hot stars)
        colors[i * 3] = 0.8 + Math.random() * 0.2
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 2] = 1.0
      } else if (temp > 0.5) {
        // White (medium stars)
        colors[i * 3] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1
      } else {
        // Yellow-red (cool stars)
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.3
      }

      sizes[i] = 0.5 + Math.random() * 1.5
    }

    return { positions1: positions, colors1: colors, sizes1: sizes }
  }, [])

  // Distant stars layer
  const { positions2, colors2, sizes2 } = useMemo(() => {
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 150 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      colors[i * 3] = 0.7 + Math.random() * 0.3
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2

      sizes[i] = 0.2 + Math.random() * 0.8
    }

    return { positions2: positions, colors2: colors, sizes2: sizes }
  }, [])

  // Very distant stars (background)
  const { positions3, colors3, sizes3 } = useMemo(() => {
    const count = 5000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 250 + Math.random() * 150
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      colors[i * 3] = 0.5 + Math.random() * 0.3
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3
      colors[i * 3 + 2] = 0.6 + Math.random() * 0.3

      sizes[i] = 0.1 + Math.random() * 0.5
    }

    return { positions3: positions, colors3: colors, sizes3: sizes }
  }, [])

  // Twinkling animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    if (starsRef1.current) {
      const material = starsRef1.current.material as THREE.PointsMaterial
      material.opacity = 0.8 + Math.sin(time * 0.5) * 0.1
    }

    if (starsRef2.current) {
      starsRef2.current.rotation.y = time * 0.01
    }

    if (starsRef3.current) {
      starsRef3.current.rotation.y = time * 0.005
    }
  })

  return (
    <group>
      {/* Near stars with parallax */}
      <points ref={starsRef1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions1.length / 3}
            array={positions1}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors1.length / 3}
            array={colors1}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sizes1.length}
            array={sizes1}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.8}
          vertexColors={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Mid-distance stars */}
      <points ref={starsRef2}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions2.length / 3}
            array={positions2}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors2.length / 3}
            array={colors2}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sizes2.length}
            array={sizes2}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.7}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.6}
          vertexColors={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Distant background stars */}
      <points ref={starsRef3}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions3.length / 3}
            array={positions3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors3.length / 3}
            array={colors3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={sizes3.length}
            array={sizes3}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          sizeAttenuation={true}
          transparent={true}
          opacity={0.4}
          vertexColors={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

    </group>
  )
}
