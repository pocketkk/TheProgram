/**
 * Image generation types for Gemini API integration
 */

// Image generation types
export interface ImageGenerateRequest {
  prompt: string
  purpose?: 'tarot_card' | 'background' | 'infographic' | 'custom'
  style?: string
  aspect_ratio?: string
  astro_context?: {
    elements?: string[]
    signs?: string[]
    planets?: string[]
  }
  collection_id?: string
  item_key?: string
}

export interface ImageGenerateResponse {
  success: boolean
  image_id?: string
  image_url?: string
  width: number
  height: number
  prompt: string
  error?: string
}

export interface ImageInfo {
  id: string
  image_type: string
  prompt: string
  file_path: string
  url: string
  width: number
  height: number
  file_size?: number
  collection_id?: string
  item_key?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface CollectionInfo {
  id: string
  name: string
  collection_type: string
  style_prompt?: string
  border_style?: string
  is_complete: boolean
  is_active: boolean
  total_expected?: number
  include_card_labels: boolean
  reference_image_id?: string
  image_count: number
  metadata?: Record<string, any>
  created_at: string
}

export interface CollectionCreate {
  name: string
  collection_type: 'tarot_deck' | 'planet_set' | 'theme_set' | 'infographic_set'
  style_prompt?: string
  border_style?: string
  total_expected?: number
  include_card_labels?: boolean
}

export interface BatchGenerateItem {
  prompt: string
  item_key: string
  name?: string
}

export interface BatchProgressUpdate {
  current: number
  total: number
  item_name: string
  item_key?: string
  status: 'generating' | 'complete' | 'failed'
  image_url?: string
  image_id?: string
  error?: string
  percentage: number
}
