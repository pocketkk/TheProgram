import * as THREE from 'three'

export interface ProjectionLineProps {
  startPosition: THREE.Vector3
  endPosition: { x: number; y: number; z: number }
  color: string
  bodyRadius: number
  opacity?: number
  layers?: number
}

export const ProjectionLine: React.FC<ProjectionLineProps> = ({
  startPosition,
  endPosition,
  color,
  bodyRadius,
  opacity = 0.4,
  layers = 3,
}) => {
  // Define layer configurations (core, inner glow, outer glow)
  const layerConfigs = [
    { opacity: opacity, linewidth: 1 },
    { opacity: opacity * 0.5, linewidth: 2 },
    { opacity: opacity * 0.25, linewidth: 3 },
  ].slice(0, layers)

  return (
    <>
      {layerConfigs.map((config) => (
        <line key={`line-${config.opacity}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  startPosition.x,
                  startPosition.y - bodyRadius,
                  startPosition.z,
                  endPosition.x,
                  endPosition.y,
                  endPosition.z,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={config.opacity}
            linewidth={config.linewidth}
            blending={THREE.AdditiveBlending}
          />
        </line>
      ))}
    </>
  )
}
