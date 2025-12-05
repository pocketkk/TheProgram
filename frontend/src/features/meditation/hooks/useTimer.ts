/**
 * Timer Hook for Meditation
 *
 * Handles countdown timer logic with warm-up, meditation, and cool-down phases
 */
import { useEffect, useRef, useCallback } from 'react'
import { useMeditationStore } from '../stores/useMeditationStore'
import type { TimerPhase } from '../types'

interface UseTimerOptions {
  warmUpSeconds?: number
  coolDownSeconds?: number
  intervalBellSeconds?: number
  onPhaseChange?: (phase: TimerPhase) => void
  onIntervalBell?: () => void
  onComplete?: () => void
}

export function useTimer(options: UseTimerOptions = {}) {
  const {
    warmUpSeconds = 0,
    coolDownSeconds = 0,
    intervalBellSeconds,
    onPhaseChange,
    onIntervalBell,
    onComplete,
  } = options

  const {
    timer,
    activePreset,
    updateTimer,
    setTimerPhase,
    pauseTimer,
    resumeTimer,
  } = useMeditationStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const lastIntervalBellRef = useRef<number>(0)

  // Clear interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Handle phase transitions
  const handlePhaseTransition = useCallback(
    (elapsed: number) => {
      const totalWithWarmUp = warmUpSeconds + timer.totalSeconds + coolDownSeconds

      if (elapsed < warmUpSeconds) {
        // Still in warm-up
        if (timer.phase !== 'warmup') {
          setTimerPhase('warmup')
          onPhaseChange?.('warmup')
        }
      } else if (elapsed < warmUpSeconds + timer.totalSeconds) {
        // In meditation
        if (timer.phase !== 'meditation') {
          setTimerPhase('meditation')
          onPhaseChange?.('meditation')
        }

        // Check for interval bell
        if (intervalBellSeconds && intervalBellSeconds > 0) {
          const meditationElapsed = elapsed - warmUpSeconds
          const bellCount = Math.floor(meditationElapsed / intervalBellSeconds)
          if (bellCount > lastIntervalBellRef.current) {
            lastIntervalBellRef.current = bellCount
            onIntervalBell?.()
          }
        }
      } else if (elapsed < totalWithWarmUp) {
        // In cool-down
        if (timer.phase !== 'cooldown') {
          setTimerPhase('cooldown')
          onPhaseChange?.('cooldown')
        }
      } else {
        // Completed
        setTimerPhase('completed')
        onPhaseChange?.('completed')
        onComplete?.()
        clearTimerInterval()
      }
    },
    [
      warmUpSeconds,
      coolDownSeconds,
      timer.totalSeconds,
      timer.phase,
      intervalBellSeconds,
      setTimerPhase,
      onPhaseChange,
      onIntervalBell,
      onComplete,
      clearTimerInterval,
    ]
  )

  // Start timer tick
  useEffect(() => {
    if (timer.isRunning && timer.phase !== 'completed') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - pausedTimeRef.current * 1000
      }

      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current) / 1000)
        const totalWithPhases = warmUpSeconds + timer.totalSeconds + coolDownSeconds

        // Calculate remaining based on current phase
        let remaining = 0
        if (elapsed < warmUpSeconds) {
          remaining = warmUpSeconds - elapsed
        } else if (elapsed < warmUpSeconds + timer.totalSeconds) {
          remaining = warmUpSeconds + timer.totalSeconds - elapsed
        } else {
          remaining = totalWithPhases - elapsed
        }

        remaining = Math.max(0, remaining)

        updateTimer(elapsed, remaining)
        handlePhaseTransition(elapsed)
      }, 100)
    }

    return () => {
      clearTimerInterval()
    }
  }, [
    timer.isRunning,
    timer.phase,
    timer.totalSeconds,
    warmUpSeconds,
    coolDownSeconds,
    updateTimer,
    handlePhaseTransition,
    clearTimerInterval,
  ])

  // Handle pause
  const pause = useCallback(() => {
    pausedTimeRef.current = timer.elapsedSeconds
    startTimeRef.current = 0
    pauseTimer()
  }, [timer.elapsedSeconds, pauseTimer])

  // Handle resume
  const resume = useCallback(() => {
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000
    resumeTimer()
  }, [resumeTimer])

  // Reset refs when timer resets
  useEffect(() => {
    if (timer.phase === 'idle') {
      startTimeRef.current = 0
      pausedTimeRef.current = 0
      lastIntervalBellRef.current = 0
    }
  }, [timer.phase])

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Get progress percentage
  const getProgress = useCallback((): number => {
    if (timer.totalSeconds === 0) return 0
    const totalWithPhases = warmUpSeconds + timer.totalSeconds + coolDownSeconds
    return Math.min(100, (timer.elapsedSeconds / totalWithPhases) * 100)
  }, [timer.elapsedSeconds, timer.totalSeconds, warmUpSeconds, coolDownSeconds])

  // Get phase-specific remaining time
  const getPhaseRemaining = useCallback((): number => {
    const elapsed = timer.elapsedSeconds

    if (elapsed < warmUpSeconds) {
      return warmUpSeconds - elapsed
    } else if (elapsed < warmUpSeconds + timer.totalSeconds) {
      return warmUpSeconds + timer.totalSeconds - elapsed
    } else {
      return warmUpSeconds + timer.totalSeconds + coolDownSeconds - elapsed
    }
  }, [timer.elapsedSeconds, timer.totalSeconds, warmUpSeconds, coolDownSeconds])

  return {
    timer,
    activePreset,
    pause,
    resume,
    formatTime,
    getProgress,
    getPhaseRemaining,
    displayTime: formatTime(getPhaseRemaining()),
    progress: getProgress(),
  }
}
