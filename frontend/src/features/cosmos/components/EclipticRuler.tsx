import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ZODIAC_SIGNS } from '@/lib/astronomy/planetaryData'
import { calculateAngleFromCoordinates } from '../utils/calculations'

interface EclipticRulerProps {
  earthPosition: THREE.Vector3
}

export const EclipticRuler = ({ earthPosition }: EclipticRulerProps) => {
  const { camera } = useThree()
  const [cameraAngle, setCameraAngle] = useState(0)

  useEffect(() => {
    const updateAngle = () => {
      // Calculate camera's viewing direction relative to Earth
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)

      // Convert to angle (0-360°)
      const angle = calculateAngleFromCoordinates(direction.x, direction.z)

      setCameraAngle(angle)
    }

    // Update on each frame
    const interval = setInterval(updateAngle, 50)
    return () => clearInterval(interval)
  }, [camera])

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none">
      {/* Ruler background */}
      <div className="glass-strong border-t border-cosmic-700/50 p-4">
        {/* Degree ruler */}
        <div className="relative h-24 bg-cosmic-900/30 rounded-lg border border-cosmic-700/30 overflow-hidden">
          {/* Zodiac signs ruler */}
          <div className="absolute inset-0 flex">
            {ZODIAC_SIGNS.map((sign) => (
              <div
                key={sign.name}
                className="flex-1 border-r border-cosmic-700/40 relative"
                style={{
                  background: `linear-gradient(to bottom, ${sign.color}15, transparent)`,
                }}
              >
                {/* Zodiac symbol */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2">
                  <div
                    className="text-lg font-bold"
                    style={{ color: sign.color }}
                  >
                    {sign.symbol}
                  </div>
                </div>

                {/* Zodiac name */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
                  {sign.name}
                </div>

                {/* Degree markers */}
                <div className="absolute bottom-0 inset-x-0">
                  {/* Start degree */}
                  <div className="absolute left-0 bottom-0 text-[10px] text-cosmic-300">
                    <div className="w-px h-3 bg-cosmic-500 mb-1 mx-auto" />
                    <div className="text-center">{sign.startDegree}°</div>
                  </div>

                  {/* Mid degree */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-[10px] text-cosmic-400/60">
                    <div className="w-px h-2 bg-cosmic-600/60 mb-1 mx-auto" />
                    <div className="text-center">{sign.startDegree + 15}°</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current viewing direction indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-400 via-yellow-500 to-transparent pointer-events-none z-10"
            style={{
              left: `${(cameraAngle / 360) * 100}%`,
              boxShadow: '0 0 10px rgba(250, 204, 21, 0.6)',
            }}
          >
            {/* Arrow indicator */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-400" />
            </div>

            {/* Current degree label */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cosmic-900/90 border border-yellow-400/50 rounded px-2 py-0.5 text-xs font-bold text-yellow-400 whitespace-nowrap">
              {cameraAngle.toFixed(1)}°
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-2 text-center text-xs text-gray-400">
          <span className="inline-flex items-center gap-2">
            <span>🔄 Drag left/right to rotate view</span>
            <span className="text-cosmic-500">•</span>
            <span>🔍 Scroll to zoom</span>
          </span>
        </div>
      </div>
    </div>
  )
}
