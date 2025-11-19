/**
 * ValidationResults Component
 *
 * Displays validation results with errors, warnings, and data preview
 */
import { motion } from 'framer-motion'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  FileText,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import type { ValidationResult, ImportError } from '@/types/import'

interface ValidationResultsProps {
  result: ValidationResult
}

export function ValidationResults({ result }: ValidationResultsProps) {
  const { isValid, errors, warnings, recordCount, previewRecords, estimatedDuration } = result

  const getSeverityIcon = (severity: ImportError['severity']) => {
    switch (severity) {
      case 'error':
        return AlertCircle
      case 'warning':
        return AlertTriangle
      case 'info':
        return Info
      default:
        return Info
    }
  }

  const getSeverityColor = (severity: ImportError['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-400 bg-red-950/20 border-red-500/30'
      case 'warning':
        return 'text-yellow-400 bg-yellow-950/20 border-yellow-500/30'
      case 'info':
        return 'text-blue-400 bg-blue-950/20 border-blue-500/30'
      default:
        return 'text-gray-400 bg-gray-950/20 border-gray-500/30'
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-medium rounded-xl border p-6 ${
          isValid
            ? 'border-green-500/30 bg-green-950/10'
            : 'border-red-500/30 bg-red-950/10'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`rounded-lg p-3 ${
              isValid ? 'bg-green-600/20' : 'bg-red-600/20'
            }`}
          >
            {isValid ? (
              <CheckCircle className="h-8 w-8 text-green-400" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">
              {isValid ? 'Validation Passed' : 'Validation Failed'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {isValid
                ? 'Your file is valid and ready to import'
                : 'Please fix the errors below before proceeding'}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cosmic-400" />
                <span className="text-sm text-white font-semibold">
                  {recordCount}
                </span>
                <span className="text-sm text-gray-400">records found</span>
              </div>

              {estimatedDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cosmic-400" />
                  <span className="text-sm text-white font-semibold">
                    ~{formatDuration(estimatedDuration)}
                  </span>
                  <span className="text-sm text-gray-400">estimated time</span>
                </div>
              )}

              {errors.length > 0 && (
                <Badge variant="destructive">
                  {errors.length} error{errors.length !== 1 ? 's' : ''}
                </Badge>
              )}

              {warnings.length > 0 && (
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30">
                  {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Errors */}
      {errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Errors ({errors.length})
          </h4>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <ErrorItem key={index} error={error} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <ErrorItem key={index} error={warning} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Data Preview */}
      {previewRecords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-cosmic-400" />
            Data Preview (first {previewRecords.length} records)
          </h4>
          <div className="glass-medium rounded-xl border border-cosmic-700/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cosmic-700/30 bg-cosmic-900/30">
                    {Object.keys(previewRecords[0] || {}).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-xs font-semibold text-cosmic-300 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRecords.map((record, index) => (
                    <tr
                      key={index}
                      className="border-b border-cosmic-700/20 hover:bg-cosmic-900/20 transition-colors"
                    >
                      {Object.values(record).map((value: any, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 text-gray-300 max-w-xs truncate"
                          title={String(value)}
                        >
                          {value === null || value === undefined
                            ? <span className="text-gray-600 italic">null</span>
                            : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/**
 * Individual error/warning item
 */
function ErrorItem({ error }: { error: ImportError }) {
  const Icon = getSeverityIcon(error.severity)
  const colorClass = getSeverityColor(error.severity)

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${colorClass}`}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium">{error.message}</p>
          {error.lineNumber && (
            <Badge variant="outline" className="flex-shrink-0">
              Line {error.lineNumber}
            </Badge>
          )}
        </div>
        {error.field && (
          <p className="text-xs opacity-80 mb-1">
            Field: <code className="font-mono">{error.field}</code>
          </p>
        )}
        {error.details && (
          <p className="text-xs opacity-70 mt-1">{error.details}</p>
        )}
      </div>
    </div>
  )
}

function getSeverityIcon(severity: ImportError['severity']) {
  switch (severity) {
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    default:
      return Info
  }
}

function getSeverityColor(severity: ImportError['severity']) {
  switch (severity) {
    case 'error':
      return 'text-red-400 bg-red-950/20 border-red-500/30'
    case 'warning':
      return 'text-yellow-400 bg-yellow-950/20 border-yellow-500/30'
    case 'info':
      return 'text-blue-400 bg-blue-950/20 border-blue-500/30'
    default:
      return 'text-gray-400 bg-gray-950/20 border-gray-500/30'
  }
}
