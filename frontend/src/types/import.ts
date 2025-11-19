/**
 * Import Types for Data Portability
 *
 * Defines TypeScript interfaces for the import wizard functionality
 */

/**
 * Import mode determines how conflicts are handled
 */
export type ImportMode = 'merge' | 'replace' | 'skip' | 'update'

/**
 * Conflict resolution strategy for individual conflicts
 */
export type ConflictResolutionStrategy = 'keep_existing' | 'overwrite' | 'skip' | 'merge'

/**
 * Conflict types that can occur during import
 */
export type ConflictType = 'duplicate_id' | 'unique_constraint' | 'missing_fk' | 'data_type_mismatch'

/**
 * File format types supported for import
 */
export type ImportFileFormat = 'json' | 'csv' | 'json.gz' | 'json.bz2' | 'csv.gz' | 'csv.bz2'

/**
 * Import step in the wizard flow
 */
export type ImportStep = 'upload' | 'validate' | 'preview' | 'conflicts' | 'confirm' | 'progress' | 'complete'

/**
 * Options for import operation
 */
export interface ImportOptions {
  mode: ImportMode
  createBackup?: boolean
  conflictResolution?: Record<string, ConflictResolutionStrategy>
  skipValidation?: boolean
  dryRun?: boolean
}

/**
 * Import error with detailed context
 */
export interface ImportError {
  type: 'validation' | 'conflict' | 'network' | 'server' | 'unknown'
  field?: string
  lineNumber?: number
  message: string
  details?: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Validation result for uploaded file
 */
export interface ValidationResult {
  isValid: boolean
  errors: ImportError[]
  warnings: ImportError[]
  recordCount: number
  previewRecords: any[]
  detectedFormat?: ImportFileFormat
  estimatedDuration?: number
}

/**
 * Conflict detected during import
 */
export interface ImportConflict {
  id: string
  type: ConflictType
  table: string
  field: string
  recordId?: string
  existingValue: any
  importValue: any
  resolution?: ConflictResolutionStrategy
  metadata?: Record<string, any>
}

/**
 * Dry run result showing what would happen
 */
export interface DryRunResult {
  success: boolean
  insertedCount: number
  updatedCount: number
  skippedCount: number
  conflicts: ImportConflict[]
  affectedTables: string[]
  estimatedDuration: number
  warnings: ImportError[]
}

/**
 * Import execution result
 */
export interface ImportResult {
  success: boolean
  insertedRecords: number
  updatedRecords: number
  skippedRecords: number
  errors: ImportError[]
  warnings: ImportError[]
  duration: number
  backupPath?: string
  importId?: string
  summary: {
    clients?: number
    birthData?: number
    charts?: number
    sessionNotes?: number
  }
}

/**
 * Import progress state
 */
export interface ImportProgress {
  step: ImportStep
  percentage: number
  currentOperation: string
  recordsProcessed: number
  totalRecords: number
  eta?: number
  startTime: number
}

/**
 * File upload state
 */
export interface UploadedFile {
  file: File
  name: string
  size: number
  type: string
  format?: ImportFileFormat
  uploadedAt: Date
}

/**
 * Import wizard state
 */
export interface ImportWizardState {
  currentStep: ImportStep
  uploadedFile: UploadedFile | null
  validationResult: ValidationResult | null
  dryRunResult: DryRunResult | null
  conflicts: ImportConflict[]
  importOptions: ImportOptions
  importResult: ImportResult | null
  progress: ImportProgress | null
  isLoading: boolean
  error: string | null
}

/**
 * API request/response types
 */

export interface ValidateImportRequest {
  file: File
}

export interface ValidateImportResponse {
  valid: boolean
  errors: ImportError[]
  warnings: ImportError[]
  record_count: number
  preview_records: any[]
  detected_format: string
  estimated_duration: number
}

export interface DryRunImportRequest {
  file: File
  mode: ImportMode
}

export interface DryRunImportResponse {
  success: boolean
  inserted_count: number
  updated_count: number
  skipped_count: number
  conflicts: Array<{
    type: string
    table: string
    field: string
    record_id?: string
    existing_value: any
    import_value: any
  }>
  affected_tables: string[]
  estimated_duration: number
  warnings: ImportError[]
}

export interface ExecuteImportRequest {
  file: File
  mode: ImportMode
  create_backup?: boolean
  conflict_resolution?: Record<string, ConflictResolutionStrategy>
}

export interface ExecuteImportResponse {
  success: boolean
  inserted_records: number
  updated_records: number
  skipped_records: number
  errors: ImportError[]
  warnings: ImportError[]
  duration: number
  backup_path?: string
  import_id: string
  summary: {
    clients?: number
    birth_data?: number
    charts?: number
    session_notes?: number
  }
}

/**
 * Import clients-only request
 */
export interface ImportClientsRequest {
  file: File
  mode: ImportMode
  create_backup?: boolean
}

/**
 * Import charts-only request
 */
export interface ImportChartsRequest {
  file: File
  mode: ImportMode
  create_backup?: boolean
}
