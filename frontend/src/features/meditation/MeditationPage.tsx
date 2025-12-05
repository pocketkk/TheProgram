/**
 * Meditation Page
 *
 * Main page for the meditation feature with timer, presets, and visualizations
 */
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Plus,
  Clock,
  TrendingUp,
  Flame,
  Music,
  Sparkles,
  Play,
  ChevronLeft,
  Volume2,
  VolumeX,
  Settings2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from '@/components/ui'
import { useMeditationStore } from './stores/useMeditationStore'
import { PresetCard } from './components/PresetCard'
import { TimerDisplay } from './components/TimerDisplay'
import { AudioVisualizer } from './components/AudioVisualizer'
import { MUSIC_STYLES, MUSIC_MOODS, VISUALIZATION_TYPES, MOODS } from './types'
import type { MeditationPreset, VisualizationType } from './types'

// Quick start durations
const QUICK_START_DURATIONS = [5, 10, 15, 20, 30]

export function MeditationPage() {
  const {
    presets,
    sessions,
    stats,
    view,
    timer,
    activePreset,
    audioUrl,
    isGeneratingAudio,
    isLoadingPresets,
    isLoadingStats,
    error,
    isPlaying,
    fetchPresets,
    fetchSessions,
    fetchStats,
    createPreset,
    updatePreset,
    deletePreset,
    startSession,
    endSession,
    generateAudio,
    setAudioUrl,
    setPlaying,
    setView,
    clearError,
  } = useMeditationStore()

  // Audio player ref
  const audioRef = useRef<HTMLAudioElement>(null)

  // Create preset form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPreset, setNewPreset] = useState({
    name: '',
    description: '',
    duration_minutes: 10,
    music_style: 'ambient',
    music_mood: 'calming',
    visualization_type: 'waveform' as VisualizationType,
    music_enabled: true,
    visualization_enabled: true,
  })

  // End session mood state
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [moodBefore, setMoodBefore] = useState<string>('')
  const [moodAfter, setMoodAfter] = useState<string>('')
  const [sessionNotes, setSessionNotes] = useState('')

  // Fetch data on mount
  useEffect(() => {
    fetchPresets()
    fetchSessions()
    fetchStats()
  }, [fetchPresets, fetchSessions, fetchStats])

  // Handle audio playback
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audioUrl) {
      audio.src = audioUrl
      if (timer.isRunning && timer.phase === 'meditation') {
        audio.play().then(() => setPlaying(true)).catch(() => {})
      }
    }
  }, [audioUrl, timer.isRunning, timer.phase, setPlaying])

  // Pause/resume audio with timer
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (timer.phase === 'paused') {
      audio.pause()
      setPlaying(false)
    } else if (timer.isRunning && timer.phase === 'meditation') {
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [timer.phase, timer.isRunning, setPlaying])

  // Handle quick start
  const handleQuickStart = (minutes: number) => {
    startSession(null, minutes)
  }

  // Handle preset play
  const handlePlayPreset = (preset: MeditationPreset) => {
    startSession(preset, preset.duration_minutes)

    // Generate audio if music is enabled
    if (preset.music_enabled && preset.music_style) {
      generateAudio(
        preset.music_style,
        preset.music_mood || 'calming',
        preset.duration_minutes * 60
      )
    }
  }

  // Handle session complete
  const handleSessionComplete = () => {
    setShowEndDialog(true)
  }

  // Handle save session
  const handleSaveSession = () => {
    endSession(true, moodBefore, moodAfter, sessionNotes)
    setShowEndDialog(false)
    setMoodBefore('')
    setMoodAfter('')
    setSessionNotes('')
  }

  // Handle create preset
  const handleCreatePreset = async () => {
    try {
      await createPreset({
        ...newPreset,
        is_favorite: false,
        is_default: presets.length === 0,
      })
      setShowCreateForm(false)
      setNewPreset({
        name: '',
        description: '',
        duration_minutes: 10,
        music_style: 'ambient',
        music_mood: 'calming',
        visualization_type: 'waveform',
        music_enabled: true,
        visualization_enabled: true,
      })
    } catch (e) {
      // Error handled in store
    }
  }

  // Render timer view
  if (view === 'timer') {
    return (
      <div className="min-h-screen p-6">
        {/* Hidden audio element */}
        <audio ref={audioRef} loop />

        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => {
            endSession(false)
          }}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Exit Session
        </Button>

        <div className="max-w-4xl mx-auto">
          {/* Visualization */}
          {(activePreset?.visualization_enabled ?? true) && (
            <div className="h-64 rounded-xl overflow-hidden mb-8">
              <AudioVisualizer
                audioElement={audioRef.current}
                type={(activePreset?.visualization_type as VisualizationType) || 'waveform'}
                isPlaying={isPlaying}
                intensity={activePreset?.visualization_intensity || 0.5}
              />
            </div>
          )}

          {/* Timer */}
          <TimerDisplay
            onComplete={handleSessionComplete}
            onCancel={() => endSession(false)}
          />

          {/* Audio controls */}
          <div className="flex justify-center mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                const audio = audioRef.current
                if (audio) {
                  if (isPlaying) {
                    audio.pause()
                    setPlaying(false)
                  } else {
                    audio.play().then(() => setPlaying(true)).catch(() => {})
                  }
                }
              }}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Volume2 className="h-5 w-5" />
                  Sound On
                </>
              ) : (
                <>
                  <VolumeX className="h-5 w-5" />
                  Sound Off
                </>
              )}
            </Button>

            {isGeneratingAudio && (
              <div className="flex items-center gap-2 ml-4 text-sm text-gray-400">
                <Spinner size="sm" />
                Generating audio...
              </div>
            )}
          </div>
        </div>

        {/* End session dialog */}
        <AnimatePresence>
          {showEndDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-cosmic-900 border border-cosmic-700 rounded-xl p-6 max-w-md w-full mx-4"
              >
                <h3 className="text-xl font-heading text-white mb-4">
                  Session Complete
                </h3>

                {/* Mood before */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    How did you feel before?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setMoodBefore(mood.value)}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          moodBefore === mood.value
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-cosmic-700 hover:border-cosmic-500'
                        }`}
                      >
                        <span className="mr-1">{mood.emoji}</span>
                        <span className="text-sm">{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood after */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    How do you feel now?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setMoodAfter(mood.value)}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          moodAfter === mood.value
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-cosmic-700 hover:border-cosmic-500'
                        }`}
                      >
                        <span className="mr-1">{mood.emoji}</span>
                        <span className="text-sm">{mood.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Any reflections on your session..."
                    rows={3}
                    className="w-full px-3 py-2 bg-cosmic-800 border border-cosmic-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      endSession(true)
                      setShowEndDialog(false)
                    }}
                  >
                    Skip
                  </Button>
                  <Button onClick={handleSaveSession}>
                    Save Session
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Render home view
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gradient-celestial flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-400" />
              Meditation
            </h1>
            <p className="text-gray-400 mt-2">
              Find your center with guided meditation and ambient soundscapes
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Preset
          </Button>
        </div>
      </motion.div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between"
        >
          <span className="text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            ×
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total_minutes}</p>
                <p className="text-sm text-gray-400">Total Minutes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/20">
                <Flame className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.streak_days}</p>
                <p className="text-sm text-gray-400">Day Streak</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/20">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sessions_this_week}</p>
                <p className="text-sm text-gray-400">This Week</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total_sessions}</p>
                <p className="text-sm text-gray-400">Total Sessions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Start */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {QUICK_START_DURATIONS.map((minutes) => (
                  <Button
                    key={minutes}
                    variant="outline"
                    size="lg"
                    onClick={() => handleQuickStart(minutes)}
                    className="flex-1 min-w-[80px]"
                  >
                    {minutes} min
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Your Presets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPresets ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : presets.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500 mb-4">No presets yet</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    Create Your First Preset
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onPlay={() => handlePlayPreset(preset)}
                      onDelete={() => deletePreset(preset.id)}
                      onToggleFavorite={() =>
                        updatePreset(preset.id, { is_favorite: !preset.is_favorite })
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No sessions yet. Start meditating!
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="p-3 bg-cosmic-800/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-sm">
                          {session.preset_name || 'Quick Session'}
                        </span>
                        {session.completed && (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{Math.round(session.actual_duration_seconds / 60)} min</span>
                        <span>
                          {new Date(session.session_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Preset Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cosmic-900 border border-cosmic-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-heading text-white mb-6">
                Create New Preset
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newPreset.name}
                    onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                    placeholder="My Meditation"
                    className="w-full px-3 py-2 bg-cosmic-800 border border-cosmic-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={newPreset.description}
                    onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 bg-cosmic-800 border border-cosmic-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Duration: {newPreset.duration_minutes} minutes
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={newPreset.duration_minutes}
                    onChange={(e) =>
                      setNewPreset({ ...newPreset, duration_minutes: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* Music Style */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    <Music className="inline h-4 w-4 mr-1" />
                    Music Style
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => setNewPreset({ ...newPreset, music_style: style.value })}
                        className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                          newPreset.music_style === style.value
                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                            : 'border-cosmic-700 text-gray-400 hover:border-cosmic-500'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Music Mood */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Music Mood</label>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_MOODS.map((mood) => (
                      <button
                        key={mood.value}
                        onClick={() => setNewPreset({ ...newPreset, music_mood: mood.value })}
                        className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                          newPreset.music_mood === mood.value
                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                            : 'border-cosmic-700 text-gray-400 hover:border-cosmic-500'
                        }`}
                      >
                        {mood.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visualization Type */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Visualization</label>
                  <div className="flex flex-wrap gap-2">
                    {VISUALIZATION_TYPES.map((viz) => (
                      <button
                        key={viz.value}
                        onClick={() =>
                          setNewPreset({ ...newPreset, visualization_type: viz.value as VisualizationType })
                        }
                        className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                          newPreset.visualization_type === viz.value
                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                            : 'border-cosmic-700 text-gray-400 hover:border-cosmic-500'
                        }`}
                      >
                        {viz.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePreset}
                  disabled={!newPreset.name.trim()}
                >
                  Create Preset
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MeditationPage
