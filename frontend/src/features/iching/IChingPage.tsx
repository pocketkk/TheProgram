/**
 * I-Ching Page Component
 *
 * Interactive I-Ching consultation with hexagram casting and interpretation.
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Compass, RefreshCw, Search, Calendar, Layers, ChevronRight } from 'lucide-react'
import { useIChingStore } from '@/store/ichingStore'
import { getLineVisual, getTrigramSymbol, formatHexagramName } from '@/lib/api/iching'
import type { Hexagram, Reading } from '@/lib/api/iching'

type ViewMode = 'oracle' | 'hexagrams' | 'trigrams' | 'daily'

export const IChingPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('oracle')
  const [question, setQuestion] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const {
    hexagrams,
    trigrams,
    currentReading,
    dailyHexagram,
    readingHistory,
    searchResults,
    isLoading,
    isReadingInProgress,
    error,
    selectedHexagram,
    castingMethod,
    fetchAllHexagrams,
    fetchTrigrams,
    performNewReading,
    performQuickCast,
    fetchDailyHexagram,
    searchForHexagrams,
    setCastingMethod,
    selectHexagram,
    clearCurrentReading,
    clearError,
  } = useIChingStore()

  // Load initial data
  useEffect(() => {
    if (Object.keys(hexagrams).length === 0) {
      fetchAllHexagrams()
    }
    if (Object.keys(trigrams).length === 0) {
      fetchTrigrams()
    }
    if (!dailyHexagram) {
      fetchDailyHexagram()
    }
  }, [])

  const handleConsult = async () => {
    if (question.trim()) {
      await performNewReading({ question: question.trim() })
    } else {
      await performQuickCast()
    }
    setQuestion('')
  }

  const handleSearch = async () => {
    if (searchKeyword.trim().length >= 2) {
      await searchForHexagrams(searchKeyword.trim())
    }
  }

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
            I-Ching Oracle
          </h1>
          <p className="text-gray-400 mt-1">
            Consult the ancient Book of Changes
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'oracle' as const, icon: Compass, label: 'Oracle' },
            { id: 'hexagrams' as const, icon: Layers, label: 'Hexagrams' },
            { id: 'trigrams' as const, icon: BookOpen, label: 'Trigrams' },
            { id: 'daily' as const, icon: Calendar, label: 'Daily' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === id
                  ? 'bg-cosmic-600 text-white'
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
        {viewMode === 'oracle' && (
          <OracleView
            question={question}
            setQuestion={setQuestion}
            castingMethod={castingMethod}
            setCastingMethod={setCastingMethod}
            currentReading={currentReading}
            readingHistory={readingHistory}
            isReadingInProgress={isReadingInProgress}
            onConsult={handleConsult}
            onClearReading={clearCurrentReading}
          />
        )}

        {viewMode === 'hexagrams' && (
          <HexagramsView
            hexagrams={hexagrams}
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
            searchResults={searchResults}
            selectedHexagram={selectedHexagram}
            isLoading={isLoading}
            onSearch={handleSearch}
            onSelectHexagram={selectHexagram}
          />
        )}

        {viewMode === 'trigrams' && (
          <TrigramsView trigrams={trigrams} isLoading={isLoading} />
        )}

        {viewMode === 'daily' && (
          <DailyView dailyHexagram={dailyHexagram} isLoading={isLoading} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Oracle View - Main consultation interface
// ============================================================================

interface OracleViewProps {
  question: string
  setQuestion: (q: string) => void
  castingMethod: 'coins' | 'yarrow'
  setCastingMethod: (m: 'coins' | 'yarrow') => void
  currentReading: Reading | null
  readingHistory: Reading[]
  isReadingInProgress: boolean
  onConsult: () => void
  onClearReading: () => void
}

const OracleView = ({
  question,
  setQuestion,
  castingMethod,
  setCastingMethod,
  currentReading,
  readingHistory,
  isReadingInProgress,
  onConsult,
  onClearReading,
}: OracleViewProps) => {
  return (
    <motion.div
      key="oracle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Consultation Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Question Input */}
        <div className="glass-strong rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Consult the Oracle</h3>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question, or leave blank for general guidance..."
            className="w-full bg-cosmic-900/50 border border-cosmic-700 rounded-lg p-4 text-white placeholder-gray-500 resize-none h-24 focus:outline-none focus:border-cosmic-500"
          />

          {/* Casting Method Selection */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-gray-400">Method:</span>
            <div className="flex gap-2">
              {[
                { id: 'coins' as const, label: 'Three Coins' },
                { id: 'yarrow' as const, label: 'Yarrow Stalks' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setCastingMethod(id)}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    castingMethod === id
                      ? 'bg-cosmic-600 text-white'
                      : 'bg-cosmic-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onConsult}
            disabled={isReadingInProgress}
            className="mt-4 w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isReadingInProgress ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Casting...
              </>
            ) : (
              <>
                <Compass className="h-5 w-5" />
                Cast the Oracle
              </>
            )}
          </button>
        </div>

        {/* Current Reading */}
        {currentReading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Your Reading</h3>
              <button
                onClick={onClearReading}
                className="text-sm text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>

            {currentReading.question && (
              <p className="text-gray-400 italic mb-4">
                "{currentReading.question}"
              </p>
            )}

            <ReadingDisplay reading={currentReading} />
          </motion.div>
        )}
      </div>

      {/* History Panel */}
      <div className="glass-strong rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">Recent Readings</h3>

        {readingHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No readings yet</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {readingHistory.map((reading, idx) => (
              <div
                key={`${reading.timestamp}-${idx}`}
                className="p-3 bg-cosmic-800/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 font-medium">
                    #{reading.primary_hexagram.number}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(reading.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-white">
                  {reading.primary_hexagram.english}
                </p>
                {reading.question && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    "{reading.question}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Reading Display Component
// ============================================================================

interface ReadingDisplayProps {
  reading: Reading
}

const ReadingDisplay = ({ reading }: ReadingDisplayProps) => {
  const { primary_hexagram, relating_hexagram, lines, changing_lines, interpretation } = reading

  return (
    <div className="space-y-6">
      {/* Hexagram Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary Hexagram */}
        <div className="text-center">
          <h4 className="text-sm text-gray-400 mb-2">Primary Hexagram</h4>
          <HexagramDisplay hexagram={primary_hexagram} lines={lines} />
        </div>

        {/* Relating Hexagram (if changing lines) */}
        {relating_hexagram && (
          <div className="text-center">
            <h4 className="text-sm text-gray-400 mb-2">Relating Hexagram</h4>
            <HexagramDisplay hexagram={relating_hexagram} />
          </div>
        )}
      </div>

      {/* Changing Lines */}
      {changing_lines.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <h4 className="text-amber-400 font-medium mb-2">Changing Lines</h4>
          <p className="text-gray-300 text-sm">
            Lines {changing_lines.join(', ')} are in motion, indicating transformation.
          </p>
        </div>
      )}

      {/* Interpretation */}
      <div className="bg-cosmic-800/50 rounded-lg p-4">
        <h4 className="text-white font-medium mb-2">Interpretation</h4>
        <p className="text-gray-300 whitespace-pre-wrap">{interpretation}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Hexagram Display Component
// ============================================================================

interface HexagramDisplayProps {
  hexagram: Hexagram
  lines?: { value: number; changing: boolean }[]
}

const HexagramDisplay = ({ hexagram, lines }: HexagramDisplayProps) => {
  // Generate lines from top to bottom (position 6 to 1)
  const displayLines = lines
    ? [...lines].reverse()
    : Array(6).fill({ value: 7, changing: false }) // Default stable yang

  return (
    <div className="inline-block">
      <div className="text-4xl font-bold text-amber-400 mb-2">
        #{hexagram.number}
      </div>

      {/* Visual Lines */}
      <div className="font-mono text-sm space-y-1 mb-3">
        {displayLines.map((line, idx) => (
          <div
            key={idx}
            className={`${line.changing ? 'text-amber-400' : 'text-gray-400'}`}
          >
            {getLineVisual(line.value)}
          </div>
        ))}
      </div>

      <div className="text-lg font-medium text-white">{hexagram.name}</div>
      <div className="text-gray-400">{hexagram.english}</div>

      {hexagram.keywords && hexagram.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {hexagram.keywords.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="px-2 py-0.5 bg-cosmic-700 rounded text-xs text-gray-300"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Hexagrams Reference View
// ============================================================================

interface HexagramsViewProps {
  hexagrams: Record<number, Hexagram>
  searchKeyword: string
  setSearchKeyword: (k: string) => void
  searchResults: Hexagram[]
  selectedHexagram: Hexagram | null
  isLoading: boolean
  onSearch: () => void
  onSelectHexagram: (h: Hexagram | null) => void
}

const HexagramsView = ({
  hexagrams,
  searchKeyword,
  setSearchKeyword,
  searchResults,
  selectedHexagram,
  isLoading,
  onSearch,
  onSelectHexagram,
}: HexagramsViewProps) => {
  const hexagramList = Object.entries(hexagrams)
    .map(([num, hex]) => ({ ...hex, number: parseInt(num) }))
    .sort((a, b) => a.number - b.number)

  const displayList = searchResults.length > 0 ? searchResults : hexagramList

  return (
    <motion.div
      key="hexagrams"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Hexagram Grid */}
      <div className="lg:col-span-2">
        {/* Search */}
        <div className="glass-strong rounded-xl p-4 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="Search hexagrams..."
              className="flex-1 bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cosmic-500"
            />
            <button
              onClick={onSearch}
              className="px-4 py-2 bg-cosmic-600 text-white rounded-lg hover:bg-cosmic-500 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="glass-strong rounded-xl p-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Loading hexagrams...</div>
          ) : (
            <div className="grid grid-cols-8 gap-2">
              {displayList.map((hex) => (
                <button
                  key={hex.number}
                  onClick={() => onSelectHexagram(hex)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    selectedHexagram?.number === hex.number
                      ? 'bg-amber-500 text-black'
                      : 'bg-cosmic-800 text-gray-300 hover:bg-cosmic-700'
                  }`}
                  title={`${hex.number}. ${hex.english}`}
                >
                  {hex.number}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="glass-strong rounded-xl p-6">
        {selectedHexagram ? (
          <div>
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-amber-400 mb-2">
                #{selectedHexagram.number}
              </div>
              <div className="text-xl font-medium text-white">
                {selectedHexagram.name}
              </div>
              <div className="text-gray-400">{selectedHexagram.english}</div>
            </div>

            {selectedHexagram.keywords && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {selectedHexagram.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-1 bg-cosmic-700 rounded text-sm text-gray-300"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-cosmic-800/50 rounded-lg p-4 mt-4">
              <h4 className="text-white font-medium mb-2">Meaning</h4>
              <p className="text-gray-300 text-sm">{selectedHexagram.meaning}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a hexagram to view details</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Trigrams Reference View
// ============================================================================

interface TrigramsViewProps {
  trigrams: Record<string, { name: string; chinese: string; attribute: string; image: string; family: string; direction: string; season: string; binary: string }>
  isLoading: boolean
}

const TrigramsView = ({ trigrams, isLoading }: TrigramsViewProps) => {
  const trigramList = Object.entries(trigrams)

  return (
    <motion.div
      key="trigrams"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-strong rounded-xl p-6"
    >
      <h3 className="text-lg font-medium text-white mb-6">The Eight Trigrams</h3>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading trigrams...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {trigramList.map(([key, trigram]) => (
            <div
              key={key}
              className="bg-cosmic-800/50 rounded-lg p-4 text-center"
            >
              <div className="text-4xl mb-2">{getTrigramSymbol(key)}</div>
              <div className="text-lg font-medium text-white">{trigram.name}</div>
              <div className="text-sm text-gray-400">{trigram.chinese}</div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <p>Image: {trigram.image}</p>
                <p>Attribute: {trigram.attribute}</p>
                <p>Direction: {trigram.direction}</p>
                <p>Season: {trigram.season}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Daily Hexagram View
// ============================================================================

interface DailyViewProps {
  dailyHexagram: { date: string; hexagram_number: number; hexagram: Hexagram; daily_guidance: string } | null
  isLoading: boolean
}

const DailyView = ({ dailyHexagram, isLoading }: DailyViewProps) => {
  return (
    <motion.div
      key="daily"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="glass-strong rounded-xl p-8 text-center">
        {isLoading ? (
          <div className="py-12 text-gray-400">Loading daily hexagram...</div>
        ) : dailyHexagram ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-amber-400" />
              <span className="text-gray-400">
                {new Date(dailyHexagram.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="text-6xl font-bold text-amber-400 mb-4">
              #{dailyHexagram.hexagram_number}
            </div>

            <div className="text-2xl font-medium text-white mb-2">
              {dailyHexagram.hexagram.name}
            </div>
            <div className="text-lg text-gray-400 mb-6">
              {dailyHexagram.hexagram.english}
            </div>

            {dailyHexagram.hexagram.keywords && (
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {dailyHexagram.hexagram.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-sm text-amber-400"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            <div className="bg-cosmic-800/50 rounded-lg p-6 text-left">
              <h4 className="text-white font-medium mb-2">Daily Guidance</h4>
              <p className="text-gray-300">{dailyHexagram.daily_guidance}</p>
            </div>
          </>
        ) : (
          <div className="py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Unable to load daily hexagram</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default IChingPage
