/**
 * Equivalence Panel Component
 *
 * Displays words that share the same gematria value.
 */
import { motion } from 'framer-motion'
import { Link2, BookOpen, Sparkles } from 'lucide-react'
import type { EquivalentWord, NumberMeaning } from '@/lib/api/gematria'
import { getValueColorClass } from '@/lib/api/gematria'

interface EquivalencePanelProps {
  value: number | null
  equivalences: EquivalentWord[]
  meaning: NumberMeaning | null
  isLoading: boolean
  onClose?: () => void
}

export const EquivalencePanel = ({
  value,
  equivalences,
  meaning,
  isLoading,
  onClose,
}: EquivalencePanelProps) => {
  if (!value) {
    return (
      <div className="glass-strong rounded-xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Equivalences
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Click on a gematria value to discover</p>
          <p className="text-sm">words sharing the same numeric essence</p>
        </div>
      </div>
    )
  }

  const colorClass = getValueColorClass(value)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-strong rounded-xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Equivalences
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Value Display */}
      <div className="text-center mb-6">
        <span className={`text-5xl font-bold ${colorClass}`}>{value}</span>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">
          <Sparkles className="h-8 w-8 mx-auto animate-pulse mb-2" />
          <p>Finding equivalences...</p>
        </div>
      ) : (
        <>
          {/* Number Meaning */}
          {meaning && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 font-medium">{meaning.name}</span>
              </div>
              <p className="text-sm text-gray-300">{meaning.meaning}</p>
              {meaning.keywords && meaning.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {meaning.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              {meaning.hebrew_connection && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  {meaning.hebrew_connection}
                </p>
              )}
            </div>
          )}

          {/* Equivalent Words */}
          {equivalences.length > 0 ? (
            <div>
              <p className="text-sm text-gray-400 mb-3">
                Words sharing this value:
              </p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {equivalences.map((word, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-cosmic-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium" dir="auto">
                        {word.word}
                      </span>
                      {word.transliteration && (
                        <span className="text-gray-400 text-sm">
                          {word.transliteration}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{word.meaning}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p>No known equivalences for this value</p>
              <p className="text-xs mt-1">
                This is a unique numeric signature
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
