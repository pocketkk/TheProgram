import { useState, useEffect } from 'react'

function getSecondsLeft(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TrialBanner() {
  const expiresAt = localStorage.getItem('trial_expires_at')
  const [secondsLeft, setSecondsLeft] = useState(() =>
    expiresAt ? getSecondsLeft(expiresAt) : -1
  )

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => {
      setSecondsLeft(getSecondsLeft(expiresAt))
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  // Not a trial session
  if (secondsLeft < 0) return null

  // Trial expired — full screen overlay
  if (secondsLeft === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center max-w-sm px-8 py-10 rounded-2xl bg-[#0e0c1a] border border-violet-500/30">
          <div className="text-4xl mb-4">✦</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Your trial has ended</h2>
          <p className="text-gray-400 mb-6">
            Your 15-minute session is complete and your data has been cleared.
          </p>
          <a
            href="https://theprogram.us"
            className="inline-block px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Back to The Program →
          </a>
        </div>
      </div>
    )
  }

  // Countdown banner — only show when ≤ 5 minutes remain
  if (secondsLeft > 5 * 60) return null

  const urgent = secondsLeft <= 60
  return (
    <div className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-3 py-2 text-sm font-medium transition-colors ${
      urgent ? 'bg-red-900/80 text-red-200' : 'bg-violet-900/70 text-violet-200'
    }`}>
      <span>⏱</span>
      <span>Trial ends in <span className="font-mono font-bold">{formatTime(secondsLeft)}</span></span>
      <span>·</span>
      <a href="https://theprogram.us#download" className="underline underline-offset-2 hover:text-white">
        Get full access →
      </a>
    </div>
  )
}
