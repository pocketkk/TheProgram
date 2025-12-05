/**
 * Meditation Store Tests
 *
 * Tests for meditation state management including:
 * - Timer state management
 * - Preset management
 * - Session tracking
 * - Audio state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMeditationStore } from '../stores/useMeditationStore'
import type { MeditationPreset, TimerPhase } from '../types'

// Mock the API module
vi.mock('@/lib/api/meditation', () => ({
  listPresets: vi.fn().mockResolvedValue([]),
  listSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0, limit: 50, offset: 0 }),
  getStats: vi.fn().mockResolvedValue({
    total_sessions: 0,
    total_minutes: 0,
    completed_sessions: 0,
    streak_days: 0,
    average_session_minutes: 0,
    favorite_preset: null,
    sessions_this_week: 0,
    sessions_this_month: 0,
  }),
  createPreset: vi.fn().mockImplementation((data) =>
    Promise.resolve({ id: 'preset-1', ...data, times_used: 0, created_at: '', updated_at: '' })
  ),
  updatePreset: vi.fn().mockImplementation((id, data) =>
    Promise.resolve({ id, ...data })
  ),
  deletePreset: vi.fn().mockResolvedValue(undefined),
  markPresetUsed: vi.fn().mockResolvedValue({ times_used: 1 }),
  createSession: vi.fn().mockImplementation((data) =>
    Promise.resolve({ id: 'session-1', ...data, created_at: '', updated_at: '' })
  ),
  generateAudio: vi.fn().mockResolvedValue({
    success: true,
    audio_id: 'audio-1',
    audio_url: '/api/meditation/audio/audio-1',
  }),
}))

describe('Meditation Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useMeditationStore.setState({
      presets: [],
      selectedPreset: null,
      isLoadingPresets: false,
      sessions: [],
      isLoadingSessions: false,
      stats: null,
      isLoadingStats: false,
      timer: {
        phase: 'idle',
        elapsedSeconds: 0,
        remainingSeconds: 0,
        totalSeconds: 0,
        isRunning: false,
      },
      activePreset: null,
      currentAudio: null,
      audioUrl: null,
      isGeneratingAudio: false,
      cachedAudio: [],
      view: 'home',
      isPlaying: false,
      error: null,
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useMeditationStore.getState()

      expect(state.presets).toEqual([])
      expect(state.view).toBe('home')
      expect(state.timer.phase).toBe('idle')
      expect(state.timer.isRunning).toBe(false)
      expect(state.isPlaying).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should have idle timer initially', () => {
      const { timer } = useMeditationStore.getState()

      expect(timer.phase).toBe('idle')
      expect(timer.elapsedSeconds).toBe(0)
      expect(timer.remainingSeconds).toBe(0)
      expect(timer.totalSeconds).toBe(0)
      expect(timer.isRunning).toBe(false)
    })
  })

  describe('Timer Management', () => {
    it('should start a session', () => {
      const store = useMeditationStore.getState()
      store.startSession(null, 10)

      const state = useMeditationStore.getState()
      expect(state.timer.phase).toBe('meditation')
      expect(state.timer.totalSeconds).toBe(600) // 10 minutes
      expect(state.timer.isRunning).toBe(true)
      expect(state.view).toBe('timer')
    })

    it('should start a session with preset', () => {
      const mockPreset: MeditationPreset = {
        id: 'preset-1',
        name: 'Test Preset',
        description: null,
        duration_minutes: 15,
        interval_bell_minutes: null,
        warm_up_seconds: 10,
        cool_down_seconds: 10,
        music_enabled: true,
        music_prompt: null,
        music_style: 'ambient',
        music_tempo: null,
        music_mood: 'calming',
        binaural_frequency: null,
        visualization_enabled: true,
        visualization_type: 'waveform',
        visualization_colors: null,
        visualization_intensity: 0.5,
        times_used: 0,
        is_favorite: false,
        is_default: false,
        created_at: '',
        updated_at: '',
      }

      const store = useMeditationStore.getState()
      store.startSession(mockPreset, 15)

      const state = useMeditationStore.getState()
      expect(state.activePreset).toEqual(mockPreset)
      expect(state.timer.totalSeconds).toBe(900) // 15 minutes
      expect(state.timer.phase).toBe('warmup') // Has warm-up
    })

    it('should pause timer', () => {
      const store = useMeditationStore.getState()
      store.startSession(null, 10)
      store.pauseTimer()

      const state = useMeditationStore.getState()
      expect(state.timer.phase).toBe('paused')
      expect(state.timer.isRunning).toBe(false)
      expect(state.isPlaying).toBe(false)
    })

    it('should resume timer', () => {
      const store = useMeditationStore.getState()
      store.startSession(null, 10)
      store.pauseTimer()
      store.resumeTimer()

      const state = useMeditationStore.getState()
      expect(state.timer.phase).toBe('meditation')
      expect(state.timer.isRunning).toBe(true)
    })

    it('should reset timer', () => {
      const store = useMeditationStore.getState()
      store.startSession(null, 10)
      store.resetTimer()

      const state = useMeditationStore.getState()
      expect(state.timer.phase).toBe('idle')
      expect(state.timer.elapsedSeconds).toBe(0)
      expect(state.timer.isRunning).toBe(false)
      expect(state.activePreset).toBeNull()
    })

    it('should update timer values', () => {
      const store = useMeditationStore.getState()
      store.startSession(null, 10)
      store.updateTimer(60, 540)

      const state = useMeditationStore.getState()
      expect(state.timer.elapsedSeconds).toBe(60)
      expect(state.timer.remainingSeconds).toBe(540)
    })

    it('should set timer phase', () => {
      const phases: TimerPhase[] = ['idle', 'warmup', 'meditation', 'cooldown', 'paused', 'completed']

      phases.forEach(phase => {
        useMeditationStore.getState().setTimerPhase(phase)
        expect(useMeditationStore.getState().timer.phase).toBe(phase)
      })
    })
  })

  describe('View Management', () => {
    it('should change view', () => {
      const store = useMeditationStore.getState()

      store.setView('timer')
      expect(useMeditationStore.getState().view).toBe('timer')

      store.setView('presets')
      expect(useMeditationStore.getState().view).toBe('presets')

      store.setView('history')
      expect(useMeditationStore.getState().view).toBe('history')

      store.setView('home')
      expect(useMeditationStore.getState().view).toBe('home')
    })
  })

  describe('Audio State', () => {
    it('should set audio URL', () => {
      const store = useMeditationStore.getState()
      store.setAudioUrl('/api/meditation/audio/test')

      const state = useMeditationStore.getState()
      expect(state.audioUrl).toBe('/api/meditation/audio/test')
    })

    it('should clear audio URL', () => {
      const store = useMeditationStore.getState()
      store.setAudioUrl('/api/meditation/audio/test')
      store.setAudioUrl(null)

      const state = useMeditationStore.getState()
      expect(state.audioUrl).toBeNull()
    })

    it('should set playing state', () => {
      const store = useMeditationStore.getState()

      store.setPlaying(true)
      expect(useMeditationStore.getState().isPlaying).toBe(true)

      store.setPlaying(false)
      expect(useMeditationStore.getState().isPlaying).toBe(false)
    })
  })

  describe('Preset Management', () => {
    it('should select a preset', () => {
      const mockPreset: MeditationPreset = {
        id: 'preset-1',
        name: 'Selected Preset',
        description: null,
        duration_minutes: 10,
        interval_bell_minutes: null,
        warm_up_seconds: null,
        cool_down_seconds: null,
        music_enabled: true,
        music_prompt: null,
        music_style: 'ambient',
        music_tempo: null,
        music_mood: 'calming',
        binaural_frequency: null,
        visualization_enabled: true,
        visualization_type: 'waveform',
        visualization_colors: null,
        visualization_intensity: 0.5,
        times_used: 0,
        is_favorite: false,
        is_default: false,
        created_at: '',
        updated_at: '',
      }

      const store = useMeditationStore.getState()
      store.selectPreset(mockPreset)

      expect(useMeditationStore.getState().selectedPreset).toEqual(mockPreset)
    })

    it('should clear selected preset', () => {
      const store = useMeditationStore.getState()
      store.selectPreset({
        id: 'test',
        name: 'Test',
        description: null,
        duration_minutes: 10,
        interval_bell_minutes: null,
        warm_up_seconds: null,
        cool_down_seconds: null,
        music_enabled: true,
        music_prompt: null,
        music_style: 'ambient',
        music_tempo: null,
        music_mood: 'calming',
        binaural_frequency: null,
        visualization_enabled: true,
        visualization_type: 'waveform',
        visualization_colors: null,
        visualization_intensity: 0.5,
        times_used: 0,
        is_favorite: false,
        is_default: false,
        created_at: '',
        updated_at: '',
      })
      store.selectPreset(null)

      expect(useMeditationStore.getState().selectedPreset).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should clear error', () => {
      useMeditationStore.setState({ error: 'Test error' })

      const store = useMeditationStore.getState()
      store.clearError()

      expect(useMeditationStore.getState().error).toBeNull()
    })
  })
})

describe('Timer State Calculations', () => {
  beforeEach(() => {
    useMeditationStore.setState({
      timer: {
        phase: 'idle',
        elapsedSeconds: 0,
        remainingSeconds: 0,
        totalSeconds: 0,
        isRunning: false,
      },
    })
  })

  it('should calculate timer for quick start (no preset)', () => {
    useMeditationStore.getState().startSession(null, 5)

    const { timer } = useMeditationStore.getState()
    expect(timer.totalSeconds).toBe(300) // 5 minutes
    expect(timer.remainingSeconds).toBe(300)
    expect(timer.phase).toBe('meditation') // No warmup without preset
  })

  it('should handle warmup phase when preset has warmup', () => {
    const presetWithWarmup: MeditationPreset = {
      id: 'warmup-test',
      name: 'Warmup Test',
      description: null,
      duration_minutes: 10,
      interval_bell_minutes: null,
      warm_up_seconds: 30,
      cool_down_seconds: null,
      music_enabled: false,
      music_prompt: null,
      music_style: null,
      music_tempo: null,
      music_mood: null,
      binaural_frequency: null,
      visualization_enabled: false,
      visualization_type: null,
      visualization_colors: null,
      visualization_intensity: null,
      times_used: 0,
      is_favorite: false,
      is_default: false,
      created_at: '',
      updated_at: '',
    }

    useMeditationStore.getState().startSession(presetWithWarmup, 10)

    const { timer, activePreset } = useMeditationStore.getState()
    expect(timer.phase).toBe('warmup')
    expect(activePreset?.warm_up_seconds).toBe(30)
  })
})
