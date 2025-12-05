/**
 * Meditation feature types
 */

// Preset types
export interface MeditationPreset {
  id: string
  name: string
  description: string | null

  // Timer settings
  duration_minutes: number
  interval_bell_minutes: number | null
  warm_up_seconds: number | null
  cool_down_seconds: number | null

  // Music settings
  music_enabled: boolean
  music_prompt: string | null
  music_style: string | null
  music_tempo: string | null
  music_mood: string | null
  binaural_frequency: number | null

  // Visualization settings
  visualization_enabled: boolean
  visualization_type: string | null
  visualization_colors: Record<string, string> | null
  visualization_intensity: number | null

  // Metadata
  times_used: number
  is_favorite: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface MeditationPresetCreate {
  name: string
  description?: string
  duration_minutes?: number
  interval_bell_minutes?: number
  warm_up_seconds?: number
  cool_down_seconds?: number
  music_enabled?: boolean
  music_prompt?: string
  music_style?: string
  music_tempo?: string
  music_mood?: string
  binaural_frequency?: number
  visualization_enabled?: boolean
  visualization_type?: string
  visualization_colors?: Record<string, string>
  visualization_intensity?: number
  is_favorite?: boolean
  is_default?: boolean
}

export interface MeditationPresetUpdate extends Partial<MeditationPresetCreate> {}

// Session types
export interface MeditationSession {
  id: string
  preset_id: string | null
  preset_name: string | null
  planned_duration_minutes: number
  actual_duration_seconds: number
  completed: boolean
  mood_before: string | null
  mood_after: string | null
  notes: string | null
  music_prompt_used: string | null
  session_date: string
  created_at: string
  updated_at: string
}

export interface MeditationSessionCreate {
  preset_id?: string
  preset_name?: string
  planned_duration_minutes: number
  actual_duration_seconds: number
  completed: boolean
  mood_before?: string
  mood_after?: string
  notes?: string
  music_prompt_used?: string
  session_date: string
}

export interface MeditationStats {
  total_sessions: number
  total_minutes: number
  completed_sessions: number
  streak_days: number
  average_session_minutes: number
  favorite_preset: string | null
  sessions_this_week: number
  sessions_this_month: number
}

// Audio types
export interface AudioGenerateRequest {
  prompt?: string
  style: string
  mood: string
  duration_seconds: number
  binaural_frequency?: number
}

export interface AudioGenerateResponse {
  success: boolean
  audio_id?: string
  audio_url?: string
  duration_seconds: number
  file_size_bytes?: number
  prompt_used: string
  error?: string
}

export interface AudioInfo {
  id: string
  prompt: string
  music_style: string | null
  music_mood: string | null
  duration_seconds: number
  file_path: string
  url: string
  file_size_bytes: number | null
  times_used: number
  created_at: string
}

// Timer types
export type TimerPhase = 'idle' | 'warmup' | 'meditation' | 'cooldown' | 'paused' | 'completed'

export interface TimerState {
  phase: TimerPhase
  elapsedSeconds: number
  remainingSeconds: number
  totalSeconds: number
  isRunning: boolean
}

// Visualization types
export type VisualizationType = 'waveform' | 'particles' | 'mandala' | 'cosmos'

// Preset templates
export interface PresetTemplate {
  name: string
  description: string
  duration_minutes: number
  music_style: string
  music_mood: string
  visualization_type: VisualizationType
  interval_bell_minutes?: number
  binaural_frequency?: number
}

// Music styles and moods
export const MUSIC_STYLES = [
  { value: 'ambient', label: 'Ambient' },
  { value: 'nature', label: 'Nature' },
  { value: 'cosmic', label: 'Cosmic' },
  { value: 'binaural', label: 'Binaural Beats' },
  { value: 'tibetan', label: 'Tibetan' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'rain', label: 'Rain' },
  { value: 'forest', label: 'Forest' },
] as const

export const MUSIC_MOODS = [
  { value: 'calming', label: 'Calming' },
  { value: 'focused', label: 'Focused' },
  { value: 'energizing', label: 'Energizing' },
  { value: 'peaceful', label: 'Peaceful' },
  { value: 'transcendent', label: 'Transcendent' },
  { value: 'grounding', label: 'Grounding' },
  { value: 'healing', label: 'Healing' },
] as const

export const VISUALIZATION_TYPES = [
  { value: 'waveform', label: 'Waveform' },
  { value: 'particles', label: 'Particles' },
  { value: 'mandala', label: 'Mandala' },
  { value: 'cosmos', label: 'Cosmos' },
] as const

export const MOODS = [
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'stressed', emoji: '😫', label: 'Stressed' },
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'focused', emoji: '🎯', label: 'Focused' },
  { value: 'peaceful', emoji: '🕊️', label: 'Peaceful' },
  { value: 'energized', emoji: '⚡', label: 'Energized' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
] as const
