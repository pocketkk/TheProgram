/**
 * Import API Client
 *
 * Handles all API calls for data import functionality
 */
import { apiClient, getErrorMessage } from './client'
import type {
  ImportMode,
  ConflictResolutionStrategy,
  ValidationResult,
  DryRunResult,
  ImportResult,
  ImportError,
  ImportConflict,
  ValidateImportResponse,
  DryRunImportResponse,
  ExecuteImportResponse,
} from '@/types/import'

/**
 * Convert snake_case API response to camelCase frontend types
 */
function mapValidationResponse(response: ValidateImportResponse): ValidationResult {
  return {
    isValid: response.valid,
    errors: response.errors || [],
    warnings: response.warnings || [],
    recordCount: response.record_count,
    previewRecords: response.preview_records || [],
    detectedFormat: response.detected_format as any,
    estimatedDuration: response.estimated_duration,
  }
}

function mapDryRunResponse(response: DryRunImportResponse): DryRunResult {
  return {
    success: response.success,
    insertedCount: response.inserted_count,
    updatedCount: response.updated_count,
    skippedCount: response.skipped_count,
    conflicts: (response.conflicts || []).map((c, index) => ({
      id: `conflict-${index}`,
      type: c.type as any,
      table: c.table,
      field: c.field,
      recordId: c.record_id,
      existingValue: c.existing_value,
      importValue: c.import_value,
    })),
    affectedTables: response.affected_tables || [],
    estimatedDuration: response.estimated_duration,
    warnings: response.warnings || [],
  }
}

function mapExecuteResponse(response: ExecuteImportResponse): ImportResult {
  return {
    success: response.success,
    insertedRecords: response.inserted_records,
    updatedRecords: response.updated_records,
    skippedRecords: response.skipped_records,
    errors: response.errors || [],
    warnings: response.warnings || [],
    duration: response.duration,
    backupPath: response.backup_path,
    importId: response.import_id,
    summary: {
      clients: response.summary?.clients,
      birthData: response.summary?.birth_data,
      charts: response.summary?.charts,
      sessionNotes: response.summary?.session_notes,
    },
  }
}

/**
 * Create FormData for file upload
 */
function createFileFormData(
  file: File,
  additionalFields?: Record<string, any>
): FormData {
  const formData = new FormData()
  formData.append('file', file)

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })
  }

  return formData
}

/**
 * Validate import file without importing
 *
 * @param file - File to validate
 * @returns Validation result with errors, warnings, and preview
 */
export async function validateImport(file: File): Promise<ValidationResult> {
  try {
    const formData = createFileFormData(file)

    const response = await apiClient.post<ValidateImportResponse>(
      '/import/validate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return mapValidationResponse(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Perform dry run to preview import changes
 *
 * @param file - File to import
 * @param mode - Import mode
 * @returns Dry run result showing what would happen
 */
export async function dryRunImport(
  file: File,
  mode: ImportMode
): Promise<DryRunResult> {
  try {
    const formData = createFileFormData(file, { mode })

    const response = await apiClient.post<DryRunImportResponse>(
      '/import/dry-run',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return mapDryRunResponse(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Execute import operation
 *
 * @param file - File to import
 * @param mode - Import mode
 * @param options - Import options
 * @returns Import result
 */
export async function executeImport(
  file: File,
  mode: ImportMode,
  options?: {
    createBackup?: boolean
    conflictResolution?: Record<string, ConflictResolutionStrategy>
  }
): Promise<ImportResult> {
  try {
    const formData = createFileFormData(file, {
      mode,
      create_backup: options?.createBackup,
      conflict_resolution: options?.conflictResolution,
    })

    const response = await apiClient.post<ExecuteImportResponse>(
      '/import/execute',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minute timeout for large imports
      }
    )

    return mapExecuteResponse(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Import clients only
 *
 * @param file - File containing client data
 * @param options - Import options
 * @returns Import result
 */
export async function importClients(
  file: File,
  options?: {
    mode?: ImportMode
    createBackup?: boolean
  }
): Promise<ImportResult> {
  try {
    const formData = createFileFormData(file, {
      mode: options?.mode || 'merge',
      create_backup: options?.createBackup,
    })

    const response = await apiClient.post<ExecuteImportResponse>(
      '/import/clients',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000,
      }
    )

    return mapExecuteResponse(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Import charts only
 *
 * @param file - File containing chart data
 * @param options - Import options
 * @returns Import result
 */
export async function importCharts(
  file: File,
  options?: {
    mode?: ImportMode
    createBackup?: boolean
  }
): Promise<ImportResult> {
  try {
    const formData = createFileFormData(file, {
      mode: options?.mode || 'merge',
      create_backup: options?.createBackup,
    })

    const response = await apiClient.post<ExecuteImportResponse>(
      '/import/charts',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000,
      }
    )

    return mapExecuteResponse(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Cancel ongoing import operation
 *
 * @param importId - ID of the import to cancel
 */
export async function cancelImport(importId: string): Promise<void> {
  try {
    await apiClient.post(`/api/v1/import/${importId}/cancel`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get import status
 *
 * @param importId - ID of the import
 * @returns Import progress information
 */
export async function getImportStatus(importId: string): Promise<{
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string
}> {
  try {
    const response = await apiClient.get(`/api/v1/import/${importId}/status`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
