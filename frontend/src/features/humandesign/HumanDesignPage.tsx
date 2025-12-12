/**
 * Human Design Page
 *
 * Main page for Human Design chart visualization and analysis
 */
import React, { useEffect, useState, useMemo } from 'react'
import { useHDStore } from './stores/hdStore'
import { BodyGraph } from './components/BodyGraph'
import { Controls } from './components/Controls'
import { AIReading } from './components/AIReading'
import { CenterDetailModal } from './components/CenterDetailModal'
import { listBirthData } from '@/lib/api/birthData'
import type { GateActivation, CenterDefinition, ChannelDefinition } from './types'

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
    selection,
    calculateChart,
    clearSelection,
    zodiac,
    siderealMethod,
    ayanamsa,
  } = useHDStore()

  // Compute active gates map and active channels for the modal
  const { activeGates, activeChannels, centerDefinitions } = useMemo(() => {
    if (!chart) {
      return {
        activeGates: new Map<number, 'personality' | 'design' | 'both'>(),
        activeChannels: new Set<string>(),
        centerDefinitions: new Map<string, boolean>(),
      }
    }

    const personalityArr = Array.isArray(chart.personality_activations) ? chart.personality_activations : []
    const designArr = Array.isArray(chart.design_activations) ? chart.design_activations : []
    const channelsArr = Array.isArray(chart.channels) ? chart.channels : []
    const centersArr = Array.isArray(chart.centers) ? chart.centers : []

    const personality = new Set(personalityArr.map((a: GateActivation) => a.gate))
    const design = new Set(designArr.map((a: GateActivation) => a.gate))

    // Build active gates map
    const gatesMap = new Map<number, 'personality' | 'design' | 'both'>()
    personalityArr.forEach((a: GateActivation) => {
      gatesMap.set(a.gate, design.has(a.gate) ? 'both' : 'personality')
    })
    designArr.forEach((a: GateActivation) => {
      if (!gatesMap.has(a.gate)) {
        gatesMap.set(a.gate, 'design')
      }
    })

    // Build active channels set
    const channels = new Set<string>()
    channelsArr.forEach((c: ChannelDefinition) => {
      if (c.channel_id) {
        channels.add(c.channel_id)
        const [g1, g2] = c.channel_id.split('-')
        channels.add(`${g2}-${g1}`)
      }
    })

    // Build center definitions map
    const centerDefs = new Map(centersArr.map((c: CenterDefinition) => [c.center, c.defined]))

    return {
      activeGates: gatesMap,
      activeChannels: channels,
      centerDefinitions: centerDefs,
    }
  }, [chart])

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
    <div className="flex-1 overflow-hidden relative">
      {/* Cosmic background that extends across entire page */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #1E1B4B 0%, #0F172A 40%, #020617 100%)',
        }}
      />

      {/* Subtle star field overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 3) * 0.5}px`,
              height: `${1 + (i % 3) * 0.5}px`,
              left: `${(i * 17 + 5) % 100}%`,
              top: `${(i * 23 + 3) % 100}%`,
              opacity: 0.3 + (i % 5) * 0.15,
            }}
          />
        ))}
      </div>

      <div className="h-full flex flex-col lg:flex-row relative z-10">
        {/* Left Sidebar - Floating glass panel */}
        <aside className="w-full lg:w-52 xl:w-56 backdrop-blur-sm bg-gray-900/40 border-b lg:border-b-0 lg:border-r border-white/5 p-3 overflow-y-auto flex-shrink-0">
          <h1 className="text-base font-medium text-white/90 mb-3 flex items-center gap-2">
            <span className="text-celestial-gold text-lg">⬡</span>
            Human Design
          </h1>
          <Controls />
        </aside>

        {/* Main Content - Chart dominates */}
        <main className="flex-1 flex overflow-hidden relative">
          {viewMode === 'reading' ? (
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
              <AIReading birthDataId={birthDataId} className="max-w-3xl mx-auto" />
            </div>
          ) : (
            <>
              {/* Body Graph - edge to edge, no container */}
              <div className="flex-1 flex items-center justify-center p-0 min-h-0 relative">
                <BodyGraph className="w-full h-full max-w-3xl" />
              </div>

              {/* Floating info panel - glass morphism */}
              <aside className="w-64 xl:w-72 backdrop-blur-md bg-gray-900/50 border-l border-white/5 p-4 overflow-y-auto flex-shrink-0 hidden lg:flex flex-col gap-4">
                {/* Type Card - Hero element */}
                <div className="text-center py-4 px-3 bg-gradient-to-b from-gray-800/50 to-transparent rounded-xl border border-white/5">
                  <span className="text-4xl mb-2 block drop-shadow-lg">
                    {(chart?.type || chart?.hd_type) === 'Generator' && '⚡'}
                    {(chart?.type || chart?.hd_type) === 'Manifesting Generator' && '⚡✨'}
                    {(chart?.type || chart?.hd_type) === 'Projector' && '👁'}
                    {(chart?.type || chart?.hd_type) === 'Manifestor' && '🔥'}
                    {(chart?.type || chart?.hd_type) === 'Reflector' && '🌙'}
                  </span>
                  <h3 className="text-lg font-semibold text-celestial-gold tracking-wide">
                    {(chart?.type || chart?.hd_type) || '...'}
                  </h3>
                  <p className="text-xs text-white/60 mt-1 italic">{chart?.strategy || ''}</p>
                </div>

                {/* Key attributes - minimal grid */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline py-1.5 border-b border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Authority</span>
                    <span className="text-sm text-white/90">{chart?.authority || ''}</span>
                  </div>
                  <div className="flex justify-between items-baseline py-1.5 border-b border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Profile</span>
                    <span className="text-sm text-white/90">{chart?.profile?.name || ''}</span>
                  </div>
                  <div className="flex justify-between items-baseline py-1.5 border-b border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Definition</span>
                    <span className="text-sm text-white/90">{chart?.definition?.replace('_', ' ') || ''}</span>
                  </div>
                  <div className="py-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Incarnation Cross</span>
                    <span className="text-xs text-celestial-gold leading-tight block">{chart?.incarnation_cross?.name || ''}</span>
                  </div>
                </div>

                {/* Channels - scrollable list */}
                {chart?.channels && chart.channels.length > 0 && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-2 flex-shrink-0">
                      Channels ({chart.channels.length})
                    </h4>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {chart.channels.map((channel: { channel_id?: string; name?: string }) => (
                        <div
                          key={channel.channel_id}
                          className="text-xs py-2 px-2.5 bg-white/5 rounded-lg flex justify-between items-center hover:bg-white/10 cursor-pointer transition-all duration-200 group"
                        >
                          <span className="text-white/80 group-hover:text-white">{channel.name}</span>
                          <span className="text-white/30 text-[10px] font-mono">{channel.channel_id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variables - compact row */}
                {chart?.variables?.determination && chart?.variables?.environment && (
                  <div className="pt-2 border-t border-white/5 flex-shrink-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Variables</span>
                      <div className="flex gap-2 text-lg">
                        <span title="Determination" className="opacity-70 hover:opacity-100 cursor-help">
                          {chart.variables.determination.arrow === 'left' ? '◀' : '▶'}
                        </span>
                        <span title="Environment" className="opacity-70 hover:opacity-100 cursor-help">
                          {chart.variables.environment.arrow === 'left' ? '◀' : '▶'}
                        </span>
                        <span title="Perspective" className="opacity-70 hover:opacity-100 cursor-help">
                          {chart.variables.perspective?.arrow === 'left' ? '◀' : '▶'}
                        </span>
                        <span title="Awareness" className="opacity-70 hover:opacity-100 cursor-help">
                          {chart.variables.awareness?.arrow === 'left' ? '◀' : '▶'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </>
          )}
        </main>
      </div>

      {/* Center Detail Modal */}
      {selection.type === 'center' && selection.id && (
        <CenterDetailModal
          centerName={selection.id as string}
          defined={centerDefinitions.get(selection.id as string) ?? false}
          activeGates={activeGates}
          allActiveChannels={activeChannels}
          onClose={clearSelection}
        />
      )}
    </div>
  )
}

export default HumanDesignPage
