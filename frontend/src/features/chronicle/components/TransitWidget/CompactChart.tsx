/**
 * Compact Chart Component
 * Responsive transit chart that fills its container, with expand button
 */
import { useRef, useState, useEffect } from 'react'
import { BirthChartWheel } from '@/features/astrology/components/BirthChartWheel'
import { useTransitsForDate } from './useTransitsForDate'
import { Maximize2 } from 'lucide-react'

interface CompactChartProps {
  date: string
  birthDataId?: string
  onExpand: () => void
}

export function CompactChart({ date, birthDataId, onExpand }: CompactChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState(300)

  const { data, isLoading, error } = useTransitsForDate({
    date,
    birthDataId,
    enabled: !!birthDataId
  })

  // Measure container and update chart size
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use the smaller dimension to keep it square
        const size = Math.min(entry.contentRect.width, entry.contentRect.height)
        if (size > 0) {
          setChartSize(Math.floor(size))
        }
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  if (!birthDataId) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[200px] flex items-center justify-center"
      >
        <p className="text-sm text-gray-400 text-center px-4">
          Select a birth chart to view transits
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[200px] flex items-center justify-center"
      >
        <div className="space-y-3 w-full px-6">
          <div className="h-3 bg-cosmic-700/50 rounded animate-pulse"></div>
          <div className="h-3 bg-cosmic-700/50 rounded animate-pulse w-3/4 mx-auto"></div>
          <div className="h-3 bg-cosmic-700/50 rounded animate-pulse w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[200px] flex items-center justify-center"
      >
        <p className="text-sm text-red-400 text-center px-4">
          {error instanceof Error ? error.message : 'Failed to load transit chart'}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[200px] overflow-hidden group flex items-center justify-center"
    >
      {/* Chart - centered and sized to fit, showing natal houses */}
      <BirthChartWheel
        chart={data.chart}
        showAspects={false}
        showHouseNumbers={true}
        showZoomControls={false}
        size={chartSize}
      />

      {/* Expand button overlay */}
      <button
        onClick={onExpand}
        className="absolute top-2 right-2 w-8 h-8 bg-cosmic-900/80 hover:bg-celestial-gold/20 border border-celestial-gold/30 hover:border-celestial-gold rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
        title="Expand chart"
      >
        <Maximize2 className="w-4 h-4 text-celestial-gold" />
      </button>
    </div>
  )
}
