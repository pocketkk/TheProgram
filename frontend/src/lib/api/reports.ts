/**
 * Reports API Client
 *
 * Part of Phase 3: Reports & Sharing
 */
import { apiClient } from './client'

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'pdf' | 'json'

// ============================================================================
// API Functions
// ============================================================================

/**
 * Download a birth chart PDF report
 */
export const downloadBirthChartReport = async (
  chartId: string,
  includeInterpretations: boolean = true
): Promise<void> => {
  const response = await apiClient.get(
    `/reports/birth-chart/${chartId}`,
    {
      params: { include_interpretations: includeInterpretations },
      responseType: 'blob',
    }
  )

  downloadBlob(response.data, getFilenameFromResponse(response) || 'birth_chart_report.pdf')
}

/**
 * Download a birth chart PDF report by birth data ID
 */
export const downloadBirthChartReportByBirthData = async (
  birthDataId: string,
  includeInterpretations: boolean = true
): Promise<void> => {
  const response = await apiClient.get(
    `/reports/birth-chart/by-birth-data/${birthDataId}`,
    {
      params: { include_interpretations: includeInterpretations },
      responseType: 'blob',
    }
  )

  downloadBlob(response.data, getFilenameFromResponse(response) || 'birth_chart_report.pdf')
}

/**
 * Download a transit report PDF
 */
export const downloadTransitReport = async (birthDataId: string): Promise<void> => {
  const response = await apiClient.get(
    `/reports/transit/${birthDataId}`,
    { responseType: 'blob' }
  )

  downloadBlob(response.data, getFilenameFromResponse(response) || 'transit_report.pdf')
}

/**
 * Export journal entries
 */
export const exportJournal = async (format: ExportFormat = 'json'): Promise<void> => {
  const response = await apiClient.get(
    `/reports/journal/export/${format}`,
    { responseType: 'blob' }
  )

  const extension = format === 'pdf' ? 'pdf' : 'json'
  downloadBlob(response.data, getFilenameFromResponse(response) || `journal_export.${extension}`)
}

/**
 * Export timeline events
 */
export const exportTimeline = async (format: ExportFormat = 'json'): Promise<void> => {
  const response = await apiClient.get(
    `/reports/timeline/export/${format}`,
    { responseType: 'blob' }
  )

  const extension = format === 'pdf' ? 'pdf' : 'json'
  downloadBlob(response.data, getFilenameFromResponse(response) || `timeline_export.${extension}`)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Download a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Extract filename from Content-Disposition header
 */
const getFilenameFromResponse = (response: unknown): string | null => {
  try {
    const headers = (response as { headers?: { 'content-disposition'?: string } })?.headers
    const disposition = headers?.['content-disposition']
    if (!disposition) return null

    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].replace(/['"]/g, '')
    }
  } catch {
    // Ignore errors extracting filename
  }
  return null
}

export default {
  downloadBirthChartReport,
  downloadBirthChartReportByBirthData,
  downloadTransitReport,
  exportJournal,
  exportTimeline,
}
