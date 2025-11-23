/**
 * Export API client
 *
 * Client functions for data export endpoints.
 */
import { apiClient, getErrorMessage } from './client'
import type {
  ExportFullRequest,
  ExportClientsRequest,
  ExportChartsRequest,
  ExportTableRequest,
  ExportResponse,
  AvailableTablesResponse,
} from '@/types/export'
import { ExportFormat } from '@/types/export'

/**
 * Export full database
 */
export async function exportFullDatabase(
  request: ExportFullRequest
): Promise<ExportResponse> {
  try {
    const response = await apiClient.post<ExportResponse>(
      '/export/full',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Download full database export as file
 */
export async function downloadFullDatabase(
  format: ExportFormat = ExportFormat.JSON,
  compress: boolean = false,
  includeMetadata: boolean = true,
  pretty: boolean = false
): Promise<Blob> {
  try {
    const response = await apiClient.get('/export/full/download', {
      params: {
        format,
        compress,
        include_metadata: includeMetadata,
        pretty,
      },
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Export specific clients
 */
export async function exportClients(
  request: ExportClientsRequest
): Promise<ExportResponse> {
  try {
    const response = await apiClient.post<ExportResponse>(
      '/export/clients',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Export specific charts
 */
export async function exportCharts(
  request: ExportChartsRequest
): Promise<ExportResponse> {
  try {
    const response = await apiClient.post<ExportResponse>(
      '/export/charts',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Export specific table
 */
export async function exportTable(
  request: ExportTableRequest
): Promise<ExportResponse> {
  try {
    const response = await apiClient.post<ExportResponse>(
      '/export/table',
      request
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List available tables for export
 */
export async function listExportableTables(): Promise<AvailableTablesResponse> {
  try {
    const response = await apiClient.get<AvailableTablesResponse>(
      '/export/tables'
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Trigger browser download from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Trigger browser download from string data
 */
export function downloadData(
  data: string,
  filename: string,
  mimeType: string = 'application/json'
): void {
  const blob = new Blob([data], { type: mimeType })
  downloadBlob(blob, filename)
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Estimate export size based on record counts
 * Rough estimation: ~500 bytes per record for JSON, ~200 bytes for CSV
 */
export function estimateExportSize(
  recordCount: number,
  format: ExportFormat,
  compress: boolean = false
): string {
  const bytesPerRecord = format === ExportFormat.JSON ? 500 : 200
  let estimatedBytes = recordCount * bytesPerRecord

  // Compression typically reduces size by 70-80%
  if (compress) {
    estimatedBytes = estimatedBytes * 0.25
  }

  return formatFileSize(estimatedBytes)
}

/**
 * Generate export filename with timestamp
 */
export function generateExportFilename(
  exportType: string,
  format: ExportFormat,
  compressed: boolean = false
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const extension = compressed ? `${format}.gz` : format
  return `theprogram_${exportType}_export_${timestamp}.${extension}`
}
