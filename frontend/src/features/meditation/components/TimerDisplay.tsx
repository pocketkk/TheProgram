/**
 * Timer Display Component
 *
 * Shows the meditation timer with phase indicator and controls
 */
import { motion } from 'framer-motion'
import { Play, Pause, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { useTimer } from '../hooks/useTimer'
import { useMeditationStore } from '../stores/useMeditationStore'
import type { TimerPhase } from '../types'

interface TimerDisplayProps {
  onComplete?: () => void
  onCancel?: () => void
}

const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: 'Ready',
  warmup: 'Preparing...',
  meditation: 'Meditating',
  cooldown: 'Winding Down',
  paused: 'Paused',
  completed: 'Complete',
}

const PHASE_COLORS: Record<TimerPhase, string> = {
  idle: 'text-gray-400',
  warmup: 'text-amber-400',
  meditation: 'text-purple-400',
  cooldown: 'text-blue-400',
  paused: 'text-yellow-400',
  completed: 'text-green-400',
}

export function TimerDisplay({ onComplete, onCancel }: TimerDisplayProps) {
  const { activePreset, setView, resetTimer } = useMeditationStore()

  const warmUpSeconds = activePreset?.warm_up_seconds || 0
  const coolDownSeconds = activePreset?.cool_down_seconds || 0
  const intervalBellSeconds = activePreset?.interval_bell_minutes
    ? activePreset.interval_bell_minutes * 60
    : undefined

  const {
    timer,
    pause,
    resume,
    displayTime,
    progress,
  } = useTimer({
    warmUpSeconds,
    coolDownSeconds,
    intervalBellSeconds,
    onComplete: () => {
      // Play completion sound
      playBell()
      onComplete?.()
    },
    onIntervalBell: () => {
      playBell()
    },
    onPhaseChange: (phase) => {
      if (phase === 'meditation') {
        playBell()
      }
    },
  })

  // Play bell sound
  const playBell = () => {
    // Create a simple bell sound using Web Audio
    try {
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 528 // Solfeggio frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 2)
    } catch (e) {
      console.warn('Could not play bell sound:', e)
    }
  }

  const handleCancel = () => {
    resetTimer()
    setView('home')
    onCancel?.()
  }

  const handlePauseResume = () => {
    if (timer.isRunning) {
      pause()
    } else {
      resume()
    }
  }

  // Calculate stroke dasharray for circular progress
  const radius = 140
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      {/* Circular Timer */}
      <div className="relative">
        <svg
          width="320"
          height="320"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-cosmic-800"
          />
          {/* Progress circle */}
          <motion.circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5 }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>

        {/* Timer content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Phase label */}
          <motion.span
            key={timer.phase}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-medium ${PHASE_COLORS[timer.phase]}`}
          >
            {PHASE_LABELS[timer.phase]}
          </motion.span>

          {/* Time display */}
          <motion.span
            className="text-6xl font-mono font-bold text-white mt-2"
            key={displayTime}
            initial={{ scale: 1.02 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            {displayTime}
          </motion.span>

          {/* Preset name */}
          {activePreset && (
            <span className="text-sm text-gray-500 mt-2">
              {activePreset.name}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mt-8">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleCancel}
          className="w-14 h-14 rounded-full"
        >
          <X className="h-6 w-6" />
        </Button>

        <Button
          size="lg"
          onClick={handlePauseResume}
          className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
        >
          {timer.isRunning ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8 ml-1" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            resetTimer()
            if (activePreset) {
              useMeditationStore.getState().startSession(
                activePreset,
                activePreset.duration_minutes
              )
            }
          }}
          className="w-14 h-14 rounded-full"
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>

      {/* Progress bar (alternative linear view) */}
      <div className="w-full max-w-sm mt-8">
        <div className="h-2 bg-cosmic-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0:00</span>
          <span>{Math.floor(timer.totalSeconds / 60)}:00</span>
        </div>
      </div>
    </div>
  )
}
