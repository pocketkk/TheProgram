/**
 * useImport Hook
 *
 * Manages import wizard state and orchestrates the import flow
 */
import { useState, useCallback, useRef } from 'react'
import {
  validateImport,
  dryRunImport,
  executeImport,
  importClients,
  importCharts,
} from '@/lib/api/import'
import type {
  ImportStep,
  ImportMode,
  ImportWizardState,
  UploadedFile,
  ValidationResult,
  DryRunResult,
  ImportResult,
  ImportConflict,
  ConflictResolutionStrategy,
  ImportProgress,
} from '@/types/import'

interface UseImportOptions {
  onComplete?: (result: ImportResult) => void
  onError?: (error: string) => void
  importType?: 'all' | 'clients' | 'charts'
}

export function useImport(options: UseImportOptions = {}) {
  const { onComplete, onError, importType = 'all' } = options

  // Main state
  const [state, setState] = useState<ImportWizardState>({
    currentStep: 'upload',
    uploadedFile: null,
    validationResult: null,
    dryRunResult: null,
    conflicts: [],
    importOptions: {
      mode: 'merge',
      createBackup: true,
      conflictResolution: {},
    },
    importResult: null,
    progress: null,
    isLoading: false,
    error: null,
  })

  // Track progress interval
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<ImportWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  /**
   * Set error state
   */
  const setError = useCallback(
    (error: string) => {
      updateState({ error, isLoading: false })
      onError?.(error)
    },
    [updateState, onError]
  )

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])

  /**
   * Navigate to specific step
   */
  const goToStep = useCallback(
    (step: ImportStep) => {
      updateState({ currentStep: step, error: null })
    },
    [updateState]
  )

  /**
   * Step 1: Upload file
   */
  const uploadFile = useCallback(
    async (file: File) => {
      clearError()
      updateState({ isLoading: true })

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024
      if (file.size > maxSize) {
        setError('File size exceeds 100MB limit')
        return false
      }

      // Detect format from extension
      const extension = file.name.split('.').slice(-2).join('.')
      const validExtensions = ['json', 'csv', 'json.gz', 'json.bz2', 'csv.gz', 'csv.bz2']

      if (!validExtensions.some((ext) => extension.endsWith(ext))) {
        setError('Invalid file format. Please upload JSON or CSV file (optionally compressed)')
        return false
      }

      const uploadedFile: UploadedFile = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        format: extension as any,
        uploadedAt: new Date(),
      }

      updateState({
        uploadedFile,
        isLoading: false,
        currentStep: 'validate',
      })

      // Auto-advance to validation
      await validateFile(file)
      return true
    },
    [clearError, setError, updateState]
  )

  /**
   * Step 2: Validate file
   */
  const validateFile = useCallback(
    async (file?: File) => {
      const fileToValidate = file || state.uploadedFile?.file
      if (!fileToValidate) {
        setError('No file uploaded')
        return false
      }

      clearError()
      updateState({ isLoading: true })

      try {
        const result = await validateImport(fileToValidate)

        updateState({
          validationResult: result,
          isLoading: false,
        })

        // Auto-advance if valid
        if (result.isValid) {
          updateState({ currentStep: 'preview' })
          // Auto-run dry run
          await performDryRun(fileToValidate)
        } else {
          // Stay on validation step if errors
          updateState({ currentStep: 'validate' })
        }

        return result.isValid
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Validation failed')
        return false
      }
    },
    [state.uploadedFile, clearError, setError, updateState]
  )

  /**
   * Step 3: Perform dry run
   */
  const performDryRun = useCallback(
    async (file?: File, mode?: ImportMode) => {
      const fileToTest = file || state.uploadedFile?.file
      const importMode = mode || state.importOptions.mode

      if (!fileToTest) {
        setError('No file uploaded')
        return false
      }

      clearError()
      updateState({ isLoading: true })

      try {
        const result = await dryRunImport(fileToTest, importMode)

        updateState({
          dryRunResult: result,
          conflicts: result.conflicts,
          isLoading: false,
        })

        // Navigate to conflicts or confirm step
        if (result.conflicts.length > 0) {
          updateState({ currentStep: 'conflicts' })
        } else {
          updateState({ currentStep: 'confirm' })
        }

        return true
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Dry run failed')
        return false
      }
    },
    [state.uploadedFile, state.importOptions.mode, clearError, setError, updateState]
  )

  /**
   * Step 4: Resolve conflicts
   */
  const resolveConflict = useCallback(
    (conflictId: string, resolution: ConflictResolutionStrategy) => {
      setState((prev) => ({
        ...prev,
        conflicts: prev.conflicts.map((c) =>
          c.id === conflictId ? { ...c, resolution } : c
        ),
        importOptions: {
          ...prev.importOptions,
          conflictResolution: {
            ...prev.importOptions.conflictResolution,
            [conflictId]: resolution,
          },
        },
      }))
    },
    []
  )

  /**
   * Resolve all conflicts with same strategy
   */
  const resolveAllConflicts = useCallback(
    (resolution: ConflictResolutionStrategy) => {
      setState((prev) => {
        const conflictResolution: Record<string, ConflictResolutionStrategy> = {}
        prev.conflicts.forEach((c) => {
          conflictResolution[c.id] = resolution
        })

        return {
          ...prev,
          conflicts: prev.conflicts.map((c) => ({ ...c, resolution })),
          importOptions: {
            ...prev.importOptions,
            conflictResolution,
          },
        }
      })
    },
    []
  )

  /**
   * Update import options
   */
  const updateImportOptions = useCallback(
    (updates: Partial<typeof state.importOptions>) => {
      setState((prev) => ({
        ...prev,
        importOptions: {
          ...prev.importOptions,
          ...updates,
        },
      }))
    },
    []
  )

  /**
   * Simulate progress for better UX
   */
  const simulateProgress = useCallback(
    (totalRecords: number, estimatedDuration: number) => {
      const startTime = Date.now()
      let recordsProcessed = 0

      const updateProgress = () => {
        const elapsed = Date.now() - startTime
        const percentage = Math.min(95, (elapsed / estimatedDuration) * 100)
        recordsProcessed = Math.floor((percentage / 100) * totalRecords)

        const progressState: ImportProgress = {
          step: 'progress',
          percentage,
          currentOperation: 'Importing records...',
          recordsProcessed,
          totalRecords,
          eta: Math.max(0, estimatedDuration - elapsed),
          startTime,
        }

        updateState({ progress: progressState })
      }

      // Update every 500ms
      progressIntervalRef.current = setInterval(updateProgress, 500)
    },
    [updateState]
  )

  /**
   * Clear progress interval
   */
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  /**
   * Step 6: Execute import
   */
  const executeImportOperation = useCallback(async () => {
    const { uploadedFile, importOptions, dryRunResult } = state

    if (!uploadedFile?.file) {
      setError('No file uploaded')
      return false
    }

    clearError()
    updateState({
      isLoading: true,
      currentStep: 'progress',
    })

    // Start simulated progress
    if (dryRunResult) {
      simulateProgress(dryRunResult.insertedCount + dryRunResult.updatedCount, dryRunResult.estimatedDuration)
    }

    try {
      let result: ImportResult

      // Execute appropriate import function
      if (importType === 'clients') {
        result = await importClients(uploadedFile.file, {
          mode: importOptions.mode,
          createBackup: importOptions.createBackup,
        })
      } else if (importType === 'charts') {
        result = await importCharts(uploadedFile.file, {
          mode: importOptions.mode,
          createBackup: importOptions.createBackup,
        })
      } else {
        result = await executeImport(uploadedFile.file, importOptions.mode, {
          createBackup: importOptions.createBackup,
          conflictResolution: importOptions.conflictResolution,
        })
      }

      clearProgressInterval()

      // Set final progress to 100%
      updateState({
        progress: {
          step: 'complete',
          percentage: 100,
          currentOperation: 'Import complete',
          recordsProcessed: result.insertedRecords + result.updatedRecords,
          totalRecords: result.insertedRecords + result.updatedRecords,
          startTime: Date.now(),
        },
        importResult: result,
        isLoading: false,
        currentStep: 'complete',
      })

      onComplete?.(result)
      return true
    } catch (error) {
      clearProgressInterval()
      setError(error instanceof Error ? error.message : 'Import failed')
      return false
    }
  }, [
    state,
    importType,
    clearError,
    setError,
    updateState,
    simulateProgress,
    clearProgressInterval,
    onComplete,
  ])

  /**
   * Reset wizard to initial state
   */
  const reset = useCallback(() => {
    clearProgressInterval()
    setState({
      currentStep: 'upload',
      uploadedFile: null,
      validationResult: null,
      dryRunResult: null,
      conflicts: [],
      importOptions: {
        mode: 'merge',
        createBackup: true,
        conflictResolution: {},
      },
      importResult: null,
      progress: null,
      isLoading: false,
      error: null,
    })
  }, [clearProgressInterval])

  /**
   * Go back to previous step
   */
  const goBack = useCallback(() => {
    const stepOrder: ImportStep[] = ['upload', 'validate', 'preview', 'conflicts', 'confirm', 'progress', 'complete']
    const currentIndex = stepOrder.indexOf(state.currentStep)
    if (currentIndex > 0) {
      // Skip conflicts step if no conflicts
      const prevStep = stepOrder[currentIndex - 1]
      if (prevStep === 'conflicts' && state.conflicts.length === 0) {
        goToStep(stepOrder[currentIndex - 2])
      } else {
        goToStep(prevStep)
      }
    }
  }, [state.currentStep, state.conflicts.length, goToStep])

  /**
   * Check if can proceed to next step
   */
  const canProceed = useCallback(() => {
    switch (state.currentStep) {
      case 'upload':
        return !!state.uploadedFile
      case 'validate':
        return state.validationResult?.isValid || false
      case 'preview':
        return !!state.dryRunResult
      case 'conflicts':
        return state.conflicts.every((c) => c.resolution)
      case 'confirm':
        return true
      default:
        return false
    }
  }, [state])

  return {
    // State
    state,
    currentStep: state.currentStep,
    uploadedFile: state.uploadedFile,
    validationResult: state.validationResult,
    dryRunResult: state.dryRunResult,
    conflicts: state.conflicts,
    importOptions: state.importOptions,
    importResult: state.importResult,
    progress: state.progress,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    uploadFile,
    validateFile,
    performDryRun,
    resolveConflict,
    resolveAllConflicts,
    updateImportOptions,
    executeImportOperation,
    reset,
    goToStep,
    goBack,
    clearError,
    canProceed: canProceed(),
  }
}
