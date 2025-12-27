/**
 * Chart Loading State Component
 *
 * Animated loading indicator shown while chart calculations are in progress.
 * Features a spinning zodiac wheel with pulsing elements and status text.
 *
 * @module ChartLoadingState
 */

import { motion } from 'framer-motion'

interface ChartLoadingStateProps {
  /** Size of the loading spinner in pixels */
  size?: number
  /** Optional loading message to display */
  message?: string
  /** Progress percentage (0-100) - optional */
  progress?: number
}

/**
 * Animated loading state for birth chart calculations
 *
 * @example
 * ```tsx
 * {isCalculating ? (
 *   <ChartLoadingState size={600} message="Calculating positions..." />
 * ) : (
 *   <BirthChartWheel chart={chart} />
 * )}
 * ```
 */
export function ChartLoadingState({
  size = 600,
  message = 'Calculating chart...',
  progress
}: ChartLoadingStateProps) {
  const center = size / 2
  const outerRadius = size / 2 - 40
  const middleRadius = outerRadius * 0.85
  const innerRadius = outerRadius * 0.75

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ filter: 'drop-shadow(0 0 20px rgba(78, 205, 196, 0.3))' }}
      >
        <defs>
          {/* Gradient for outer ring */}
          <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ECDC4" />
            <stop offset="33%" stopColor="#6B46C1" />
            <stop offset="66%" stopColor="#E91E63" />
            <stop offset="100%" stopColor="#4ECDC4" />
          </linearGradient>

          {/* Gradient for middle ring */}
          <linearGradient id="loadingGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FF6B6B" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>

          {/* Radial gradient for center glow */}
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#6B46C1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center glow - pulsing */}
        <motion.circle
          cx={center}
          cy={center}
          r={innerRadius * 0.8}
          fill="url(#centerGlow)"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Outer ring - spinning zodiac wheel */}
        <motion.circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="url(#loadingGradient)"
          strokeWidth={3}
          strokeDasharray="10 5"
          strokeLinecap="round"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Middle ring - counter-rotating */}
        <motion.circle
          cx={center}
          cy={center}
          r={middleRadius}
          fill="none"
          stroke="url(#loadingGradient2)"
          strokeWidth={2}
          strokeDasharray="15 10"
          strokeLinecap="round"
          initial={{ rotate: 0 }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Inner ring - pulsing */}
        <motion.circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="#4ECDC4"
          strokeWidth={2}
          strokeOpacity={0.3}
          initial={{ scale: 0.95, opacity: 0.3 }}
          animate={{
            scale: [0.95, 1.05, 0.95],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Zodiac symbols (stationary) */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const symbols = ['♈', '♊', '♌', '♎', '♐', '♒']
          const rad = (angle - 90) * (Math.PI / 180)
          const x = center + outerRadius * 0.85 * Math.cos(rad)
          const y = center + outerRadius * 0.85 * Math.sin(rad)

          return (
            <motion.text
              key={angle}
              x={x}
              y={y}
              fontSize={24}
              fill="#4ECDC4"
              fillOpacity={0.4}
              textAnchor="middle"
              dominantBaseline="middle"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut'
              }}
            >
              {symbols[i]}
            </motion.text>
          )
        })}

        {/* Planetary orbits (decorative dots) */}
        {[1, 2, 3, 4].map(orbit => {
          const radius = innerRadius * (0.3 + orbit * 0.15)
          const numDots = 8 + orbit * 2

          return Array.from({ length: numDots }).map((_, i) => {
            const angle = (i * 360) / numDots
            const rad = (angle - 90) * (Math.PI / 180)
            const x = center + radius * Math.cos(rad)
            const y = center + radius * Math.sin(rad)

            return (
              <motion.circle
                key={`${orbit}-${i}`}
                cx={x}
                cy={y}
                r={1.5}
                fill="#6B46C1"
                initial={{ opacity: 0.2 }}
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.5, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: (orbit * 0.2) + (i * 0.05),
                  ease: 'easeInOut'
                }}
              />
            )
          })
        })}

        {/* Progress arc (if progress is provided) */}
        {typeof progress === 'number' && (
          <motion.circle
            cx={center}
            cy={center}
            r={outerRadius + 10}
            fill="none"
            stroke="#FFD700"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * (outerRadius + 10)}`}
            initial={{ strokeDashoffset: 2 * Math.PI * (outerRadius + 10) }}
            animate={{
              strokeDashoffset: 2 * Math.PI * (outerRadius + 10) * (1 - progress / 100)
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              transformOrigin: `${center}px ${center}px`,
              transform: 'rotate(-90deg)'
            }}
          />
        )}
      </svg>

      {/* Loading text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          className="text-cosmic-200 text-base font-medium mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {message}
        </motion.div>

        {/* Progress percentage */}
        {typeof progress === 'number' && (
          <motion.div
            className="text-cosmic-300 text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Math.round(progress)}%
          </motion.div>
        )}

        {/* Calculation steps indicator */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-cosmic-400"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal loading state (smaller, simpler)
 * Use this for inline loading indicators
 */
export function ChartLoadingStateMinimal({ size = 60 }: { size?: number }) {
  const center = size / 2
  const radius = size / 2 - 4

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="minimalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ECDC4" />
            <stop offset="100%" stopColor="#6B46C1" />
          </linearGradient>
        </defs>

        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#minimalGradient)"
          strokeWidth={3}
          strokeDasharray="60 40"
          strokeLinecap="round"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      </svg>
    </div>
  )
}
