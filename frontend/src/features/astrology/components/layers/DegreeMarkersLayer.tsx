/**
 * Degree Markers Layer
 * Displays degree markings around the chart wheel
 */

interface DegreeMarkersLayerProps {
  center: number
  planetRadius: number
  visible?: boolean
}

export function DegreeMarkersLayer({
  center,
  planetRadius,
  visible = true
}: DegreeMarkersLayerProps) {
  if (!visible) return null

  // Position markers around the planet ring to help identify planet positions
  // Place them slightly inside the planet radius to avoid interfering with planets
  const markerRadius = planetRadius - 30

  /**
   * Convert longitude to SVG coordinates
   */
  const polarToCartesian = (angle: number, radius: number) => {
    // Start from 9 o'clock (Aries 0°) and go counterclockwise
    const adjustedAngle = (180 - angle) * (Math.PI / 180)
    return {
      x: center + radius * Math.cos(adjustedAngle),
      y: center - radius * Math.sin(adjustedAngle),
    }
  }

  // Generate markers for every 10 degrees
  const markers = []
  for (let degree = 0; degree < 360; degree += 10) {
    const isMajor = degree % 30 === 0
    const tickLength = isMajor ? 8 : 4

    const outerPoint = polarToCartesian(degree, markerRadius)
    const innerPoint = polarToCartesian(degree, markerRadius - tickLength)

    markers.push({
      degree,
      isMajor,
      outerPoint,
      innerPoint,
    })
  }

  return (
    <g className="degree-markers-layer">
      {markers.map(({ degree, isMajor, outerPoint, innerPoint }) => (
        <g key={`marker-${degree}`}>
          {/* Tick mark */}
          <line
            x1={outerPoint.x}
            y1={outerPoint.y}
            x2={innerPoint.x}
            y2={innerPoint.y}
            stroke="#6b7280"
            strokeWidth={isMajor ? 2 : 1}
            strokeOpacity={isMajor ? 0.6 : 0.4}
            strokeLinecap="round"
          />

          {/* Label for major marks (every 30°) */}
          {isMajor && (
            <text
              x={polarToCartesian(degree, markerRadius - 15).x}
              y={polarToCartesian(degree, markerRadius - 15).y}
              fontSize={10}
              fill="#9ca3af"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="600"
              className="select-none"
            >
              {degree}°
            </text>
          )}
        </g>
      ))}
    </g>
  )
}
