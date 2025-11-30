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
      <DialogContent className="max-w-[70vw] max-h-[90vh] overflow-auto">
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
          <div className="flex flex-col gap-4">
            {/* Chart - centered with resizable container */}
            <div className="flex justify-center">
              <div
                ref={resizeRef}
                className="relative border border-cosmic-600/50 rounded-lg pl-16 pr-4 py-4 bg-cosmic-900/30 overflow-hidden"
                style={{ width: chartSize + 80, height: chartSize + 48 }}
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

            {/* Transit list */}
            <div className="space-y-4 overflow-auto max-h-[300px]">
              {/* Planet positions */}
              <div>
                <h3 className="text-lg font-semibold text-cosmic-200 mb-3">
                  Planet Positions
                </h3>
                <div className="space-y-2">
                  {data.chart.planets.map((planet) => (
                    <div
                      key={planet.name}
                      className="flex items-center justify-between px-3 py-2 glass-subtle rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{planet.symbol}</span>
                        <span className="text-cosmic-200 font-medium">
                          {planet.name}
                        </span>
                        {planet.isRetrograde && (
                          <span className="text-red-400 text-xs">℞</span>
                        )}
                      </div>
                      <div className="text-cosmic-300 text-sm">
                        {planet.degree}° {planet.sign}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active transits (if available) */}
              {data.raw.transits.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-cosmic-200 mb-3">
                    Active Transits
                  </h3>
                  <div className="space-y-2">
                    {data.raw.transits.map((transit, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 glass-subtle rounded"
                      >
                        <div className="flex items-center justify-between">
                          <div className={`font-medium ${getSignificanceColor(transit.significance)}`}>
                            {formatTransit(transit)}
                          </div>
                          <div className="text-xs text-cosmic-400">
                            {transit.significance}
                          </div>
                        </div>
                        {transit.estimated_duration && (
                          <div className="text-xs text-cosmic-400 mt-1">
                            Duration: {transit.estimated_duration}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {data.raw.summary && (
                <div className="glass-subtle rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-cosmic-200">
                    Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-cosmic-400">Total Transits</div>
                      <div className="text-cosmic-200 font-medium">
                        {data.raw.summary.total_transits}
                      </div>
                    </div>
                    <div>
                      <div className="text-cosmic-400">Major Aspects</div>
                      <div className="text-celestial-pink font-medium">
                        {data.raw.summary.major_count}
                      </div>
                    </div>
                  </div>
                  {data.raw.summary.themes.length > 0 && (
                    <div>
                      <div className="text-cosmic-400 text-sm mb-2">Themes</div>
                      <div className="flex flex-wrap gap-2">
                        {data.raw.summary.themes.map((theme, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-celestial-gold/10 border border-celestial-gold/30 rounded text-celestial-gold text-xs"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
