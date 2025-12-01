/**
 * Expanded Chart Dialog Component
 * Full-screen chart dialog with transit details
 */
import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/Dialog'
import { BirthChartWheel } from '@/features/birthchart/components/BirthChartWheel'
import { useTransitsForDate } from './useTransitsForDate'
import { formatTransit, getPlanetSymbol, getSignificanceColor } from '@/lib/api/transits'

interface ExpandedChartDialogProps {
  isOpen: boolean
  onClose: () => void
  date: string
  birthDataId?: string
}

export function ExpandedChartDialog({
  isOpen,
  onClose,
  date,
  birthDataId
}: ExpandedChartDialogProps) {
  const [chartSize, setChartSize] = useState(550)
  const resizeRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const startY = useRef(0)
  const startSize = useRef(0)

  const { data, isLoading } = useTransitsForDate({
    date,
    birthDataId,
    enabled: isOpen && !!birthDataId
  })

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const deltaY = e.clientY - startY.current
      const newSize = Math.max(300, Math.min(800, startSize.current + deltaY))
      setChartSize(newSize)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleResizeStart = (e: React.MouseEvent) => {
    isResizing.current = true
    startY.current = e.clientY
    startSize.current = chartSize
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-fit max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            Transit Chart - {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </DialogTitle>
          <DialogDescription>
            Planetary positions and aspects for this date
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="space-y-4 w-64">
              <div className="h-4 bg-cosmic-700/50 rounded animate-pulse"></div>
              <div className="h-4 bg-cosmic-700/50 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-cosmic-700/50 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        ) : data ? (
          <div className="flex gap-6">
            {/* Chart - left side with resizable container */}
            <div className="flex-shrink-0">
              <div
                ref={resizeRef}
                className="relative border border-cosmic-600/50 rounded-lg bg-cosmic-900/30 overflow-visible flex items-center justify-center p-4"
                style={{ width: chartSize + 32, height: chartSize + 32 }}
              >
                <BirthChartWheel
                  chart={data.chart}
                  showAspects={true}
                  showHouseNumbers={true}
                  size={chartSize}
                />
                {/* Resize handle */}
                <div
                  onMouseDown={handleResizeStart}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-3 cursor-ns-resize flex items-center justify-center group"
                >
                  <div className="w-12 h-1 rounded-full bg-cosmic-500 group-hover:bg-celestial-gold transition-colors" />
                </div>
              </div>
            </div>

            {/* Planet Positions panel */}
            <div className="w-[180px] flex-shrink-0 overflow-auto max-h-[600px] border border-cosmic-600/50 rounded-lg bg-cosmic-900/30 p-4">
              <h3 className="text-base font-semibold text-cosmic-200 mb-3">
                Planet Positions
              </h3>
              <div className="space-y-1.5">
                {data.chart.planets.map((planet) => (
                  <div
                    key={planet.name}
                    className="px-2 py-1.5 glass-subtle rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{planet.symbol}</span>
                      <span className="text-cosmic-200 text-sm font-medium">{planet.name}</span>
                      {planet.isRetrograde && (
                        <span className="text-red-400 text-xs">℞</span>
                      )}
                    </div>
                    <div className="text-xs text-cosmic-400 whitespace-nowrap ml-1">
                      {planet.degree}° {planet.sign}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Transits panel */}
            <div className="w-[260px] flex-shrink-0 overflow-auto max-h-[600px] border border-cosmic-600/50 rounded-lg bg-cosmic-900/30 p-4">
              <h3 className="text-base font-semibold text-cosmic-200 mb-3">
                Active Transits
              </h3>

              {/* Summary at top */}
              {data.raw.summary && (
                <div className="mb-3 pb-3 border-b border-cosmic-600/50">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-cosmic-400">Total: </span>
                      <span className="text-cosmic-200 font-medium">{data.raw.summary.total_transits}</span>
                    </div>
                    <div>
                      <span className="text-cosmic-400">Major: </span>
                      <span className="text-celestial-pink font-medium">{data.raw.summary.major_count}</span>
                    </div>
                  </div>
                  {data.raw.summary.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.raw.summary.themes.map((theme, index) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 bg-celestial-gold/10 border border-celestial-gold/30 rounded text-celestial-gold text-xs"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {data.raw.transits.length > 0 ? (
                <div className="space-y-2">
                  {data.raw.transits.map((transit, index) => (
                    <div
                      key={index}
                      className="px-2 py-2 glass-subtle rounded space-y-1"
                    >
                      <div className={`text-sm font-medium ${getSignificanceColor(transit.significance)}`}>
                        {getPlanetSymbol(transit.transit_planet)} {transit.aspect} {getPlanetSymbol(transit.natal_planet)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-cosmic-400">
                        <span className="tabular-nums">{transit.orb.toFixed(1)}° orb</span>
                        <span className="capitalize">{transit.significance}</span>
                      </div>
                      {transit.estimated_duration && (
                        <div className="text-xs text-cosmic-500">
                          {transit.estimated_duration}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-cosmic-400 text-sm">No active transits</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-gray-400">No transit data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
