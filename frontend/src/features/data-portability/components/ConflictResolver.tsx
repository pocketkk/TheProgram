/**
 * ConflictResolver Component
 *
 * Handles conflict resolution with side-by-side comparison
 */
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  SkipForward,
  GitMerge,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import type { ImportConflict, ConflictResolutionStrategy } from '@/types/import'

interface ConflictResolverProps {
  conflicts: ImportConflict[]
  onResolveConflict: (conflictId: string, resolution: ConflictResolutionStrategy) => void
  onResolveAll: (resolution: ConflictResolutionStrategy) => void
}

export function ConflictResolver({
  conflicts,
  onResolveConflict,
  onResolveAll,
}: ConflictResolverProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set(conflicts.slice(0, 3).map((c) => c.id))
  )

  const toggleExpanded = (conflictId: string) => {
    setExpandedConflicts((prev) => {
      const next = new Set(prev)
      if (next.has(conflictId)) {
        next.delete(conflictId)
      } else {
        next.add(conflictId)
      }
      return next
    })
  }

  const resolvedCount = useMemo(
    () => conflicts.filter((c) => c.resolution).length,
    [conflicts]
  )

  const unresolvedConflicts = useMemo(
    () => conflicts.filter((c) => !c.resolution),
    [conflicts]
  )

  const getConflictTypeLabel = (type: ImportConflict['type']): string => {
    switch (type) {
      case 'duplicate_id':
        return 'Duplicate ID'
      case 'unique_constraint':
        return 'Unique Constraint Violation'
      case 'missing_fk':
        return 'Missing Foreign Key'
      case 'data_type_mismatch':
        return 'Data Type Mismatch'
      default:
        return 'Unknown Conflict'
    }
  }

  const getConflictTypeColor = (type: ImportConflict['type']): string => {
    switch (type) {
      case 'duplicate_id':
        return 'bg-orange-600/20 text-orange-400 border-orange-500/30'
      case 'unique_constraint':
        return 'bg-red-600/20 text-red-400 border-red-500/30'
      case 'missing_fk':
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30'
      case 'data_type_mismatch':
        return 'bg-purple-600/20 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-500/30'
    }
  }

  const resolutionOptions: Array<{
    value: ConflictResolutionStrategy
    label: string
    icon: typeof Check
    description: string
  }> = [
    {
      value: 'keep_existing',
      label: 'Keep Existing',
      icon: Database,
      description: 'Keep the current database value',
    },
    {
      value: 'overwrite',
      label: 'Overwrite',
      icon: ArrowRight,
      description: 'Replace with imported value',
    },
    {
      value: 'skip',
      label: 'Skip',
      icon: SkipForward,
      description: 'Skip this record entirely',
    },
    {
      value: 'merge',
      label: 'Merge',
      icon: GitMerge,
      description: 'Combine both values if possible',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-medium rounded-xl border border-yellow-500/30 bg-yellow-950/10 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-yellow-600/20 p-3">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-2">
              Resolve Conflicts
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}{' '}
              detected. Please choose how to handle each conflict.
            </p>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-cosmic-900/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cosmic-600 to-cosmic-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(resolvedCount / conflicts.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-white">
                {resolvedCount} / {conflicts.length}
              </span>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {unresolvedConflicts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-yellow-500/20">
            <p className="text-sm text-gray-400 mb-3">Apply to all unresolved:</p>
            <div className="flex flex-wrap gap-2">
              {resolutionOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => onResolveAll(option.value)}
                >
                  <option.icon className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Conflicts List */}
      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <ConflictItem
            key={conflict.id}
            conflict={conflict}
            index={index}
            isExpanded={expandedConflicts.has(conflict.id)}
            onToggle={() => toggleExpanded(conflict.id)}
            onResolve={(resolution) => onResolveConflict(conflict.id, resolution)}
            resolutionOptions={resolutionOptions}
            getConflictTypeLabel={getConflictTypeLabel}
            getConflictTypeColor={getConflictTypeColor}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Individual conflict item
 */
interface ConflictItemProps {
  conflict: ImportConflict
  index: number
  isExpanded: boolean
  onToggle: () => void
  onResolve: (resolution: ConflictResolutionStrategy) => void
  resolutionOptions: Array<{
    value: ConflictResolutionStrategy
    label: string
    icon: any
    description: string
  }>
  getConflictTypeLabel: (type: ImportConflict['type']) => string
  getConflictTypeColor: (type: ImportConflict['type']) => string
}

function ConflictItem({
  conflict,
  index,
  isExpanded,
  onToggle,
  onResolve,
  resolutionOptions,
  getConflictTypeLabel,
  getConflictTypeColor,
}: ConflictItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-medium rounded-xl border border-cosmic-700/30 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-cosmic-900/20 transition-colors"
      >
        <div className="flex items-center gap-4">
          <Badge className={getConflictTypeColor(conflict.type)}>
            {getConflictTypeLabel(conflict.type)}
          </Badge>

          <div className="text-left">
            <p className="text-sm font-medium text-white">
              {conflict.table}.{conflict.field}
            </p>
            {conflict.recordId && (
              <p className="text-xs text-gray-400">ID: {conflict.recordId}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {conflict.resolution && (
            <Badge variant="outline" className="text-green-400 border-green-500/30">
              <Check className="h-3 w-3 mr-1" />
              {resolutionOptions.find((o) => o.value === conflict.resolution)?.label}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-cosmic-700/30"
          >
            <div className="p-6 space-y-6">
              {/* Value Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Existing Value */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-cosmic-400" />
                    <h4 className="text-sm font-semibold text-cosmic-300">
                      Existing Value
                    </h4>
                  </div>
                  <div className="glass-medium rounded-lg border border-cosmic-700/30 p-4">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(conflict.existingValue, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Import Value */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-300">
                      Import Value
                    </h4>
                  </div>
                  <div className="glass-medium rounded-lg border border-yellow-500/30 p-4">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(conflict.importValue, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Resolution Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">
                  Choose Resolution
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {resolutionOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onResolve(option.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        conflict.resolution === option.value
                          ? 'border-cosmic-500 bg-cosmic-600/20'
                          : 'border-cosmic-700/30 bg-cosmic-900/20 hover:border-cosmic-600/50 hover:bg-cosmic-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <option.icon
                          className={`h-5 w-5 flex-shrink-0 ${
                            conflict.resolution === option.value
                              ? 'text-cosmic-400'
                              : 'text-gray-400'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white mb-1">
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-400">
                            {option.description}
                          </p>
                        </div>
                        {conflict.resolution === option.value && (
                          <Check className="h-5 w-5 text-green-400 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
