import * as THREE from 'three'

export interface TrailRendererProps {
  positions: THREE.Vector3[]
  color: string
  opacity?: number
  linewidth?: number
  fadeEffect?: boolean
}

export const TrailRenderer: React.FC<TrailRendererProps> = ({
  positions,
  color,
  opacity = 0.7,
  linewidth = 2,
  fadeEffect = true,
}) => {
  if (positions.length < 2) {
    return null
  }

  // Create position buffer
  const positionArray = new Float32Array(positions.flatMap((p) => [p.x, p.y, p.z]))

  // Create color/alpha buffer with fade effect
  const colors = new Float32Array(positions.length * 4) // RGBA
  const baseColor = new THREE.Color(color)

  for (let i = 0; i < positions.length; i++) {
    const t = i / (positions.length - 1) // 0 to 1 (oldest to newest)
    const alpha = fadeEffect ? Math.pow(t, 2) * opacity : opacity

    colors[i * 4] = baseColor.r
    colors[i * 4 + 1] = baseColor.g
    colors[i * 4 + 2] = baseColor.b
    colors[i * 4 + 3] = alpha
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionArray, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 4]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        linewidth={linewidth}
        blending={THREE.AdditiveBlending}
      />
    </line>
  )
}
