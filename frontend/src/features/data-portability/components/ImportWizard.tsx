/**
 * ImportWizard Component
 *
 * Main wizard component that orchestrates the entire import flow
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  CheckCircle,
  FileSearch,
  GitMerge,
  AlertTriangle,
  Play,
  Loader2,
  ArrowLeft,
  ArrowRight,
  X,
  Database,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { FileUpload } from './FileUpload'
import { ValidationResults } from './ValidationResults'
import { ConflictResolver } from './ConflictResolver'
import { ImportProgress } from './ImportProgress'
import { useImport } from '../hooks/useImport'
import type { ImportMode, ImportStep, ImportResult } from '@/types/import'

interface ImportWizardProps {
  onComplete?: (result: ImportResult) => void
  onCancel?: () => void
  importType?: 'all' | 'clients' | 'charts'
  title?: string
  description?: string
}

export function ImportWizard({
  onComplete,
  onCancel,
  importType = 'all',
  title = 'Import Data',
  description = 'Import your astrology data from a backup file',
}: ImportWizardProps) {
  const {
    state,
    currentStep,
    uploadedFile,
    validationResult,
    dryRunResult,
    conflicts,
    importOptions,
    importResult,
    progress,
    isLoading,
    error,
    uploadFile,
    validateFile,
    performDryRun,
    resolveConflict,
    resolveAllConflicts,
    updateImportOptions,
    executeImportOperation,
    reset,
    goBack,
    clearError,
    canProceed,
  } = useImport({
    onComplete,
    importType,
  })

  const [showDangerConfirm, setShowDangerConfirm] = useState(false)

  // Reset danger confirm when mode changes
  useEffect(() => {
    setShowDangerConfirm(false)
  }, [importOptions.mode])

  const steps: Array<{
    id: ImportStep
    label: string
    icon: any
    description: string
  }> = [
    {
      id: 'upload',
      label: 'Upload',
      icon: Upload,
      description: 'Select file to import',
    },
    {
      id: 'validate',
      label: 'Validate',
      icon: FileSearch,
      description: 'Check file format',
    },
    {
      id: 'preview',
      label: 'Preview',
      icon: Database,
      description: 'Review changes',
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      icon: AlertTriangle,
      description: 'Resolve conflicts',
    },
    {
      id: 'confirm',
      label: 'Confirm',
      icon: ShieldAlert,
      description: 'Final confirmation',
    },
    {
      id: 'progress',
      label: 'Import',
      icon: Loader2,
      description: 'Processing data',
    },
    {
      id: 'complete',
      label: 'Complete',
      icon: CheckCircle,
      description: 'Import finished',
    },
  ]

  // Filter steps based on state (skip conflicts if none)
  const activeSteps = steps.filter(
    (step) => step.id !== 'conflicts' || conflicts.length > 0
  )

  const currentStepIndex = activeSteps.findIndex((s) => s.id === currentStep)

  const handleNext = async () => {
    clearError()

    switch (currentStep) {
      case 'upload':
        // File already uploaded, validation happens automatically
        break
      case 'validate':
        // Validation already done, dry run happens automatically
        break
      case 'preview':
        // Move to conflicts or confirm
        if (conflicts.length > 0) {
          // Already handled by useImport
        } else {
          // Already handled by useImport
        }
        break
      case 'conflicts':
        // All conflicts resolved, move to confirm
        break
      case 'confirm':
        // Execute import
        await executeImportOperation()
        break
      default:
        break
    }
  }

  const handleModeChange = async (mode: ImportMode) => {
    updateImportOptions({ mode })
    setShowDangerConfirm(false)
    // Re-run dry run with new mode
    if (uploadedFile) {
      await performDryRun(uploadedFile.file, mode)
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel the import?')) {
      reset()
      onCancel?.()
    }
  }

  const canGoNext = () => {
    if (isLoading) return false
    if (currentStep === 'complete') return false
    if (currentStep === 'progress') return false
    return canProceed
  }

  const canGoBack = () => {
    if (isLoading) return false
    if (currentStep === 'upload') return false
    if (currentStep === 'progress') return false
    if (currentStep === 'complete') return false
    return true
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-medium rounded-xl border border-cosmic-700/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-gradient-celestial">
              {title}
            </h2>
            <p className="text-gray-400 mt-1">{description}</p>
          </div>
          {currentStep !== 'progress' && currentStep !== 'complete' && (
            <Button variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {activeSteps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              const isCurrent = step.id === currentStep

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 flex-1 relative ${
                    index < activeSteps.length - 1 ? 'after:absolute after:top-5 after:left-1/2 after:w-full after:h-0.5 after:bg-cosmic-700/30' : ''
                  }`}
                >
                  {/* Connector Line */}
                  {index < activeSteps.length - 1 && isCompleted && (
                    <div className="absolute top-5 left-1/2 w-full h-0.5 bg-cosmic-500 z-0" />
                  )}

                  {/* Step Circle */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted
                        ? 'rgb(139, 92, 246)'
                        : isActive
                        ? 'rgb(59, 130, 246)'
                        : 'rgb(31, 41, 55)',
                    }}
                    className={`relative z-10 rounded-full p-3 border-2 ${
                      isCompleted
                        ? 'border-cosmic-500'
                        : isActive
                        ? 'border-blue-500'
                        : 'border-cosmic-700/50'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isCompleted || isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    />
                  </motion.div>

                  {/* Step Label */}
                  <div className="text-center">
                    <p
                      className={`text-xs font-semibold ${
                        isCompleted || isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-600 hidden md:block">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Upload Step */}
          {currentStep === 'upload' && (
            <FileUpload
              onFileSelect={uploadFile}
              uploadedFile={uploadedFile}
              isLoading={isLoading}
              error={error}
            />
          )}

          {/* Validation Step */}
          {currentStep === 'validate' && validationResult && (
            <ValidationResults result={validationResult} />
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && dryRunResult && (
            <div className="space-y-6">
              {/* Import Mode Selection */}
              <div className="glass-medium rounded-xl border border-cosmic-700/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Import Mode
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <ModeButton
                    mode="merge"
                    label="Merge"
                    description="Add new records, skip existing ones"
                    icon={GitMerge}
                    selected={importOptions.mode === 'merge'}
                    onClick={() => handleModeChange('merge')}
                    safe
                  />
                  <ModeButton
                    mode="update"
                    label="Update"
                    description="Update existing records with new data"
                    icon={Database}
                    selected={importOptions.mode === 'update'}
                    onClick={() => handleModeChange('update')}
                    safe
                  />
                  <ModeButton
                    mode="replace"
                    label="Replace"
                    description="Delete all data and import fresh"
                    icon={AlertTriangle}
                    selected={importOptions.mode === 'replace'}
                    onClick={() => handleModeChange('replace')}
                    danger
                  />
                  <ModeButton
                    mode="skip"
                    label="Skip Conflicts"
                    description="Skip records that already exist"
                    icon={ArrowRight}
                    selected={importOptions.mode === 'skip'}
                    onClick={() => handleModeChange('skip')}
                    safe
                  />
                </div>
              </div>

              {/* Preview Results */}
              <div className="glass-medium rounded-xl border border-cosmic-700/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Preview Changes
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    label="Will Insert"
                    value={dryRunResult.insertedCount}
                    color="text-green-400"
                  />
                  <StatCard
                    label="Will Update"
                    value={dryRunResult.updatedCount}
                    color="text-blue-400"
                  />
                  <StatCard
                    label="Will Skip"
                    value={dryRunResult.skippedCount}
                    color="text-gray-400"
                  />
                </div>

                {dryRunResult.affectedTables.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-cosmic-700/30">
                    <p className="text-sm text-gray-400 mb-2">Affected Tables:</p>
                    <div className="flex flex-wrap gap-2">
                      {dryRunResult.affectedTables.map((table) => (
                        <span
                          key={table}
                          className="px-3 py-1 rounded-full bg-cosmic-700/30 text-xs text-cosmic-300"
                        >
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conflicts Step */}
          {currentStep === 'conflicts' && conflicts.length > 0 && (
            <ConflictResolver
              conflicts={conflicts}
              onResolveConflict={resolveConflict}
              onResolveAll={resolveAllConflicts}
            />
          )}

          {/* Confirm Step */}
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div
                className={`glass-medium rounded-xl border p-6 ${
                  importOptions.mode === 'replace'
                    ? 'border-red-500/30 bg-red-950/10'
                    : 'border-cosmic-700/30'
                }`}
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Ready to Import
                </h3>
                <p className="text-gray-400 mb-4">
                  Please review your settings before proceeding:
                </p>

                <div className="space-y-3">
                  <InfoRow label="Import Mode" value={importOptions.mode.toUpperCase()} />
                  <InfoRow
                    label="Records to Insert"
                    value={dryRunResult?.insertedCount.toString() || '0'}
                  />
                  <InfoRow
                    label="Records to Update"
                    value={dryRunResult?.updatedCount.toString() || '0'}
                  />
                  <InfoRow
                    label="Records to Skip"
                    value={dryRunResult?.skippedCount.toString() || '0'}
                  />
                  <InfoRow
                    label="Backup"
                    value={importOptions.createBackup ? 'Yes' : 'No'}
                  />
                </div>

                {/* Backup Option */}
                <div className="mt-6 pt-6 border-t border-cosmic-700/30">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.createBackup}
                      onChange={(e) =>
                        updateImportOptions({ createBackup: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-cosmic-600 bg-cosmic-900 text-cosmic-500 focus:ring-2 focus:ring-cosmic-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        Create backup before import
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Recommended: Create a backup of your current data before importing
                      </p>
                    </div>
                  </label>
                </div>

                {/* Danger Warning for Replace Mode */}
                {importOptions.mode === 'replace' && (
                  <div className="mt-6 p-4 rounded-lg bg-red-950/20 border border-red-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-400 mb-2">
                          Warning: Destructive Operation
                        </p>
                        <p className="text-xs text-red-300/80 mb-3">
                          Replace mode will DELETE ALL existing data before importing. This
                          action cannot be undone unless you have a backup.
                        </p>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showDangerConfirm}
                            onChange={(e) => setShowDangerConfirm(e.target.checked)}
                            className="h-4 w-4 rounded border-red-600 bg-red-950 text-red-500 focus:ring-2 focus:ring-red-500"
                          />
                          <span className="text-xs text-red-300">
                            I understand and want to proceed with replace mode
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress/Complete Step */}
          {(currentStep === 'progress' || currentStep === 'complete') && (
            <ImportProgress
              progress={progress}
              result={importResult}
              isLoading={isLoading}
              error={error}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {currentStep !== 'progress' && currentStep !== 'complete' && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={!canGoBack()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={
              !canGoNext() ||
              (importOptions.mode === 'replace' && !showDangerConfirm)
            }
            loading={isLoading}
          >
            {currentStep === 'confirm' ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Import
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Complete Actions */}
      {currentStep === 'complete' && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Import Another File
          </Button>
          {onComplete && importResult && (
            <Button onClick={() => onComplete(importResult)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Mode Button Component
 */
function ModeButton({
  mode,
  label,
  description,
  icon: Icon,
  selected,
  onClick,
  safe = false,
  danger = false,
}: {
  mode: string
  label: string
  description: string
  icon: any
  selected: boolean
  onClick: () => void
  safe?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all text-left ${
        selected
          ? danger
            ? 'border-red-500 bg-red-950/20'
            : 'border-cosmic-500 bg-cosmic-600/20'
          : 'border-cosmic-700/30 bg-cosmic-900/20 hover:border-cosmic-600/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={`h-6 w-6 flex-shrink-0 ${
            selected
              ? danger
                ? 'text-red-400'
                : 'text-cosmic-400'
              : 'text-gray-400'
          }`}
        />
        <div className="flex-1">
          <p className="font-semibold text-white mb-1">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
        {selected && <CheckCircle className="h-5 w-5 text-green-400" />}
      </div>
    </button>
  )
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  )
}

/**
 * Info Row Component
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-cosmic-700/20">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}
