/**
 * Gematria Page Component
 *
 * Interactive gematria calculator with multiple cipher systems.
 * Discover the numeric essence of words and find hidden connections.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hash, BookOpen, User, History, Sparkles } from 'lucide-react'
import { useGematriaStore } from '@/store/gematriaStore'
import { useUserProfileStore, type UserProfile } from '@/store/userProfileStore'
import { CalculatorPanel } from './components/CalculatorPanel'
import { ResultDisplay } from './components/ResultDisplay'
import { EquivalencePanel } from './components/EquivalencePanel'
import type { GematriaSystem, NumberMeaning, AllSystemsResult, EquivalentWord } from '@/lib/api/gematria'
import { getValueColorClass, isSignificantNumber } from '@/lib/api/gematria'

type ViewMode = 'calculator' | 'meanings' | 'profiles'

interface AnalysisHistoryItem {
  text: string
  analysis: AllSystemsResult
  timestamp: number
}

export const GematriaPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('calculator')

  // Get user profile for profile analysis
  const { profile } = useUserProfileStore()

  const {
    currentAnalysis,
    meanings,
    equivalences,
    selectedValue,
    isLoading,
    isCalculating,
    error,
    analysisHistory,
    calculate,
    analyze,
    fetchEquivalences,
    fetchMeaning,
    fetchAllMeanings,
    analyzeProfile,
    setSelectedValue,
    clearAnalysis,
    clearError,
  } = useGematriaStore()

  // Load meanings on mount
  useEffect(() => {
    if (Object.keys(meanings).length === 0) {
      fetchAllMeanings()
    }
  }, [])

  // Handle calculation
  const handleCalculate = useCallback(
    async (text: string, system: GematriaSystem) => {
      await analyze(text)
    },
    [analyze]
  )

  // Handle clicking on a value to see equivalences
  const handleValueClick = useCallback(
    async (value: number, system: string) => {
      setSelectedValue(value)
      const dbSystem = system === 'hebrew' || system === 'transliteration' ? 'hebrew' : 'english'
      await Promise.all([
        fetchEquivalences(value, dbSystem),
        fetchMeaning(value),
      ])
    },
    [fetchEquivalences, fetchMeaning, setSelectedValue]
  )

  // Get the meaning for selected value
  const selectedMeaning: NumberMeaning | null = selectedValue
    ? meanings[selectedValue] || null
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-gradient-celestial">
            Gematria
          </h1>
          <p className="text-gray-400 mt-1">
            Discover the numeric essence hidden within words
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'calculator' as const, icon: Hash, label: 'Calculator' },
            { id: 'meanings' as const, icon: BookOpen, label: 'Meanings' },
            { id: 'profiles' as const, icon: User, label: 'Profiles' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === id
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-cosmic-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center justify-between"
          >
            <p className="text-red-400">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'calculator' && (
          <CalculatorView
            currentAnalysis={currentAnalysis}
            equivalences={equivalences}
            selectedValue={selectedValue}
            selectedMeaning={selectedMeaning}
            isCalculating={isCalculating}
            isLoading={isLoading}
            analysisHistory={analysisHistory}
            onCalculate={handleCalculate}
            onValueClick={handleValueClick}
            onClearValue={() => setSelectedValue(null)}
            onClear={clearAnalysis}
          />
        )}

        {viewMode === 'meanings' && (
          <MeaningsView
            meanings={meanings}
            isLoading={isLoading}
            onSelectNumber={(num) => handleValueClick(num, 'hebrew')}
          />
        )}

        {viewMode === 'profiles' && (
          <ProfilesView
            profile={profile}
            currentAnalysis={currentAnalysis}
            isCalculating={isCalculating}
            onAnalyzeProfile={() => {
              if (profile.name) {
                analyze(profile.name)
              }
            }}
            onValueClick={handleValueClick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Calculator View
// ============================================================================

interface CalculatorViewProps {
  currentAnalysis: AllSystemsResult | null
  equivalences: EquivalentWord[]
  selectedValue: number | null
  selectedMeaning: NumberMeaning | null
  isCalculating: boolean
  isLoading: boolean
  analysisHistory: AnalysisHistoryItem[]
  onCalculate: (text: string, system: GematriaSystem) => void
  onValueClick: (value: number, system: string) => void
  onClearValue: () => void
  onClear: () => void
}

const CalculatorView = ({
  currentAnalysis,
  equivalences,
  selectedValue,
  selectedMeaning,
  isCalculating,
  isLoading,
  analysisHistory,
  onCalculate,
  onValueClick,
  onClearValue,
  onClear,
}: CalculatorViewProps) => {
  return (
    <motion.div
      key="calculator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-6"
    >
      {/* Input Panel */}
      <div className="space-y-4">
        <CalculatorPanel onCalculate={onCalculate} isCalculating={isCalculating} />

        {/* History */}
        {analysisHistory.length > 0 && (
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Recent</span>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {analysisHistory.slice(0, 10).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onCalculate(item.text, 'all')}
                  className="w-full text-left px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-cosmic-800/50 rounded transition-colors truncate"
                  dir="auto"
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      <div className="lg:col-span-2">
        <ResultDisplay analysis={currentAnalysis} onValueClick={onValueClick} />
      </div>

      {/* Equivalences Panel */}
      <div>
        <EquivalencePanel
          value={selectedValue}
          equivalences={equivalences}
          meaning={selectedMeaning}
          isLoading={isLoading}
          onClose={onClearValue}
        />
      </div>
    </motion.div>
  )
}

// ============================================================================
// Meanings View
// ============================================================================

interface MeaningsViewProps {
  meanings: Record<number, NumberMeaning>
  isLoading: boolean
  onSelectNumber: (num: number) => void
}

const MeaningsView = ({ meanings, isLoading, onSelectNumber }: MeaningsViewProps) => {
  const [selectedNum, setSelectedNum] = useState<number | null>(null)

  const sortedNumbers = Object.keys(meanings)
    .map(Number)
    .sort((a, b) => a - b)

  const handleSelect = (num: number) => {
    setSelectedNum(num)
    onSelectNumber(num)
  }

  return (
    <motion.div
      key="meanings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Number Grid */}
      <div className="glass-strong rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Significant Numbers
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-[500px] overflow-y-auto">
            {sortedNumbers.map((num) => (
              <button
                key={num}
                onClick={() => handleSelect(num)}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  selectedNum === num
                    ? `${getValueColorClass(num)} bg-cosmic-700 ring-2 ring-current`
                    : 'bg-cosmic-800 text-gray-300 hover:bg-cosmic-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meaning Detail */}
      <div className="lg:col-span-2 glass-strong rounded-xl p-6">
        {selectedNum && meanings[selectedNum] ? (
          <MeaningDetail number={selectedNum} meaning={meanings[selectedNum]} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a number to view its significance</p>
            <p className="text-sm mt-2">
              These are numbers with known spiritual meaning in gematria
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface MeaningDetailProps {
  number: number
  meaning: NumberMeaning
}

const MeaningDetail = ({ number, meaning }: MeaningDetailProps) => (
  <div>
    <div className="text-center mb-6">
      <span className={`text-6xl font-bold ${getValueColorClass(number)}`}>
        {number}
      </span>
      {isSignificantNumber(number) && (
        <Sparkles className="h-6 w-6 inline ml-2 text-amber-400" />
      )}
      <h3 className="text-2xl font-medium text-white mt-2">{meaning.name}</h3>
    </div>

    {meaning.keywords && meaning.keywords.length > 0 && (
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {meaning.keywords.map((kw) => (
          <span
            key={kw}
            className={`px-3 py-1 rounded-full text-sm ${getValueColorClass(number)} bg-cosmic-700/50 border border-current/30`}
          >
            {kw}
          </span>
        ))}
      </div>
    )}

    <div className="bg-cosmic-800/50 rounded-lg p-4 mb-4">
      <p className="text-gray-300">{meaning.meaning}</p>
    </div>

    {meaning.hebrew_connection && (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-sm text-amber-300 italic">{meaning.hebrew_connection}</p>
      </div>
    )}
  </div>
)

// ============================================================================
// Profiles View
// ============================================================================

interface ProfilesViewProps {
  profile: UserProfile
  currentAnalysis: AllSystemsResult | null
  isCalculating: boolean
  onAnalyzeProfile: () => void
  onValueClick: (value: number, system: string) => void
}

const ProfilesView = ({
  profile,
  currentAnalysis,
  isCalculating,
  onAnalyzeProfile,
  onValueClick,
}: ProfilesViewProps) => {
  return (
    <motion.div
      key="profiles"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="glass-strong rounded-xl p-6">
        <h3 className="text-xl font-medium text-white mb-6 text-center">
          Analyze Your Name
        </h3>

        {profile.name ? (
          <div className="text-center mb-6">
            <p className="text-2xl text-white mb-2">{profile.name}</p>
            {profile.birthDate && (
              <p className="text-gray-400 text-sm">
                Born {new Date(profile.birthDate).toLocaleDateString()}
              </p>
            )}

            <button
              onClick={onAnalyzeProfile}
              disabled={isCalculating}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? 'Analyzing...' : 'Analyze My Name'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No profile found</p>
            <p className="text-sm mt-2">
              Set up your birth data to analyze your name
            </p>
          </div>
        )}

        {/* Results */}
        {currentAnalysis && profile.name && (
          <div className="mt-6 pt-6 border-t border-cosmic-700">
            <ResultDisplay
              analysis={currentAnalysis}
              onValueClick={onValueClick}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default GematriaPage
