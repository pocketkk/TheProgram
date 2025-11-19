/**
 * Astrological symbols as SVG components
 * These will render correctly on any system without font dependencies
 */

interface AstroSymbolProps {
  planet: string
  size?: number
  color?: string
  className?: string
}

export const AstroSymbol = ({ planet, size = 24, color = 'currentColor', className = '' }: AstroSymbolProps) => {
  const planetKey = planet.toLowerCase()

  const symbols: Record<string, JSX.Element> = {
    sun: (
      // ☉ Sun symbol - circle with dot in center
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    ),
    mercury: (
      // ☿ Mercury symbol - circle with horns and cross
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" fill="none" />
        <path d="M12 7 L12 3 M9 4 Q12 2 15 4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M12 17 L12 21 M9 19 L15 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    venus: (
      // ♀ Venus symbol - circle with cross below
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="9" r="5" stroke={color} strokeWidth="2" fill="none" />
        <path d="M12 14 L12 21 M9 18 L15 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    earth: (
      // ♁ Earth symbol - circle with cross inside
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" fill="none" />
        <path d="M12 4 L12 20 M4 12 L20 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    mars: (
      // ♂ Mars symbol - circle with arrow pointing up-right
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="10" cy="14" r="5" stroke={color} strokeWidth="2" fill="none" />
        <path d="M14 10 L20 4 M20 4 L20 9 M20 4 L15 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    jupiter: (
      // ♃ Jupiter symbol - stylized "4" with cross
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M8 4 L8 14 M8 9 L14 9 L14 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M11 17 L17 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    saturn: (
      // ♄ Saturn symbol - stylized "h" with cross
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 4 L9 14 Q9 18 13 18 Q17 18 17 14 L17 12" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M6 7 L12 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    uranus: (
      // ♅ Uranus symbol - H with circle and dot
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M8 4 L8 12 M16 4 L16 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M8 8 L16 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="4" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="12" cy="16" r="1.5" fill={color} />
      </svg>
    ),
    neptune: (
      // ♆ Neptune symbol - trident
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 20 L12 8 M8 4 L8 12 M16 4 L16 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M6 10 L18 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    pluto: (
      // ♇ Pluto symbol - P with L
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 20 L9 4 M9 4 Q9 4 12 4 Q15 4 15 7 Q15 10 12 10 L9 10" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="12" cy="15" r="3" stroke={color} strokeWidth="2" fill="none" />
        <path d="M9 15 L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    moon: (
      // ☽ Moon symbol - crescent
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M18 12 Q14 8 10 12 Q14 16 18 12 Z" stroke={color} strokeWidth="2" fill="none" />
        <path d="M10 12 Q12 10 14 12 Q12 14 10 12" fill={color} />
      </svg>
    ),
  }

  return symbols[planetKey] || symbols.earth
}
