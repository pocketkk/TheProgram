/**
 * Export types for data portability
 *
 * Types for exporting astrology data in various formats.
 */

// ==================== Enums ====================

/**
 * Export format options
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
}

/**
 * Export type options
 */
export enum ExportType {
  FULL = 'full',
  CLIENTS = 'clients',
  CHARTS = 'charts',
  TABLE = 'table',
}

// ==================== Request Types ====================

/**
 * Base export options
 */
export interface ExportOptions {
  format: ExportFormat
  pretty?: boolean
  compress?: boolean
  csv_delimiter?: string
}

/**
 * Request for full database export
 */
export interface ExportFullRequest {
  format: ExportFormat
  include_tables?: string[]
  exclude_tables?: string[]
  include_metadata?: boolean
  compress?: boolean
  pretty?: boolean
  csv_delimiter?: string
}

/**
 * Request for exporting specific clients
 */
export interface ExportClientsRequest {
  client_ids: string[]
  format: ExportFormat
  include_related?: boolean
  pretty?: boolean
  csv_delimiter?: string
}

/**
 * Request for exporting specific charts
 */
export interface ExportChartsRequest {
  chart_ids: string[]
  format: ExportFormat
  include_interpretations?: boolean
  pretty?: boolean
  csv_delimiter?: string
}

/**
 * Request for exporting a specific table
 */
export interface ExportTableRequest {
  table_name: string
  format: ExportFormat
  filters?: Record<string, any>
  limit?: number
  offset?: number
  pretty?: boolean
  csv_delimiter?: string
}

// ==================== Response Types ====================

/**
 * Response from export operations
 */
export interface ExportResponse {
  success: boolean
  message: string
  format: ExportFormat
  data?: string
  download_filename?: string
  record_count: number
  table_counts?: Record<string, number>
  export_timestamp: string
  compressed?: boolean
  file_size?: number
  checksum?: string
}

/**
 * Table information for export preview
 */
export interface ExportableTable {
  name: string
  description: string
}

/**
 * Available tables response
 */
export interface AvailableTablesResponse {
  tables: ExportableTable[]
  default_tables: string[]
}

// ==================== UI State Types ====================

/**
 * Export configuration state
 */
export interface ExportConfig {
  type: ExportType
  format: ExportFormat
  includeMetadata: boolean
  compress: boolean
  pretty: boolean

  // Conditional fields based on export type
  clientIds?: string[]
  chartIds?: string[]
  tableName?: string
  includeRelated?: boolean
  includeInterpretations?: boolean
  filters?: Record<string, any>
  limit?: number
}

/**
 * Export preview data
 */
export interface ExportPreview {
  estimatedRecords: number
  estimatedSize: string
  tables: string[]
  tableCounts: Record<string, number>
  warnings?: string[]
}

/**
 * Export progress state
 */
export interface ExportProgress {
  isExporting: boolean
  progress: number
  status: string
  error?: string
}

/**
 * Export result for UI
 */
export interface ExportResult {
  success: boolean
  filename: string
  recordCount: number
  tableCounts?: Record<string, number>
  message: string
  timestamp: string
}
