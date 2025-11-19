/**
 * Custom planet icon component with beautiful visuals
 * No Unicode symbols - pure CSS/SVG for universal compatibility
 */

interface PlanetIconProps {
  planet: string
  size?: number
}

export const PlanetIcon = ({ planet, size = 48 }: PlanetIconProps) => {
  const planetKey = planet.toLowerCase()

  // Planet-specific gradients and visual styles
  const planetStyles: Record<string, { gradient: string; accentColor: string; rings?: boolean; emoji?: string }> = {
    sun: {
      gradient: 'radial-gradient(circle at 30% 30%, #FFE066, #FDB813)',
      accentColor: '#FFF8DC',
      emoji: '☀️',
    },
    mercury: {
      gradient: 'radial-gradient(circle at 30% 30%, #A89876, #8C7853)',
      accentColor: '#B8A888',
    },
    venus: {
      gradient: 'radial-gradient(circle at 30% 30%, #FFD580, #FFC649)',
      accentColor: '#FFE4B5',
    },
    earth: {
      gradient: 'radial-gradient(circle at 30% 30%, #5BA3F5, #4A90E2)',
      accentColor: '#87CEEB',
      emoji: '🌍',
    },
    mars: {
      gradient: 'radial-gradient(circle at 30% 30%, #F08F6E, #E27B58)',
      accentColor: '#FFA07A',
    },
    jupiter: {
      gradient: 'radial-gradient(circle at 30% 30%, #D9A55B, #C88B3A)',
      accentColor: '#F0E68C',
      rings: true,
    },
    saturn: {
      gradient: 'radial-gradient(circle at 30% 30%, #FFE4C4, #FAD5A5)',
      accentColor: '#FFFACD',
      rings: true,
      emoji: '🪐',
    },
    uranus: {
      gradient: 'radial-gradient(circle at 30% 30%, #6DE0F7, #4FD0E7)',
      accentColor: '#AFEEEE',
      rings: true,
    },
    neptune: {
      gradient: 'radial-gradient(circle at 30% 30%, #6B8FED, #4B70DD)',
      accentColor: '#87CEFA',
    },
    pluto: {
      gradient: 'radial-gradient(circle at 30% 30%, #C4A088, #A0826D)',
      accentColor: '#D2B48C',
    },
  }

  const style = planetStyles[planetKey] || planetStyles.earth

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute rounded-full opacity-30 blur-lg"
        style={{
          width: size * 1.4,
          height: size * 1.4,
          background: style.gradient,
        }}
      />

      {/* Main planet sphere */}
      <div
        className="relative rounded-full shadow-2xl z-10"
        style={{
          width: size,
          height: size,
          background: style.gradient,
          boxShadow: `
            0 4px 16px rgba(0, 0, 0, 0.4),
            inset -${size * 0.1}px -${size * 0.1}px ${size * 0.15}px rgba(0, 0, 0, 0.3),
            inset ${size * 0.08}px ${size * 0.08}px ${size * 0.12}px rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        {/* Highlight spot */}
        <div
          className="absolute rounded-full opacity-50"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            top: size * 0.15,
            left: size * 0.2,
            background: style.accentColor,
            filter: 'blur(4px)',
          }}
        />

        {/* Emoji overlay if available */}
        {style.emoji && (
          <div
            className="absolute inset-0 flex items-center justify-center opacity-70"
            style={{
              fontSize: size * 0.4,
            }}
          >
            {style.emoji}
          </div>
        )}
      </div>

      {/* Rings for gas giants */}
      {style.rings && (
        <>
          <div
            className="absolute border-2 rounded-full opacity-40 z-0"
            style={{
              width: size * 1.8,
              height: size * 0.5,
              borderColor: style.accentColor,
              transform: 'rotateX(75deg)',
              boxShadow: `0 0 ${size * 0.1}px ${style.accentColor}`,
            }}
          />
          <div
            className="absolute border rounded-full opacity-25 z-0"
            style={{
              width: size * 1.6,
              height: size * 0.4,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              borderWidth: '1px',
              transform: 'rotateX(75deg)',
            }}
          />
        </>
      )}
    </div>
  )
}
