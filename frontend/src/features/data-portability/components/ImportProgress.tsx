/**
 * ImportProgress Component
 *
 * Displays real-time import progress with animations
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { Spinner } from '@/components/ui'
import type { ImportProgress as ImportProgressType, ImportResult } from '@/types/import'

interface ImportProgressProps {
  progress: ImportProgressType | null
  result: ImportResult | null
  isLoading: boolean
  error?: string | null
}

export function ImportProgress({
  progress,
  result,
  isLoading,
  error,
}: ImportProgressProps) {
  const [dots, setDots] = useState('')

  // Animate loading dots
  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)

    return () => clearInterval(interval)
  }, [isLoading])

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatETA = (ms?: number): string => {
    if (!ms || ms <= 0) return 'Calculating...'
    if (ms < 1000) return 'Less than a second'
    if (ms < 60000) return `${Math.ceil(ms / 1000)} seconds`
    return `${Math.ceil(ms / 60000)} minutes`
  }

  // Show completed state
  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        {/* Success/Error Header */}
        <div
          className={`glass-medium rounded-xl border p-8 ${
            result.success
              ? 'border-green-500/30 bg-green-950/10'
              : 'border-red-500/30 bg-red-950/10'
          }`}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className={`rounded-full p-6 ${
                result.success ? 'bg-green-600/20' : 'bg-red-600/20'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-16 w-16 text-green-400" />
              ) : (
                <AlertCircle className="h-16 w-16 text-red-400" />
              )}
            </motion.div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {result.success ? 'Import Complete!' : 'Import Failed'}
              </h3>
              <p className="text-gray-400">
                {result.success
                  ? 'Your data has been successfully imported'
                  : 'There was an error during the import process'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 w-full max-w-2xl mt-4">
              <StatCard
                label="Inserted"
                value={result.insertedRecords}
                icon={TrendingUp}
                color="text-green-400"
              />
              <StatCard
                label="Updated"
                value={result.updatedRecords}
                icon={Database}
                color="text-blue-400"
              />
              <StatCard
                label="Skipped"
                value={result.skippedRecords}
                icon={FileText}
                color="text-gray-400"
              />
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Completed in {formatDuration(result.duration)}</span>
            </div>
          </div>
        </div>

        {/* Summary Breakdown */}
        {result.summary && Object.values(result.summary).some((v) => v && v > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-medium rounded-xl border border-cosmic-700/30 p-6"
          >
            <h4 className="text-sm font-semibold text-white mb-4">
              Import Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.summary.clients !== undefined && result.summary.clients > 0 && (
                <SummaryItem label="Clients" value={result.summary.clients} />
              )}
              {result.summary.birthData !== undefined && result.summary.birthData > 0 && (
                <SummaryItem label="Birth Data" value={result.summary.birthData} />
              )}
              {result.summary.charts !== undefined && result.summary.charts > 0 && (
                <SummaryItem label="Charts" value={result.summary.charts} />
              )}
              {result.summary.sessionNotes !== undefined && result.summary.sessionNotes > 0 && (
                <SummaryItem label="Session Notes" value={result.summary.sessionNotes} />
              )}
            </div>
          </motion.div>
        )}

        {/* Errors/Warnings */}
        {(result.errors.length > 0 || result.warnings.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {result.errors.length > 0 && (
              <div className="glass-medium rounded-xl border border-red-500/30 bg-red-950/10 p-4">
                <h4 className="text-sm font-semibold text-red-400 mb-2">
                  Errors ({result.errors.length})
                </h4>
                <div className="space-y-1">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <p key={i} className="text-xs text-red-300/80">
                      {error.message}
                    </p>
                  ))}
                  {result.errors.length > 5 && (
                    <p className="text-xs text-red-400 mt-2">
                      +{result.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="glass-medium rounded-xl border border-yellow-500/30 bg-yellow-950/10 p-4">
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                  Warnings ({result.warnings.length})
                </h4>
                <div className="space-y-1">
                  {result.warnings.slice(0, 5).map((warning, i) => (
                    <p key={i} className="text-xs text-yellow-300/80">
                      {warning.message}
                    </p>
                  ))}
                  {result.warnings.length > 5 && (
                    <p className="text-xs text-yellow-400 mt-2">
                      +{result.warnings.length - 5} more warnings
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Backup Info */}
        {result.backupPath && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-medium rounded-xl border border-cosmic-700/30 p-4"
          >
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-cosmic-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">
                  Backup Created
                </p>
                <p className="text-xs text-gray-400">
                  A backup was created before import at:
                </p>
                <code className="text-xs text-cosmic-300 mt-1 block">
                  {result.backupPath}
                </code>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    )
  }

  // Show error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-medium rounded-xl border border-red-500/30 bg-red-950/10 p-8"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-red-600/20 p-6">
            <AlertCircle className="h-16 w-16 text-red-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Import Failed</h3>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Show progress state
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-medium rounded-xl border border-cosmic-700/30 p-8"
    >
      <div className="flex flex-col items-center text-center gap-6">
        {/* Spinner */}
        <div className="relative">
          <Spinner size="lg" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <Database className="h-16 w-16 text-cosmic-400/30" />
          </motion.div>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Importing Data{dots}
          </h3>
          <p className="text-gray-400">{progress?.currentOperation || 'Processing...'}</p>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="w-full max-w-md space-y-2">
            <div className="h-3 bg-cosmic-900/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cosmic-600 to-cosmic-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {progress.recordsProcessed} / {progress.totalRecords} records
              </span>
              <span className="font-semibold text-cosmic-300">
                {Math.round(progress.percentage)}%
              </span>
            </div>
          </div>
        )}

        {/* ETA */}
        {progress?.eta !== undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Estimated time remaining: {formatETA(progress.eta)}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Stat Card
 */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: any
  color: string
}) {
  return (
    <div className="glass-medium rounded-lg border border-cosmic-700/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  )
}

/**
 * Summary Item
 */
function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value.toLocaleString()}</p>
    </div>
  )
}
