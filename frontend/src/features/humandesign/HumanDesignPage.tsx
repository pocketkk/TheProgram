/**
 * Human Design Page
 *
 * Main page for Human Design chart visualization and analysis
 */
import React, { useEffect, useState } from 'react'
import { useHDStore } from './stores/hdStore'
import { BodyGraph } from './components/BodyGraph'
import { DetailPanel } from './components/DetailPanel'
import { Controls } from './components/Controls'
import { AIReading } from './components/AIReading'
import { listBirthData } from '@/lib/api/birthData'

interface HumanDesignPageProps {
  birthDataId?: string | null
}

export const HumanDesignPage: React.FC<HumanDesignPageProps> = ({ birthDataId: propBirthDataId }) => {
  // Auto-select first birth data if none provided
  const [birthDataId, setBirthDataId] = useState<string | null>(propBirthDataId || null)
  const [loadingBirthData, setLoadingBirthData] = useState(!propBirthDataId)

  // Fetch first birth data if not provided
  useEffect(() => {
    if (propBirthDataId) {
      setBirthDataId(propBirthDataId)
      setLoadingBirthData(false)
      return
    }

    const fetchBirthData = async () => {
      try {
        const data = await listBirthData()
        if (data.length > 0) {
          setBirthDataId(data[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch birth data:', error)
      } finally {
        setLoadingBirthData(false)
      }
    }

    fetchBirthData()
  }, [propBirthDataId])

  const {
    chart,
    isLoading,
    error,
    viewMode,
    calculateChart,
    zodiac,
    siderealMethod,
    ayanamsa,
    reset,
  } = useHDStore()

  // Calculate chart when birthDataId or settings change
  useEffect(() => {
    if (birthDataId) {
      calculateChart(birthDataId)
    }

    return () => {
      // Cleanup on unmount
    }
  }, [birthDataId, zodiac, siderealMethod, ayanamsa, calculateChart])

  // Loading birth data
  if (loadingBirthData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-celestial-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading birth data...</p>
        </div>
      </div>
    )
  }

  // No birth data available
  if (!birthDataId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-celestial-gold/10 flex items-center justify-center">
            <span className="text-3xl">⬡</span>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Human Design</h2>
          <p className="text-gray-400 mb-4">
            No birth data available. Please create a birth chart first to view
            your Human Design Body Graph.
          </p>
          <p className="text-sm text-gray-500">
            Go to Dashboard to create your first birth chart.
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-celestial-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Calculating Human Design chart...</p>
          <p className="text-xs text-gray-500 mt-2">
            Computing 88° solar arc for Design calculation
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl text-red-400">!</span>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Calculation Error</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => calculateChart(birthDataId)}
            className="px-4 py-2 bg-celestial-gold text-gray-900 rounded-lg hover:bg-celestial-gold/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // No chart data yet
  if (!chart) {
    return (
      <div className="flex-1 flex items-center justify-center bg-cosmic-dark">
        <p className="text-gray-400">No chart data available</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-cosmic-dark overflow-hidden">
      <div className="h-full flex flex-col lg:flex-row">
        {/* Left Sidebar - Controls */}
        <aside className="w-full lg:w-64 xl:w-72 bg-gray-900/50 border-b lg:border-b-0 lg:border-r border-gray-800 p-4 overflow-y-auto">
          <h1 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-celestial-gold">⬡</span>
            Human Design
          </h1>
          <Controls />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {viewMode === 'reading' ? (
            <AIReading birthDataId={birthDataId} className="max-w-3xl mx-auto" />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
              {/* Body Graph */}
              <div className="flex-shrink-0">
                <div className="bg-gray-900/30 rounded-xl p-4 shadow-2xl">
                  <BodyGraph width={340} height={500} />
                </div>
              </div>

              {/* Detail Panel */}
              <div className="w-full lg:w-80 xl:w-96">
                <DetailPanel />
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Type Summary (visible on large screens) */}
        <aside className="hidden xl:block w-64 bg-gray-900/30 border-l border-gray-800 p-4">
          <div className="space-y-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <span className="text-4xl mb-2 block">
                {(chart?.type || chart?.hd_type) === 'Generator' && '⚡'}
                {(chart?.type || chart?.hd_type) === 'Manifesting Generator' && '⚡✨'}
                {(chart?.type || chart?.hd_type) === 'Projector' && '👁'}
                {(chart?.type || chart?.hd_type) === 'Manifestor' && '🔥'}
                {(chart?.type || chart?.hd_type) === 'Reflector' && '🌙'}
              </span>
              <h3 className="text-lg font-medium text-celestial-gold">
                {(chart?.type || chart?.hd_type) || 'Loading...'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{chart?.strategy || ''}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 block">Authority</span>
                <span className="text-white">{chart?.authority || ''}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Profile</span>
                <span className="text-white">{chart?.profile?.name || ''}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Definition</span>
                <span className="text-white">{chart?.definition?.replace('_', ' ') || ''}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Incarnation Cross</span>
                <span className="text-white text-xs">{chart?.incarnation_cross?.name || ''}</span>
              </div>
            </div>

            {chart?.variables?.determination && chart?.variables?.environment && chart?.variables?.perspective && chart?.variables?.awareness && (
              <div className="pt-3 border-t border-gray-700">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Variables</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-gray-800/50 rounded">
                    <span className="text-lg">{chart.variables.determination.arrow === 'left' ? '◀' : '▶'}</span>
                    <p className="text-gray-400">Diet</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded">
                    <span className="text-lg">{chart.variables.environment.arrow === 'left' ? '◀' : '▶'}</span>
                    <p className="text-gray-400">Environment</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded">
                    <span className="text-lg">{chart.variables.perspective.arrow === 'left' ? '◀' : '▶'}</span>
                    <p className="text-gray-400">Perspective</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded">
                    <span className="text-lg">{chart.variables.awareness.arrow === 'left' ? '◀' : '▶'}</span>
                    <p className="text-gray-400">Awareness</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default HumanDesignPage
