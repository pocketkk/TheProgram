/**
 * Types for Coloring Book / Art Therapy feature
 */

export interface ColoringBookTemplate {
  id: string
  name: string
  description: string
  theme: string
  thumbnail_url: string
  prompt: string
}

export interface ColoringBookImage {
  id: string
  prompt: string
  url: string
  width: number
  height: number
  theme?: string
  created_at: string
}

export interface Artwork {
  id: string
  name: string
  file_path: string
  url: string
  thumbnail_url?: string
  width: number
  height: number
  file_size?: number
  source_image_id?: string
  canvas_state?: CanvasState
  tags: string[]
  created_at: string
  updated_at?: string
}

export interface CanvasState {
  layers: LayerData[]
  activeLayerId: string
  toolSettings: ToolSettings
  history: HistoryEntry[]
  historyIndex: number
}

export interface LayerData {
  id: string
  name: string
  visible: boolean
  opacity: number
  locked: boolean
  imageData?: string // base64 encoded
}

export interface HistoryEntry {
  type: 'stroke' | 'fill' | 'clear' | 'layer'
  data: unknown
  timestamp: number
}

// Tool Types
export type ToolType =
  | 'brush'
  | 'pencil'
  | 'pen'
  | 'marker'
  | 'airbrush'
  | 'charcoal'
  | 'watercolor'
  | 'crayon'
  | 'eraser'
  | 'fill'
  | 'eyedropper'
  | 'blur'
  | 'smudge'

export interface ToolSettings {
  tool: ToolType
  color: string
  size: number
  opacity: number
  hardness: number // 0-100, affects edge softness
  flow: number // 0-100, for airbrush
  spacing: number // brush spacing
  pressure: boolean // pressure sensitivity
  smoothing: number // stroke smoothing
}

export interface BrushPreset {
  id: string
  name: string
  tool: ToolType
  settings: Partial<ToolSettings>
  preview?: string // preview image
}

// Color palette
export interface ColorPalette {
  id: string
  name: string
  colors: string[]
}

// Generation request/response
export interface GenerateRequest {
  prompt: string
  theme: string
  complexity: 'simple' | 'medium' | 'detailed' | 'intricate'
  style?: string
}

export interface GenerateResponse {
  success: boolean
  image_id?: string
  image_url?: string
  width: number
  height: number
  prompt: string
  error?: string
}

// Artwork save request
export interface ArtworkSaveRequest {
  name: string
  image_data: string // base64 PNG
  source_image_id?: string
  canvas_state?: CanvasState
  tags: string[]
}

// Default tool settings
export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  tool: 'brush',
  color: '#000000',
  size: 10,
  opacity: 100,
  hardness: 80,
  flow: 100,
  spacing: 25,
  pressure: true,
  smoothing: 50,
}

// Predefined brush presets
export const BRUSH_PRESETS: BrushPreset[] = [
  {
    id: 'soft_brush',
    name: 'Soft Brush',
    tool: 'brush',
    settings: { hardness: 20, opacity: 80 },
  },
  {
    id: 'hard_brush',
    name: 'Hard Brush',
    tool: 'brush',
    settings: { hardness: 100, opacity: 100 },
  },
  {
    id: 'fine_pen',
    name: 'Fine Pen',
    tool: 'pen',
    settings: { size: 2, hardness: 100, opacity: 100 },
  },
  {
    id: 'marker',
    name: 'Marker',
    tool: 'marker',
    settings: { size: 20, hardness: 80, opacity: 90 },
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    tool: 'airbrush',
    settings: { hardness: 0, flow: 30, size: 40 },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    tool: 'charcoal',
    settings: { size: 15, hardness: 40, opacity: 70 },
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    tool: 'watercolor',
    settings: { size: 25, hardness: 10, opacity: 40 },
  },
  {
    id: 'crayon',
    name: 'Crayon',
    tool: 'crayon',
    settings: { size: 12, hardness: 60, opacity: 85 },
  },
  {
    id: 'pencil',
    name: 'Pencil',
    tool: 'pencil',
    settings: { size: 3, hardness: 90, opacity: 80 },
  },
]

// Color palettes
export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'rainbow',
    name: 'Rainbow',
    colors: [
      '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3',
      '#FF6B6B', '#FFB366', '#FFFF66', '#66FF66', '#6666FF', '#9966FF', '#FF66FF',
    ],
  },
  {
    id: 'pastel',
    name: 'Pastel Dreams',
    colors: [
      '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF',
      '#FFC6D9', '#FFE4C9', '#FFFFC9', '#C9FFC9', '#C9E4FF', '#E4C9FF',
    ],
  },
  {
    id: 'earth',
    name: 'Earth Tones',
    colors: [
      '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#F4A460',
      '#556B2F', '#6B8E23', '#9ACD32', '#8FBC8F', '#2E8B57', '#3CB371',
    ],
  },
  {
    id: 'ocean',
    name: 'Ocean Blues',
    colors: [
      '#001F3F', '#003366', '#004C99', '#0066CC', '#0080FF', '#33CCFF',
      '#66FFFF', '#00CED1', '#20B2AA', '#40E0D0', '#7FFFD4', '#E0FFFF',
    ],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: [
      '#FF4500', '#FF6347', '#FF7F50', '#FFA07A', '#FFB6C1', '#FFC0CB',
      '#FFD700', '#FFDAB9', '#FF8C00', '#FF69B4', '#DB7093', '#C71585',
    ],
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    colors: [
      '#0D0221', '#190A44', '#2D1B69', '#4A1942', '#6B2D5C', '#8B4367',
      '#2C1654', '#472D7C', '#623AA2', '#9B59B6', '#D6BBFC', '#F39C12',
    ],
  },
  {
    id: 'neutral',
    name: 'Neutral',
    colors: [
      '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080',
      '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F2F2F2', '#FFFFFF',
    ],
  },
  {
    id: 'skin',
    name: 'Skin Tones',
    colors: [
      '#FFDFC4', '#F0D5BE', '#EECEB3', '#E1B899', '#E5C298', '#FFCD94',
      '#D1A684', '#C99E7C', '#C68642', '#8D5524', '#6B4423', '#4A312C',
    ],
  },
]

// Theme options for templates
export const COLORING_THEMES = [
  { id: 'mystical', name: 'Mystical', icon: 'sparkles' },
  { id: 'nature', name: 'Nature', icon: 'leaf' },
  { id: 'mandala', name: 'Mandala', icon: 'target' },
  { id: 'cosmic', name: 'Cosmic', icon: 'star' },
  { id: 'animals', name: 'Animals', icon: 'paw' },
  { id: 'fantasy', name: 'Fantasy', icon: 'castle' },
  { id: 'floral', name: 'Floral', icon: 'flower' },
  { id: 'geometric', name: 'Geometric', icon: 'hexagon' },
  { id: 'abstract', name: 'Abstract', icon: 'shapes' },
]
