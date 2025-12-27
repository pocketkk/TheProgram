/**
 * Responsive Layout Strategy
 * Adapts chart display to different viewport sizes
 */

import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'ultrawide'

export interface ResponsiveConfig {
  breakpoint: Breakpoint
  chartSize: number
  showSidebar: boolean
  stackLayout: boolean
  fontSize: {
    small: number
    medium: number
    large: number
  }
  spacing: {
    padding: number
    gap: number
  }
  features: {
    showAspectLines: boolean
    showDegreeMarkers: boolean
    showPlanetLabels: boolean
    showHouseNumbers: boolean
    enableAnimations: boolean
    showTooltips: boolean
  }
}

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
  ultrawide: 1920,
}

/**
 * Get responsive configuration based on viewport
 */
export function getResponsiveConfig(width: number): ResponsiveConfig {
  if (width < BREAKPOINTS.tablet) {
    return {
      breakpoint: 'mobile',
      chartSize: Math.min(width - 32, 400),
      showSidebar: false,
      stackLayout: true,
      fontSize: {
        small: 10,
        medium: 12,
        large: 16,
      },
      spacing: {
        padding: 16,
        gap: 12,
      },
      features: {
        showAspectLines: false, // Too cluttered on mobile
        showDegreeMarkers: false,
        showPlanetLabels: false,
        showHouseNumbers: true,
        enableAnimations: false, // Better performance
        showTooltips: false, // Touch doesn't support hover
      },
    }
  }

  if (width < BREAKPOINTS.desktop) {
    return {
      breakpoint: 'tablet',
      chartSize: 500,
      showSidebar: false,
      stackLayout: true,
      fontSize: {
        small: 11,
        medium: 14,
        large: 18,
      },
      spacing: {
        padding: 24,
        gap: 16,
      },
      features: {
        showAspectLines: true,
        showDegreeMarkers: true,
        showPlanetLabels: true,
        showHouseNumbers: true,
        enableAnimations: true,
        showTooltips: true,
      },
    }
  }

  if (width < BREAKPOINTS.ultrawide) {
    return {
      breakpoint: 'desktop',
      chartSize: 600,
      showSidebar: true,
      stackLayout: false,
      fontSize: {
        small: 12,
        medium: 14,
        large: 20,
      },
      spacing: {
        padding: 32,
        gap: 24,
      },
      features: {
        showAspectLines: true,
        showDegreeMarkers: true,
        showPlanetLabels: true,
        showHouseNumbers: true,
        enableAnimations: true,
        showTooltips: true,
      },
    }
  }

  return {
    breakpoint: 'ultrawide',
    chartSize: 750,
    showSidebar: true,
    stackLayout: false,
    fontSize: {
      small: 14,
      medium: 16,
      large: 24,
    },
    spacing: {
      padding: 48,
      gap: 32,
    },
    features: {
      showAspectLines: true,
      showDegreeMarkers: true,
      showPlanetLabels: true,
      showHouseNumbers: true,
      enableAnimations: true,
      showTooltips: true,
    },
  }
}

/**
 * Hook to get current responsive config
 */
export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>(() =>
    getResponsiveConfig(window.innerWidth)
  )

  useEffect(() => {
    const handleResize = () => {
      setConfig(getResponsiveConfig(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return config
}

/**
 * Hook for media queries
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

/**
 * Breakpoint helper hooks
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`)
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`
  )
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`)
}

/**
 * Adaptive feature detection
 */
export function useAdaptiveFeatures() {
  const [features, setFeatures] = useState({
    touchSupport: 'ontouchstart' in window,
    hoverSupport: window.matchMedia('(hover: hover)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  })

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setFeatures(prev => ({ ...prev, reducedMotion: e.matches }))
    }

    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setFeatures(prev => ({ ...prev, darkMode: e.matches }))
    }

    motionQuery.addEventListener('change', handleMotionChange)
    darkModeQuery.addEventListener('change', handleDarkModeChange)

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange)
      darkModeQuery.removeEventListener('change', handleDarkModeChange)
    }
  }, [])

  return features
}
