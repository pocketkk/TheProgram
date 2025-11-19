/**
 * Chart Tooltip Component
 * Displays detailed information on hover for chart elements
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useChartTooltip } from '../hooks/useChartInteractions'
import { useEffect, useState } from 'react'
import { tooltipVariants, withReducedMotion } from '../animations'

interface TooltipPosition {
  x: number
  y: number
}

interface ChartTooltipProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export function ChartTooltip({ containerRef }: ChartTooltipProps) {
  const { hoveredElement, getTooltipContent } = useChartTooltip()
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!hoveredElement) return

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()

      // Position tooltip near cursor but keep it within viewport
      let x = e.clientX - rect.left + 15
      let y = e.clientY - rect.top + 15

      // Prevent tooltip from going off right edge
      if (x + 250 > rect.width) {
        x = e.clientX - rect.left - 250 - 15
      }

      // Prevent tooltip from going off bottom edge
      if (y + 100 > rect.height) {
        y = e.clientY - rect.top - 100 - 15
      }

      // Prevent tooltip from going off left edge
      if (x < 0) x = 10

      // Prevent tooltip from going off top edge
      if (y < 0) y = 10

      setPosition({ x, y })
    }

    if (hoveredElement) {
      setIsVisible(true)
      window.addEventListener('mousemove', handleMouseMove)
    } else {
      setIsVisible(false)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [hoveredElement, containerRef])

  const content = getTooltipContent()

  return (
    <AnimatePresence>
      {isVisible && content && (
        <motion.div
          variants={withReducedMotion(tooltipVariants)}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <div className="bg-cosmic-900 border border-cosmic-700 rounded-lg shadow-xl px-4 py-3 max-w-xs">
            {/* Title */}
            <div className="font-semibold text-cosmic-100 text-lg mb-1">
              {content.title}
            </div>

            {/* Content */}
            <div className="text-cosmic-300 text-sm mb-1">
              {content.content}
            </div>

            {/* Subtitle (optional) */}
            {content.subtitle && (
              <div className="text-cosmic-500 text-xs font-medium mt-2 uppercase tracking-wide">
                {content.subtitle}
              </div>
            )}

            {/* Decorative border accent */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cosmic-500 to-cosmic-700 rounded-r-full" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
