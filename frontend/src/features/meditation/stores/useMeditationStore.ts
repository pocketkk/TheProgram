/**
 * Meditation Store
 *
 * Zustand store for meditation UI state
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MeditationPreset,
  MeditationPresetCreate,
  MeditationPresetUpdate,
  MeditationSession,
  MeditationStats,
  TimerPhase,
  TimerState,
  AudioInfo,
} from '../types'
import * as meditationApi from '@/lib/api/meditation'

interface MeditationState {
  // Presets
  presets: MeditationPreset[]
  selectedPreset: MeditationPreset | null
  isLoadingPresets: boolean

  // Sessions
  sessions: MeditationSession[]
  isLoadingSessions: boolean

  // Stats
  stats: MeditationStats | null
  isLoadingStats: boolean

  // Timer
  timer: TimerState
  activePreset: MeditationPreset | null

  // Audio
  currentAudio: AudioInfo | null
  audioUrl: string | null
  isGeneratingAudio: boolean
  cachedAudio: AudioInfo[]

  // UI State
  view: 'home' | 'timer' | 'presets' | 'history' | 'create'
  isPlaying: boolean
  error: string | null

  // Actions - Data fetching
  fetchPresets: () => Promise<void>
  fetchSessions: () => Promise<void>
  fetchStats: () => Promise<void>

  // Actions - Presets
  createPreset: (data: MeditationPresetCreate) => Promise<MeditationPreset>
  updatePreset: (id: string, data: MeditationPresetUpdate) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  selectPreset: (preset: MeditationPreset | null) => void

  // Actions - Sessions
  startSession: (preset: MeditationPreset | null, durationMinutes: number) => void
  endSession: (completed: boolean, moodBefore?: string, moodAfter?: string, notes?: string) => Promise<void>
  recordSession: (session: Omit<MeditationSession, 'id' | 'created_at' | 'updated_at'>) => Promise<void>

  // Actions - Timer
  setTimerPhase: (phase: TimerPhase) => void
  updateTimer: (elapsed: number, remaining: number) => void
  pauseTimer: () => void
  resumeTimer: () => void
  resetTimer: () => void

  // Actions - Audio
  generateAudio: (style: string, mood: string, durationSeconds: number) => Promise<void>
  setAudioUrl: (url: string | null) => void
  setPlaying: (playing: boolean) => void

  // Actions - UI
  setView: (view: MeditationState['view']) => void
  clearError: () => void
}

const initialTimerState: TimerState = {
  phase: 'idle',
  elapsedSeconds: 0,
  remainingSeconds: 0,
  totalSeconds: 0,
  isRunning: false,
}

export const useMeditationStore = create<MeditationState>()(
  persist(
    (set, get) => ({
      // Initial state
      presets: [],
      selectedPreset: null,
      isLoadingPresets: false,

      sessions: [],
      isLoadingSessions: false,

      stats: null,
      isLoadingStats: false,

      timer: initialTimerState,
      activePreset: null,

      currentAudio: null,
      audioUrl: null,
      isGeneratingAudio: false,
      cachedAudio: [],

      view: 'home',
      isPlaying: false,
      error: null,

      // Data fetching
      fetchPresets: async () => {
        set({ isLoadingPresets: true, error: null })
        try {
          const presets = await meditationApi.listPresets()
          set({ presets, isLoadingPresets: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch presets',
            isLoadingPresets: false,
          })
        }
      },

      fetchSessions: async () => {
        set({ isLoadingSessions: true, error: null })
        try {
          const response = await meditationApi.listSessions({ limit: 50 })
          set({ sessions: response.sessions, isLoadingSessions: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch sessions',
            isLoadingSessions: false,
          })
        }
      },

      fetchStats: async () => {
        set({ isLoadingStats: true, error: null })
        try {
          const stats = await meditationApi.getStats()
          set({ stats, isLoadingStats: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch stats',
            isLoadingStats: false,
          })
        }
      },

      // Presets
      createPreset: async (data) => {
        try {
          const preset = await meditationApi.createPreset(data)
          set((state) => ({
            presets: [preset, ...state.presets],
          }))
          return preset
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create preset' })
          throw error
        }
      },

      updatePreset: async (id, data) => {
        try {
          const updated = await meditationApi.updatePreset(id, data)
          set((state) => ({
            presets: state.presets.map((p) => (p.id === id ? updated : p)),
            selectedPreset: state.selectedPreset?.id === id ? updated : state.selectedPreset,
          }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update preset' })
          throw error
        }
      },

      deletePreset: async (id) => {
        try {
          await meditationApi.deletePreset(id)
          set((state) => ({
            presets: state.presets.filter((p) => p.id !== id),
            selectedPreset: state.selectedPreset?.id === id ? null : state.selectedPreset,
          }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete preset' })
          throw error
        }
      },

      selectPreset: (preset) => {
        set({ selectedPreset: preset })
      },

      // Sessions
      startSession: (preset, durationMinutes) => {
        const totalSeconds = durationMinutes * 60
        const warmUpSeconds = preset?.warm_up_seconds || 0

        set({
          activePreset: preset,
          timer: {
            phase: warmUpSeconds > 0 ? 'warmup' : 'meditation',
            elapsedSeconds: 0,
            remainingSeconds: totalSeconds,
            totalSeconds,
            isRunning: true,
          },
          view: 'timer',
          isPlaying: false,
        })

        // Mark preset as used
        if (preset) {
          meditationApi.markPresetUsed(preset.id).catch(() => {})
        }
      },

      endSession: async (completed, moodBefore, moodAfter, notes) => {
        const { timer, activePreset } = get()

        try {
          await meditationApi.createSession({
            preset_id: activePreset?.id,
            preset_name: activePreset?.name,
            planned_duration_minutes: Math.ceil(timer.totalSeconds / 60),
            actual_duration_seconds: timer.elapsedSeconds,
            completed,
            mood_before: moodBefore,
            mood_after: moodAfter,
            notes,
            session_date: new Date().toISOString().split('T')[0],
          })

          // Refresh stats and sessions
          get().fetchStats()
          get().fetchSessions()
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to save session' })
        }

        // Reset timer
        set({
          timer: initialTimerState,
          activePreset: null,
          view: 'home',
          isPlaying: false,
          audioUrl: null,
        })
      },

      recordSession: async (session) => {
        try {
          await meditationApi.createSession(session as any)
          get().fetchStats()
          get().fetchSessions()
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to record session' })
          throw error
        }
      },

      // Timer
      setTimerPhase: (phase) => {
        set((state) => ({
          timer: { ...state.timer, phase },
        }))
      },

      updateTimer: (elapsed, remaining) => {
        set((state) => ({
          timer: {
            ...state.timer,
            elapsedSeconds: elapsed,
            remainingSeconds: remaining,
          },
        }))
      },

      pauseTimer: () => {
        set((state) => ({
          timer: { ...state.timer, phase: 'paused', isRunning: false },
          isPlaying: false,
        }))
      },

      resumeTimer: () => {
        set((state) => ({
          timer: { ...state.timer, phase: 'meditation', isRunning: true },
        }))
      },

      resetTimer: () => {
        set({
          timer: initialTimerState,
          activePreset: null,
          isPlaying: false,
          audioUrl: null,
        })
      },

      // Audio
      generateAudio: async (style, mood, durationSeconds) => {
        set({ isGeneratingAudio: true, error: null })
        try {
          const response = await meditationApi.generateAudio({
            style,
            mood,
            duration_seconds: durationSeconds,
          })

          if (response.success && response.audio_url) {
            set({
              audioUrl: response.audio_url,
              isGeneratingAudio: false,
            })
          } else {
            set({
              error: response.error || 'Failed to generate audio',
              isGeneratingAudio: false,
            })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate audio',
            isGeneratingAudio: false,
          })
        }
      },

      setAudioUrl: (url) => {
        set({ audioUrl: url })
      },

      setPlaying: (playing) => {
        set({ isPlaying: playing })
      },

      // UI
      setView: (view) => {
        set({ view })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'meditation-storage',
      partialize: (state) => ({
        // Only persist certain fields
        cachedAudio: state.cachedAudio,
      }),
    }
  )
)
