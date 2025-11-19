/**
 * Chart Interpretations API Client
 */

import { apiClient } from './client'
import type {
  ChartInterpretation,
  GenerateInterpretationRequest,
  GenerateInterpretationResponse,
  ElementType,
} from '@/types/interpretation'

/**
 * Get all interpretations for a chart
 */
export async function getChartInterpretations(
  chartId: string,
  elementType?: ElementType
): Promise<ChartInterpretation[]> {
  const params = elementType ? { element_type: elementType } : {}
  const response = await apiClient.get(`/charts/${chartId}/interpretations`, { params })
  return response.data
}

/**
 * Generate AI interpretations for a chart
 * Now with PARALLEL PROCESSING - 10x faster! ⚡
 */
export async function generateChartInterpretations(
  chartId: string,
  request: GenerateInterpretationRequest
): Promise<GenerateInterpretationResponse> {
  const response = await apiClient.post(
    `/charts/${chartId}/interpretations/generate`,
    request,
    {
      timeout: 300000, // 5 minutes - enough for 100+ aspects with parallel processing
    }
  )
  return response.data
}

/**
 * Get a specific interpretation
 */
export async function getInterpretation(interpretationId: string): Promise<ChartInterpretation> {
  const response = await apiClient.get(`/charts/interpretations/${interpretationId}`)
  return response.data
}

/**
 * Update an interpretation
 */
export async function updateInterpretation(
  interpretationId: string,
  data: { ai_description?: string; is_approved?: string }
): Promise<ChartInterpretation> {
  const response = await apiClient.patch(`/charts/interpretations/${interpretationId}`, data)
  return response.data
}

/**
 * Delete an interpretation
 */
export async function deleteInterpretation(interpretationId: string): Promise<void> {
  await apiClient.delete(`/charts/interpretations/${interpretationId}`)
}
