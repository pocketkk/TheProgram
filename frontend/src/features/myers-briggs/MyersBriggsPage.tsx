/**
 * MyersBriggsPage Component
 *
 * Main page for the Myers-Briggs personality type analysis feature.
 * Derives MBTI type from astrological birth chart data.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, User } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { listBirthData, type BirthDataResponse } from '@/lib/api/birthData'
import { useMBStore } from './stores/mbStore'
import { TypeDisplay } from './components/TypeDisplay'
import { CognitiveStack } from './components/CognitiveStack'
import { DetailPanel } from './components/DetailPanel'
import { AIReading } from './components/AIReading'
import { Controls } from './components/Controls'

export function MyersBriggsPage() {
  const [birthDataList, setBirthDataList] = useState<BirthDataResponse[]>([])
  const [selectedBirthData, setSelectedBirthData] = useState<string | null>(null)
  const [loadingBirthData, setLoadingBirthData] = useState(true)

  const {
    mbType,
    reading,
    isLoading,
    isLoadingReading,
    error,
    viewMode,
    highlightedDichotomy,
    highlightedFunction,
    includeCorrelations,
    calculateType,
    generateReading,
    setViewMode,
    setHighlightedDichotomy,
    setHighlightedFunction,
    setIncludeCorrelations,
    reset,
  } = useMBStore()

  // Load birth data on mount
  useEffect(() => {
    const loadBirthData = async () => {
      try {
        const data = await listBirthData()
        setBirthDataList(data)
        if (data.length > 0 && !selectedBirthData) {
          setSelectedBirthData(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load birth data:', err)
      } finally {
        setLoadingBirthData(false)
      }
    }

    loadBirthData()
  }, [])

  // Calculate type when birth data is selected
  useEffect(() => {
    if (selectedBirthData) {
      calculateType(selectedBirthData)
    } else {
      reset()
    }
  }, [selectedBirthData, includeCorrelations])

  const handleRecalculate = () => {
    if (selectedBirthData) {
      calculateType(selectedBirthData)
    }
  }

  const handleGenerateReading = () => {
    if (selectedBirthData) {
      generateReading(selectedBirthData)
    }
  }

  // Loading state
  if (loadingBirthData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner size="lg" />
      </div>
    )
  }

  // No birth data state
  if (birthDataList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <User className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          No Birth Data Found
        </h2>
        <p className="text-gray-400 text-center max-w-md">
          Add your birth data to calculate your Myers-Briggs personality type
          based on astrological correspondences.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gradient-celestial">
            Myers-Briggs
          </h1>
          <p className="text-gray-400 mt-1">
            Personality type derived from astrological analysis
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Birth Data Selector */}
          <select
            value={selectedBirthData || ''}
            onChange={(e) => setSelectedBirthData(e.target.value)}
            className="bg-cosmic-800 border border-cosmic-600 rounded-lg px-4 py-2 text-white text-sm focus:ring-cosmic-500 focus:border-cosmic-500"
          >
            {birthDataList.map((bd) => (
              <option key={bd.id} value={bd.id}>
                {bd.name || 'Birth Chart'}
              </option>
            ))}
          </select>

          {/* Recalculate Button */}
          <Button
            variant="secondary"
            onClick={handleRecalculate}
            disabled={isLoading || !selectedBirthData}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-500/50 rounded-lg p-4"
        >
          <p className="text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">Analyzing your personality type...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {mbType && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls & Type Display */}
          <div className="space-y-6">
            <Controls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              includeCorrelations={includeCorrelations}
              onIncludeCorrelationsChange={setIncludeCorrelations}
            />

            <TypeDisplay
              mbType={mbType}
              onDichotomyHover={setHighlightedDichotomy}
            />
          </div>

          {/* Center Column - Main View */}
          <div className="lg:col-span-2">
            {viewMode === 'overview' && (
              <div className="space-y-6">
                <DetailPanel
                  mbType={mbType}
                  selectedDichotomy={highlightedDichotomy}
                />
                {mbType.cognitive_stack && (
                  <CognitiveStack
                    stack={mbType.cognitive_stack}
                    onFunctionHover={setHighlightedFunction}
                    highlightedFunction={highlightedFunction}
                  />
                )}
              </div>
            )}

            {viewMode === 'dichotomies' && (
              <DetailPanel
                mbType={mbType}
                selectedDichotomy={highlightedDichotomy}
              />
            )}

            {viewMode === 'cognitive' && mbType.cognitive_stack && (
              <CognitiveStack
                stack={mbType.cognitive_stack}
                onFunctionHover={setHighlightedFunction}
                highlightedFunction={highlightedFunction}
              />
            )}

            {viewMode === 'reading' && (
              <AIReading
                reading={reading}
                mbType={mbType}
                isLoading={isLoadingReading}
                onGenerate={handleGenerateReading}
              />
            )}
          </div>
        </div>
      )}

      {/* Astrological Correlations (if enabled) */}
      {mbType?.correlations && includeCorrelations && viewMode !== 'reading' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">
            Astrological Correlations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mbType.correlations.slice(0, 9).map((correlation, index) => (
              <div
                key={index}
                className="bg-cosmic-800/50 rounded-lg p-4"
              >
                <div className="text-sm font-medium text-white mb-2">
                  {correlation.element}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.entries(correlation.influences).map(([letter, weight]) => (
                    <span
                      key={letter}
                      className="text-xs px-2 py-0.5 rounded-full bg-cosmic-700"
                      style={{
                        color: mbType.type_code.includes(letter)
                          ? '#10B981'
                          : '#9CA3AF'
                      }}
                    >
                      {letter}: {weight.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default MyersBriggsPage
