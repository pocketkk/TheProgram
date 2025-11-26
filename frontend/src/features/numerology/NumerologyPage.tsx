/**
 * Numerology Page Component
 *
 * Interactive numerology calculator with profile analysis.
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hash, Calendar, User, Heart, Search, Sparkles } from 'lucide-react'
import { useNumerologyStore } from '@/store/numerologyStore'
import { getNumberColorClass, isMasterNumber, formatDateForApi } from '@/lib/api/numerology'
import type { NumerologyProfile, NumberMeaning, NameAnalysis } from '@/lib/api/numerology'

type ViewMode = 'calculator' | 'meanings' | 'daily' | 'compatibility'

export const NumerologyPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('calculator')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [analyzeName, setAnalyzeName] = useState('')
  const [compNum1, setCompNum1] = useState('')
  const [compNum2, setCompNum2] = useState('')

  const {
    meanings,
    currentProfile,
    nameAnalysis,
    compatibility,
    dailyNumber,
    isLoading,
    isCalculating,
    error,
    selectedNumber,
    fetchAllMeanings,
    calculateFullProfile,
    analyzeNameNumber,
    checkCompatibility,
    fetchDailyNumber,
    setSelectedNumber,
    clearProfile,
    clearError,
  } = useNumerologyStore()

  // Load initial data
  useEffect(() => {
    if (Object.keys(meanings).length === 0) {
      fetchAllMeanings()
    }
    if (!dailyNumber) {
      fetchDailyNumber()
    }
  }, [])

  const handleCalculate = async () => {
    if (fullName.trim() && birthDate) {
      await calculateFullProfile({
        full_name: fullName.trim(),
        birth_date: birthDate,
      })
    }
  }

  const handleNameAnalysis = async () => {
    if (analyzeName.trim().length >= 1) {
      await analyzeNameNumber(analyzeName.trim())
    }
  }

  const handleCompatibility = async () => {
    const num1 = parseInt(compNum1)
    const num2 = parseInt(compNum2)
    if (num1 >= 1 && num1 <= 9 && num2 >= 1 && num2 <= 9) {
      await checkCompatibility(num1, num2)
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
            Numerology
          </h1>
          <p className="text-gray-400 mt-1">
            Discover your numbers and their meanings
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'calculator' as const, icon: Hash, label: 'Calculator' },
            { id: 'meanings' as const, icon: Sparkles, label: 'Meanings' },
            { id: 'daily' as const, icon: Calendar, label: 'Daily' },
            { id: 'compatibility' as const, icon: Heart, label: 'Compatibility' },
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
        {viewMode === 'calculator' && (
          <CalculatorView
            fullName={fullName}
            setFullName={setFullName}
            birthDate={birthDate}
            setBirthDate={setBirthDate}
            analyzeName={analyzeName}
            setAnalyzeName={setAnalyzeName}
            currentProfile={currentProfile}
            nameAnalysis={nameAnalysis}
            isCalculating={isCalculating}
            onCalculate={handleCalculate}
            onAnalyzeName={handleNameAnalysis}
            onClear={clearProfile}
          />
        )}

        {viewMode === 'meanings' && (
          <MeaningsView
            meanings={meanings}
            selectedNumber={selectedNumber}
            isLoading={isLoading}
            onSelectNumber={setSelectedNumber}
          />
        )}

        {viewMode === 'daily' && (
          <DailyView dailyNumber={dailyNumber} isLoading={isLoading} />
        )}

        {viewMode === 'compatibility' && (
          <CompatibilityView
            compNum1={compNum1}
            setCompNum1={setCompNum1}
            compNum2={compNum2}
            setCompNum2={setCompNum2}
            compatibility={compatibility}
            isCalculating={isCalculating}
            onCheck={handleCompatibility}
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
  fullName: string
  setFullName: (name: string) => void
  birthDate: string
  setBirthDate: (date: string) => void
  analyzeName: string
  setAnalyzeName: (name: string) => void
  currentProfile: NumerologyProfile | null
  nameAnalysis: NameAnalysis | null
  isCalculating: boolean
  onCalculate: () => void
  onAnalyzeName: () => void
  onClear: () => void
}

const CalculatorView = ({
  fullName,
  setFullName,
  birthDate,
  setBirthDate,
  analyzeName,
  setAnalyzeName,
  currentProfile,
  nameAnalysis,
  isCalculating,
  onCalculate,
  onAnalyzeName,
  onClear,
}: CalculatorViewProps) => {
  return (
    <motion.div
      key="calculator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Input Panel */}
      <div className="space-y-6">
        {/* Profile Calculator */}
        <div className="glass-strong rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Calculate Your Numbers</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Birth Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="As it appears on birth certificate"
                className="w-full bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cosmic-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Birth Date</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cosmic-500"
              />
            </div>

            <button
              onClick={onCalculate}
              disabled={isCalculating || !fullName.trim() || !birthDate}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg font-medium hover:from-purple-500 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Hash className="h-5 w-5 animate-pulse" />
                  Calculating...
                </>
              ) : (
                <>
                  <Hash className="h-5 w-5" />
                  Calculate Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* Name Analyzer */}
        <div className="glass-strong rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Analyze Any Name</h3>

          <div className="space-y-4">
            <input
              type="text"
              value={analyzeName}
              onChange={(e) => setAnalyzeName(e.target.value)}
              placeholder="Enter name, word, or business name"
              className="w-full bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cosmic-500"
            />

            <button
              onClick={onAnalyzeName}
              disabled={isCalculating || !analyzeName.trim()}
              className="w-full py-2 bg-cosmic-700 text-white rounded-lg font-medium hover:bg-cosmic-600 transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4 inline mr-2" />
              Analyze
            </button>
          </div>

          {/* Name Analysis Result */}
          {nameAnalysis && (
            <div className="mt-4 p-4 bg-cosmic-800/50 rounded-lg">
              <div className="text-center mb-3">
                <span className={`text-4xl font-bold ${getNumberColorClass(nameAnalysis.number)}`}>
                  {nameAnalysis.number}
                </span>
                {isMasterNumber(nameAnalysis.number) && (
                  <span className="ml-2 text-xs text-amber-400">Master Number</span>
                )}
              </div>
              <p className="text-sm text-gray-400 text-center mb-2">
                "{nameAnalysis.name || analyzeName}" = {nameAnalysis.total} → {nameAnalysis.number}
              </p>
              <div className="flex flex-wrap gap-1 justify-center">
                {nameAnalysis.breakdown.map((item, idx) => (
                  <span key={idx} className="text-xs bg-cosmic-700 px-2 py-1 rounded">
                    {item.letter}={item.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Display */}
      <div className="lg:col-span-2">
        {currentProfile ? (
          <ProfileDisplay profile={currentProfile} onClear={onClear} />
        ) : (
          <div className="glass-strong rounded-xl p-8 h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Enter your details to calculate your numerology profile</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Profile Display
// ============================================================================

interface ProfileDisplayProps {
  profile: NumerologyProfile
  onClear: () => void
}

const ProfileDisplay = ({ profile, onClear }: ProfileDisplayProps) => {
  const { core_numbers, current_cycles } = profile

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-medium text-white">{profile.name}</h3>
          <p className="text-gray-400 text-sm">{new Date(profile.birth_date).toLocaleDateString()}</p>
        </div>
        <button onClick={onClear} className="text-sm text-gray-400 hover:text-white">
          Clear
        </button>
      </div>

      {/* Core Numbers */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-3">Core Numbers</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <NumberCard
            label="Life Path"
            number={core_numbers.life_path.number}
            description={core_numbers.life_path.name || ''}
          />
          <NumberCard
            label="Expression"
            number={core_numbers.expression.number}
            description={core_numbers.expression.name || ''}
          />
          <NumberCard
            label="Soul Urge"
            number={core_numbers.soul_urge.number}
            description={core_numbers.soul_urge.name || ''}
          />
          <NumberCard
            label="Personality"
            number={core_numbers.personality.number}
            description={core_numbers.personality.name || ''}
          />
          <NumberCard
            label="Birthday"
            number={core_numbers.birthday.number}
            description=""
          />
        </div>
      </div>

      {/* Current Cycles */}
      <div className="mb-6">
        <h4 className="text-sm text-gray-400 mb-3">Current Cycles</h4>
        <div className="grid grid-cols-3 gap-3">
          <NumberCard
            label="Personal Year"
            number={current_cycles.personal_year.number}
            description={current_cycles.personal_year.name || ''}
          />
          <NumberCard
            label="Personal Month"
            number={current_cycles.personal_month.number}
            description={current_cycles.personal_month.name || ''}
          />
          <NumberCard
            label="Personal Day"
            number={current_cycles.personal_day.number}
            description={current_cycles.personal_day.name || ''}
          />
        </div>
      </div>

      {/* Life Path Details */}
      <div className="bg-cosmic-800/50 rounded-lg p-4">
        <h4 className="text-white font-medium mb-2">
          Life Path {core_numbers.life_path.number}: {core_numbers.life_path.name}
        </h4>
        <p className="text-gray-300 text-sm mb-3">{core_numbers.life_path.meaning}</p>

        {core_numbers.life_path.keywords && (
          <div className="flex flex-wrap gap-2 mb-3">
            {core_numbers.life_path.keywords.map((kw) => (
              <span
                key={kw}
                className={`px-2 py-1 rounded text-xs ${getNumberColorClass(core_numbers.life_path.number)} bg-cosmic-700`}
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {core_numbers.life_path.positive && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-400 font-medium mb-1">Strengths</p>
              <ul className="text-gray-400 space-y-1">
                {core_numbers.life_path.positive.slice(0, 3).map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-orange-400 font-medium mb-1">Challenges</p>
              <ul className="text-gray-400 space-y-1">
                {core_numbers.life_path.challenges?.slice(0, 3).map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Number Card Component
// ============================================================================

interface NumberCardProps {
  label: string
  number: number
  description: string
}

const NumberCard = ({ label, number, description }: NumberCardProps) => (
  <div className="bg-cosmic-800/50 rounded-lg p-3 text-center">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${getNumberColorClass(number)}`}>
      {number}
    </p>
    {isMasterNumber(number) && (
      <p className="text-xs text-amber-400">Master</p>
    )}
    {description && (
      <p className="text-xs text-gray-400 mt-1 truncate">{description}</p>
    )}
  </div>
)

// ============================================================================
// Meanings View
// ============================================================================

interface MeaningsViewProps {
  meanings: Record<number, NumberMeaning>
  selectedNumber: number | null
  isLoading: boolean
  onSelectNumber: (num: number | null) => void
}

const MeaningsView = ({ meanings, selectedNumber, isLoading, onSelectNumber }: MeaningsViewProps) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]

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
        <h3 className="text-lg font-medium text-white mb-4">Select a Number</h3>

        <div className="grid grid-cols-4 gap-2">
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => onSelectNumber(num)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-lg font-bold transition-all ${
                selectedNumber === num
                  ? `${getNumberColorClass(num)} bg-cosmic-700 ring-2 ring-current`
                  : 'bg-cosmic-800 text-gray-300 hover:bg-cosmic-700'
              }`}
            >
              {num}
              {isMasterNumber(num) && (
                <span className="text-[8px] text-amber-400">Master</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Meaning Detail */}
      <div className="lg:col-span-2 glass-strong rounded-xl p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : selectedNumber && meanings[selectedNumber] ? (
          <MeaningDetail number={selectedNumber} meaning={meanings[selectedNumber]} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a number to view its meaning</p>
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
      <span className={`text-6xl font-bold ${getNumberColorClass(number)}`}>{number}</span>
      {isMasterNumber(number) && (
        <span className="ml-2 text-sm text-amber-400 align-top">Master Number</span>
      )}
      <h3 className="text-2xl font-medium text-white mt-2">{meaning.name}</h3>
    </div>

    <div className="flex flex-wrap gap-2 justify-center mb-6">
      {meaning.keywords.map((kw) => (
        <span
          key={kw}
          className={`px-3 py-1 rounded-full text-sm ${getNumberColorClass(number)} bg-cosmic-700/50 border border-current/30`}
        >
          {kw}
        </span>
      ))}
    </div>

    <div className="bg-cosmic-800/50 rounded-lg p-4 mb-4">
      <p className="text-gray-300">{meaning.meaning}</p>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <h4 className="text-green-400 font-medium mb-2">Positive Traits</h4>
        <ul className="space-y-1">
          {meaning.positive.map((trait) => (
            <li key={trait} className="text-gray-300 text-sm">• {trait}</li>
          ))}
        </ul>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
        <h4 className="text-orange-400 font-medium mb-2">Challenges</h4>
        <ul className="space-y-1">
          {meaning.challenges.map((challenge) => (
            <li key={challenge} className="text-gray-300 text-sm">• {challenge}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)

// ============================================================================
// Daily View
// ============================================================================

interface DailyViewProps {
  dailyNumber: { date: string; universal_day: number; guidance: string; name: string; keywords: string[]; meaning: string } | null
  isLoading: boolean
}

const DailyView = ({ dailyNumber, isLoading }: DailyViewProps) => (
  <motion.div
    key="daily"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="max-w-2xl mx-auto"
  >
    <div className="glass-strong rounded-xl p-8 text-center">
      {isLoading ? (
        <div className="py-12 text-gray-400">Loading...</div>
      ) : dailyNumber ? (
        <>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Calendar className="h-5 w-5 text-purple-400" />
            <span className="text-gray-400">
              {new Date(dailyNumber.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className={`text-7xl font-bold ${getNumberColorClass(dailyNumber.universal_day)} mb-4`}>
            {dailyNumber.universal_day}
          </div>

          <h3 className="text-2xl font-medium text-white mb-2">{dailyNumber.name}</h3>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {dailyNumber.keywords.map((kw) => (
              <span
                key={kw}
                className={`px-3 py-1 rounded-full text-sm ${getNumberColorClass(dailyNumber.universal_day)} bg-cosmic-700/50`}
              >
                {kw}
              </span>
            ))}
          </div>

          <div className="bg-cosmic-800/50 rounded-lg p-6 text-left">
            <h4 className="text-white font-medium mb-2">Daily Guidance</h4>
            <p className="text-gray-300">{dailyNumber.guidance}</p>
          </div>
        </>
      ) : (
        <div className="py-12 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Unable to load daily number</p>
        </div>
      )}
    </div>
  </motion.div>
)

// ============================================================================
// Compatibility View
// ============================================================================

interface CompatibilityViewProps {
  compNum1: string
  setCompNum1: (n: string) => void
  compNum2: string
  setCompNum2: (n: string) => void
  compatibility: { number1: number; number2: number; score: number; level: string; description: string } | null
  isCalculating: boolean
  onCheck: () => void
}

const CompatibilityView = ({
  compNum1,
  setCompNum1,
  compNum2,
  setCompNum2,
  compatibility,
  isCalculating,
  onCheck,
}: CompatibilityViewProps) => (
  <motion.div
    key="compatibility"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="max-w-2xl mx-auto"
  >
    <div className="glass-strong rounded-xl p-8">
      <h3 className="text-xl font-medium text-white text-center mb-6">
        Life Path Compatibility
      </h3>

      {/* Input */}
      <div className="flex items-center gap-4 justify-center mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1 text-center">Person 1</label>
          <input
            type="number"
            min="1"
            max="9"
            value={compNum1}
            onChange={(e) => setCompNum1(e.target.value)}
            placeholder="1-9"
            className="w-20 bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-cosmic-500"
          />
        </div>

        <Heart className="h-8 w-8 text-pink-400 mt-6" />

        <div>
          <label className="block text-sm text-gray-400 mb-1 text-center">Person 2</label>
          <input
            type="number"
            min="1"
            max="9"
            value={compNum2}
            onChange={(e) => setCompNum2(e.target.value)}
            placeholder="1-9"
            className="w-20 bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-cosmic-500"
          />
        </div>
      </div>

      <button
        onClick={onCheck}
        disabled={isCalculating || !compNum1 || !compNum2}
        className="w-full py-3 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-lg font-medium hover:from-pink-500 hover:to-pink-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Check Compatibility
      </button>

      {/* Result */}
      {compatibility && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-4 mb-2">
              <span className={`text-4xl font-bold ${getNumberColorClass(compatibility.number1)}`}>
                {compatibility.number1}
              </span>
              <Heart className="h-6 w-6 text-pink-400" />
              <span className={`text-4xl font-bold ${getNumberColorClass(compatibility.number2)}`}>
                {compatibility.number2}
              </span>
            </div>
          </div>

          {/* Score Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Compatibility Score</span>
              <span className="text-white font-medium">{compatibility.score}%</span>
            </div>
            <div className="h-3 bg-cosmic-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${compatibility.score}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${
                  compatibility.score >= 85
                    ? 'bg-green-500'
                    : compatibility.score >= 70
                    ? 'bg-teal-500'
                    : compatibility.score >= 55
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
                }`}
              />
            </div>
          </div>

          <div className="bg-cosmic-800/50 rounded-lg p-4 text-center">
            <p className={`text-lg font-medium mb-2 ${
              compatibility.level === 'Excellent'
                ? 'text-green-400'
                : compatibility.level === 'Good'
                ? 'text-teal-400'
                : compatibility.level === 'Moderate'
                ? 'text-yellow-400'
                : 'text-orange-400'
            }`}>
              {compatibility.level}
            </p>
            <p className="text-gray-300 text-sm">{compatibility.description}</p>
          </div>
        </motion.div>
      )}
    </div>
  </motion.div>
)

export default NumerologyPage
