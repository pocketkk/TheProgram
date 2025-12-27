/**
 * Chart Interaction Hooks
 * Coordinates interactions across chart components
 */

import { useCallback, useEffect } from 'react'
import { useChartStore } from '../stores/chartStore'
import type { PlanetPosition, House, Aspect } from '@/lib/astrology/types'

export interface ChartInteractionHandlers {
  // Hover handlers
  onPlanetHover: (planet: PlanetPosition | null) => void
  onHouseHover: (house: House | null) => void
  onAspectHover: (aspect: Aspect | null) => void

  // Click handlers
  onPlanetClick: (planet: PlanetPosition) => void
  onHouseClick: (house: House) => void
  onAspectClick: (aspect: Aspect) => void

  // Clear handlers
  clearSelection: () => void
  clearHover: () => void

  // Query handlers
  isSelected: (type: 'planet' | 'house' | 'aspect', id: string) => boolean
  isHovered: (type: 'planet' | 'house' | 'aspect', id: string) => boolean
  isHighlighted: (planetName: string) => boolean
}

/**
 * Main interaction hook
 */
export function useChartInteractions(): ChartInteractionHandlers {
  const {
    interaction,
    setHoveredElement,
    setSelectedElement,
    setActiveHouse,
    clearInteractions: _clearInteractions,
  } = useChartStore()

  // Planet hover
  const onPlanetHover = useCallback(
    (planet: PlanetPosition | null) => {
      if (planet) {
        setHoveredElement({
          type: 'planet',
          id: planet.name,
          data: planet,
        })
      } else {
        setHoveredElement(null)
      }
    },
    [setHoveredElement]
  )

  // House hover
  const onHouseHover = useCallback(
    (house: House | null) => {
      if (house) {
        setHoveredElement({
          type: 'house',
          id: String(house.number),
          data: house,
        })
        setActiveHouse(house.number)
      } else {
        setHoveredElement(null)
        setActiveHouse(null)
      }
    },
    [setHoveredElement, setActiveHouse]
  )

  // Aspect hover
  const onAspectHover = useCallback(
    (aspect: Aspect | null) => {
      if (aspect) {
        setHoveredElement({
          type: 'aspect',
          id: `${aspect.planet1}-${aspect.planet2}`,
          data: aspect,
        })
      } else {
        setHoveredElement(null)
      }
    },
    [setHoveredElement]
  )

  // Planet click (selection)
  const onPlanetClick = useCallback(
    (planet: PlanetPosition) => {
      const currentSelection = interaction.selectedElement

      // Toggle off if clicking same planet
      if (currentSelection?.type === 'planet' && currentSelection.id === planet.name) {
        setSelectedElement(null)
      } else {
        setSelectedElement({
          type: 'planet',
          id: planet.name,
          data: planet,
        })
      }
    },
    [interaction.selectedElement, setSelectedElement]
  )

  // House click
  const onHouseClick = useCallback(
    (house: House) => {
      const currentSelection = interaction.selectedElement

      if (currentSelection?.type === 'house' && currentSelection.id === String(house.number)) {
        setSelectedElement(null)
        setActiveHouse(null)
      } else {
        setSelectedElement({
          type: 'house',
          id: String(house.number),
          data: house,
        })
        setActiveHouse(house.number)
      }
    },
    [interaction.selectedElement, setSelectedElement, setActiveHouse]
  )

  // Aspect click
  const onAspectClick = useCallback(
    (aspect: Aspect) => {
      setSelectedElement({
        type: 'aspect',
        id: `${aspect.planet1}-${aspect.planet2}`,
        data: aspect,
      })
    },
    [setSelectedElement]
  )

  // Query functions
  const isSelected = useCallback(
    (type: 'planet' | 'house' | 'aspect', id: string) => {
      return interaction.selectedElement?.type === type && interaction.selectedElement?.id === id
    },
    [interaction.selectedElement]
  )

  const isHovered = useCallback(
    (type: 'planet' | 'house' | 'aspect', id: string) => {
      return interaction.hoveredElement?.type === type && interaction.hoveredElement?.id === id
    },
    [interaction.hoveredElement]
  )

  const isHighlighted = useCallback(
    (planetName: string) => {
      // Planet is highlighted if it's part of a highlighted aspect
      return interaction.highlightedAspects.some(aspectId => aspectId.includes(planetName))
    },
    [interaction.highlightedAspects]
  )

  const clearSelection = useCallback(() => {
    setSelectedElement(null)
    setActiveHouse(null)
  }, [setSelectedElement, setActiveHouse])

  const clearHover = useCallback(() => {
    setHoveredElement(null)
  }, [setHoveredElement])

  return {
    onPlanetHover,
    onHouseHover,
    onAspectHover,
    onPlanetClick,
    onHouseClick,
    onAspectClick,
    clearSelection,
    clearHover,
    isSelected,
    isHovered,
    isHighlighted,
  }
}

/**
 * Keyboard navigation hook for chart
 */
export function useChartKeyboardNav() {
  const chart = useChartStore(state => state.getActiveChart())
  const { setSelectedElement, interaction } = useChartStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!chart) return

      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedElement(null)
        return
      }

      const currentSelection = interaction.selectedElement

      // Arrow keys to navigate planets
      if (currentSelection?.type === 'planet' && (e.key.startsWith('Arrow') || e.key === 'Tab')) {
        e.preventDefault()

        const currentIndex = chart.planets.findIndex(p => p.name === currentSelection.id)
        let nextIndex = currentIndex

        if (e.key === 'ArrowRight' || e.key === 'Tab') {
          nextIndex = (currentIndex + 1) % chart.planets.length
        } else if (e.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + chart.planets.length) % chart.planets.length
        }

        const nextPlanet = chart.planets[nextIndex]
        setSelectedElement({
          type: 'planet',
          id: nextPlanet.name,
          data: nextPlanet,
        })
      }

      // Number keys to select houses
      if (e.key >= '1' && e.key <= '9') {
        const houseNum = parseInt(e.key)
        const house = chart.houses[houseNum - 1]
        if (house) {
          setSelectedElement({
            type: 'house',
            id: String(house.number),
            data: house,
          })
        }
      }

      // 0 for house 10
      if (e.key === '0') {
        const house = chart.houses[9]
        if (house) {
          setSelectedElement({
            type: 'house',
            id: String(house.number),
            data: house,
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chart, setSelectedElement, interaction.selectedElement])
}

/**
 * Touch gesture hook for mobile
 */
export function useChartTouchGestures(elementRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let touchStartDistance = 0
    let initialScale = 1

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        touchStartDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const touchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )

        const scale = (touchDistance / touchStartDistance) * initialScale
        // Apply scale transformation (would need additional state management)
        console.log('Pinch zoom scale:', scale)
      }
    }

    const handleTouchEnd = () => {
      touchStartDistance = 0
    }

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [elementRef])
}

/**
 * Tooltip positioning hook
 */
export function useChartTooltip() {
  const hoveredElement = useChartStore(state => state.interaction.hoveredElement)

  const getTooltipContent = useCallback(() => {
    if (!hoveredElement) return null

    switch (hoveredElement.type) {
      case 'planet': {
        const planet = hoveredElement.data as PlanetPosition
        return {
          title: planet.name,
          content: `${planet.degree}° ${planet.sign} in House ${planet.house}`,
          subtitle: planet.isRetrograde ? 'Retrograde' : '',
        }
      }
      case 'house': {
        const house = hoveredElement.data as House
        return {
          title: `House ${house.number}`,
          content: `${house.degree}° ${house.sign}`,
        }
      }
      case 'aspect': {
        const aspect = hoveredElement.data as Aspect
        return {
          title: `${aspect.planet1} ${aspect.type} ${aspect.planet2}`,
          content: `${aspect.angle}° (orb: ${aspect.orb.toFixed(2)}°)`,
          subtitle: aspect.isApplying ? 'Applying' : 'Separating',
        }
      }
      default:
        return null
    }
  }, [hoveredElement])

  return { hoveredElement, getTooltipContent }
}
