/**
 * Palm Reading Types
 */

export type HandType = 'left' | 'right' | 'both'

export interface TokenUsage {
  input: number
  output: number
}

export interface PalmReadingSections {
  hand_shape?: string
  major_lines?: string
  heart_line?: string
  head_line?: string
  life_line?: string
  fate_line?: string
  mounts?: string
  fingers?: string
  special_markings?: string
  astrological_synthesis?: string
  guidance?: string
  introduction?: string
}

export interface PalmReadingResponse {
  success: boolean
  full_reading?: string
  sections?: Record<string, string>
  hand_type?: string
  model_used?: string
  tokens_used?: TokenUsage
  error?: string
}

export interface QuickInsightResponse {
  success: boolean
  insight?: string
  model_used?: string
  error?: string
}

export interface PalmReadingRecord {
  id: string
  hand_type: string
  full_reading: string
  sections_json?: string
  image_path?: string
  additional_context?: string
  model_used?: string
  tokens_input?: number
  tokens_output?: number
  notes?: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface PalmReadingListResponse {
  readings: PalmReadingRecord[]
  total: number
}

export interface PalmReadingAnalyzeParams {
  image: File
  handType: HandType
  additionalContext?: string
  saveReading?: boolean
}

export interface PalmReadingUpdateParams {
  notes?: string
  is_favorite?: boolean
}
