/**
 * AIReading Component
 *
 * Displays the AI-generated full reading for the Myers-Briggs type.
 */
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { getTypeColor } from '@/lib/api/myersBriggs'
import type { MBFullReadingResponse, MBTypeResponse } from '../types'

interface AIReadingProps {
  reading: MBFullReadingResponse | null
  mbType: MBTypeResponse
  isLoading: boolean
  onGenerate: () => void
}

export function AIReading({
  reading,
  mbType,
  isLoading,
  onGenerate,
}: AIReadingProps) {
  const typeColor = getTypeColor(mbType.type_code)

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-400">Generating your personalized reading...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
      </div>
    )
  }

  if (!reading) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
        <Sparkles className="w-12 h-12 text-cosmic-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          AI-Powered Reading
        </h3>
        <p className="text-gray-400 text-center mb-6 max-w-md">
          Get a comprehensive, personalized interpretation of your
          {' '}{mbType.type_code} personality type powered by AI.
        </p>
        <Button onClick={onGenerate}>
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Reading
        </Button>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6" style={{ color: typeColor }} />
          <div>
            <h3 className="text-lg font-semibold text-white">
              Your {reading.type_code} Reading
            </h3>
            <p className="text-xs text-gray-500">
              Generated {new Date(reading.generated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGenerate}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Regenerate
        </Button>
      </div>

      {/* Reading Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="prose prose-invert prose-sm max-w-none"
      >
        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {reading.reading}
        </div>
      </motion.div>

      {/* Sections Summary */}
      {reading.sections && Object.keys(reading.sections).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 pt-6 border-t border-cosmic-700"
        >
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Quick Reference
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(reading.sections).map(([key, value]) => (
              value && (
                <div key={key} className="bg-cosmic-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 capitalize mb-1">
                    {key.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {value}
                  </div>
                </div>
              )
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
