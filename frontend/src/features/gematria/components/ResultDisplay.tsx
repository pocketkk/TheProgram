/**
 * Result Display Component
 *
 * Displays gematria calculation results with letter breakdown.
 */
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import type { AllSystemsResult, GematriaResult, NumberMeaning } from '@/lib/api/gematria'
import { getValueColorClass, getSystemDisplayName, isSignificantNumber } from '@/lib/api/gematria'

interface ResultDisplayProps {
  analysis: AllSystemsResult | null
  onValueClick?: (value: number, system: string) => void
}

export const ResultDisplay = ({ analysis, onValueClick }: ResultDisplayProps) => {
  if (!analysis) {
    return (
      <div className="glass-strong rounded-xl p-8 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Enter text to calculate its gematria value</p>
          <p className="text-sm mt-2">Discover the hidden numeric essence of words</p>
        </div>
      </div>
    )
  }

  const systemEntries = Object.entries(analysis.systems).filter(
    ([_, result]) => result && result.value > 0
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-xl p-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-gray-400 text-sm mb-1">Analyzing</p>
        <h3 className="text-2xl font-medium text-white" dir="auto">
          "{analysis.original_text}"
        </h3>
      </div>

      {/* System Results */}
      <div className="space-y-4">
        {systemEntries.map(([systemName, result]) => (
          <SystemResult
            key={systemName}
            systemName={systemName}
            result={result!}
            onValueClick={onValueClick}
          />
        ))}
      </div>

      {systemEntries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No calculable characters found in the input</p>
        </div>
      )}
    </motion.div>
  )
}

interface SystemResultProps {
  systemName: string
  result: GematriaResult
  onValueClick?: (value: number, system: string) => void
}

const SystemResult = ({ systemName, result, onValueClick }: SystemResultProps) => {
  const isSignificant = isSignificantNumber(result.value)
  const colorClass = getValueColorClass(result.value)

  return (
    <div className="bg-cosmic-800/50 rounded-lg p-4">
      {/* System Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-400">
          {getSystemDisplayName(systemName)}
        </h4>
        <button
          onClick={() => onValueClick?.(result.value, systemName)}
          className={`text-3xl font-bold ${colorClass} hover:scale-110 transition-transform cursor-pointer`}
          title="Click to find equivalences"
        >
          {result.value}
          {isSignificant && (
            <Sparkles className="h-4 w-4 inline ml-1 text-amber-400" />
          )}
        </button>
      </div>

      {/* Hebrew text for transliteration */}
      {systemName === 'transliteration' && result.hebrew_text && (
        <div className="mb-3 text-center">
          <span className="text-lg text-amber-300" dir="rtl">
            {result.hebrew_text}
          </span>
        </div>
      )}

      {/* Reduction info */}
      {systemName === 'english_reduction' && result.final_reduction && (
        <div className="mb-3 flex items-center justify-center gap-2 text-sm text-gray-400">
          <span>{result.value}</span>
          <ArrowRight className="h-4 w-4" />
          <span className={`font-bold ${getValueColorClass(result.final_reduction)}`}>
            {result.final_reduction}
          </span>
          <span className="text-xs">(final reduction)</span>
        </div>
      )}

      {/* Letter Breakdown */}
      <div className="flex flex-wrap gap-1 justify-center">
        {result.breakdown.map((item, idx) => (
          <span
            key={idx}
            className="text-xs bg-cosmic-700 px-2 py-1 rounded flex items-center gap-1"
            dir="auto"
          >
            <span className="text-white">{item.letter}</span>
            <span className="text-gray-400">=</span>
            <span className={colorClass}>
              {item.reduced_value ?? item.value}
            </span>
          </span>
        ))}
      </div>

      {/* Meaning Preview */}
      {result.meaning && (
        <div className="mt-3 pt-3 border-t border-cosmic-700/50">
          <p className="text-xs text-amber-400 font-medium">{result.meaning.name}</p>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {result.meaning.meaning}
          </p>
        </div>
      )}

      {/* Equivalences Preview */}
      {result.equivalences && result.equivalences.length > 0 && (
        <div className="mt-3 pt-3 border-t border-cosmic-700/50">
          <p className="text-xs text-gray-500 mb-2">
            Words with same value:
          </p>
          <div className="flex flex-wrap gap-1">
            {result.equivalences.slice(0, 5).map((eq, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-cosmic-700/50 rounded text-gray-300"
                dir="auto"
                title={eq.meaning}
              >
                {eq.word}
                {eq.transliteration && (
                  <span className="text-gray-500 ml-1">({eq.transliteration})</span>
                )}
              </span>
            ))}
            {result.equivalences.length > 5 && (
              <span className="text-xs px-2 py-1 text-gray-500">
                +{result.equivalences.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
