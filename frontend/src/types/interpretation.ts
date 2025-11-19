/**
 * Chart Interpretation Types
 */

export type ElementType = 'planet' | 'house' | 'aspect' | 'pattern'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_review'

export interface ChartInterpretation {
  id: string
  chart_id: string
  element_type: ElementType
  element_key: string
  ai_description: string
  ai_model: string | null
  ai_prompt_version: string | null
  version: number
  is_approved: ApprovalStatus
  created_at: string
  updated_at: string
}

export interface GenerateInterpretationRequest {
  element_types?: ElementType[]
  regenerate_existing?: boolean
  ai_model?: string
}

export interface GenerateInterpretationResponse {
  chart_id: string
  generated_count: number
  skipped_count: number
  interpretations: ChartInterpretation[]
  errors?: string[]
}
