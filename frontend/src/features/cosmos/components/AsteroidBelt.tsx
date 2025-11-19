import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

interface AsteroidBeltProps {
  scale?: number
}

export const AsteroidBelt = ({ scale = 1 }: AsteroidBeltProps) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null)

  // Generate asteroid data
  const asteroidData = useMemo(() => {
    const count = 800 // Reduced from 2000 for better performance
    const data: { position: THREE.Vector3; rotation: THREE.Euler; scale: number }[] = []

    // Mars orbit: ~1.52 AU, Jupiter orbit: ~5.2 AU
    // Asteroid belt: closer to Mars, not touching Jupiter
    const innerRadius = 1.7 * scale
    const outerRadius = 2.3 * scale

    for (let i = 0; i < count; i++) {
      // Random position in belt
      const angle = Math.random() * Math.PI * 2
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius)

      // Slight vertical variation (inclination)
      const y = (Math.random() - 0.5) * 0.4 * scale

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      // Random rotation
      const rotX = Math.random() * Math.PI * 2
      const rotY = Math.random() * Math.PI * 2
      const rotZ = Math.random() * Math.PI * 2

      // Random scale (asteroids of different sizes)
      const asteroidScale = 0.01 + Math.random() * 0.04

      data.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(rotX, rotY, rotZ),
        scale: asteroidScale,
      })
    }

    return { count, data }
  }, [scale])

  // Initialize instance matrices after mesh is mounted
  useEffect(() => {
    if (!instancedMeshRef.current) return

    const dummy = new THREE.Object3D()

    for (let i = 0; i < asteroidData.count; i++) {
      const asteroid = asteroidData.data[i]
      dummy.position.copy(asteroid.position)
      dummy.rotation.copy(asteroid.rotation)
      dummy.scale.set(asteroid.scale, asteroid.scale, asteroid.scale)
      dummy.updateMatrix()
      instancedMeshRef.current.setMatrixAt(i, dummy.matrix)
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  }, [asteroidData])

  // Asteroids are now static for better performance
  // The random initial rotation provides visual variety without per-frame updates

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, asteroidData.count]}>
      {/* Simple box geometry for asteroids */}
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#4A4A4A"
      />
    </instancedMesh>
  )
}
