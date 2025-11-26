/**
 * Morphing Avatar Component
 * SVG-based avatar that morphs between different states
 */

import { motion, type Variants } from 'framer-motion'
import { useMemo } from 'react'
import type { AvatarState } from '../stores/companionStore'

interface CompanionAvatarProps {
  state: AvatarState
  size?: number
  className?: string
}

// SVG path data for each state
// These are carefully crafted blob-like shapes that morph smoothly
const avatarPaths: Record<AvatarState, string> = {
  idle: 'M50,15 C70,15 85,25 90,45 C95,65 85,85 65,90 C45,95 25,85 15,65 C5,45 15,25 35,18 C42,16 46,15 50,15 Z',
  listening:
    'M50,12 C72,12 88,28 92,48 C96,68 84,88 62,92 C40,96 22,84 14,62 C6,40 18,22 40,14 C46,12 48,12 50,12 Z',
  thinking:
    'M50,20 C65,20 78,30 82,48 C86,66 76,82 58,86 C40,90 26,78 22,60 C18,42 28,26 46,22 C48,21 49,20 50,20 Z',
  speaking:
    'M50,10 C75,10 92,30 95,52 C98,74 82,92 58,95 C34,98 12,78 8,54 C4,30 22,12 48,10 C49,10 50,10 50,10 Z',
  acting:
    'M55,18 C78,22 88,35 90,55 C92,75 78,88 55,88 C32,88 18,72 20,52 C22,32 38,18 55,18 Z',
  curious:
    'M48,12 C68,8 86,22 92,42 C98,62 88,84 66,92 C44,100 20,88 12,66 C4,44 18,20 42,12 C45,11 47,12 48,12 Z',
  celebrating:
    'M50,5 C80,5 98,25 100,55 C102,85 80,100 50,100 C20,100 -2,85 0,55 C2,25 20,5 50,5 Z',
}

// Animation variants for each state
const stateVariants: Variants = {
  idle: {
    scale: 1,
    rotate: 0,
    transition: {
      duration: 4,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
  listening: {
    scale: [1, 1.05, 1],
    rotate: [0, 2, -2, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  thinking: {
    scale: 0.92,
    rotate: [0, 5, -5, 0],
    transition: {
      rotate: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
      scale: {
        duration: 0.5,
      },
    },
  },
  speaking: {
    scale: [1, 1.08, 1],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  acting: {
    scale: 1,
    x: [0, 5, 0],
    transition: {
      duration: 0.3,
      repeat: 3,
      ease: 'easeInOut',
    },
  },
  curious: {
    scale: 1,
    rotate: [0, 8, 0],
    y: [0, -3, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  celebrating: {
    scale: [1, 1.15, 1],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 0.6,
      repeat: 3,
      ease: 'easeOut',
    },
  },
}

// Gradient colors for each state
const stateColors: Record<AvatarState, { start: string; end: string }> = {
  idle: { start: '#6366f1', end: '#8b5cf6' }, // Indigo to purple
  listening: { start: '#818cf8', end: '#a78bfa' }, // Lighter, more alert
  thinking: { start: '#4f46e5', end: '#7c3aed' }, // Deeper, concentrated
  speaking: { start: '#7c3aed', end: '#c084fc' }, // Purple, expressive
  acting: { start: '#6366f1', end: '#06b6d4' }, // Indigo to cyan, directional
  curious: { start: '#f59e0b', end: '#a78bfa' }, // Golden highlight
  celebrating: { start: '#ec4899', end: '#f59e0b' }, // Pink to gold, joyful
}

// Inner glow/particle colors
const glowColors: Record<AvatarState, string> = {
  idle: 'rgba(139, 92, 246, 0.3)',
  listening: 'rgba(167, 139, 250, 0.4)',
  thinking: 'rgba(79, 70, 229, 0.5)',
  speaking: 'rgba(192, 132, 252, 0.4)',
  acting: 'rgba(6, 182, 212, 0.4)',
  curious: 'rgba(245, 158, 11, 0.5)',
  celebrating: 'rgba(236, 72, 153, 0.5)',
}

export function CompanionAvatar({
  state,
  size = 56,
  className = '',
}: CompanionAvatarProps) {
  const gradientId = useMemo(
    () => `avatar-gradient-${Math.random().toString(36).slice(2)}`,
    []
  )
  const glowId = useMemo(
    () => `avatar-glow-${Math.random().toString(36).slice(2)}`,
    []
  )

  const colors = stateColors[state]
  const glowColor = glowColors[state]
  const path = avatarPaths[state]

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      variants={stateVariants}
      animate={state}
      initial={false}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="drop-shadow-lg"
      >
        <defs>
          {/* Main gradient */}
          <motion.linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <motion.stop
              offset="0%"
              animate={{ stopColor: colors.start }}
              transition={{ duration: 0.5 }}
            />
            <motion.stop
              offset="100%"
              animate={{ stopColor: colors.end }}
              transition={{ duration: 0.5 }}
            />
          </motion.linearGradient>

          {/* Inner glow filter */}
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Breathing animation for idle */}
          <motion.radialGradient
            id={`${gradientId}-inner`}
            cx="50%"
            cy="50%"
            r="50%"
          >
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0)" />
          </motion.radialGradient>
        </defs>

        {/* Outer glow */}
        <motion.ellipse
          cx="50"
          cy="50"
          rx="35"
          ry="35"
          fill={glowColor}
          filter={`url(#${glowId})`}
          animate={{
            opacity: state === 'idle' ? [0.3, 0.5, 0.3] : 0.4,
            scale: state === 'celebrating' ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: state === 'idle' ? 4 : 0.6,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />

        {/* Main shape with morphing path */}
        <motion.path
          d={path}
          fill={`url(#${gradientId})`}
          animate={{ d: path }}
          transition={{
            duration: 0.5,
            ease: 'easeInOut',
          }}
        />

        {/* Inner highlight */}
        <motion.ellipse
          cx="40"
          cy="40"
          rx="20"
          ry="15"
          fill={`url(#${gradientId}-inner)`}
          animate={{
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />

        {/* Eye/core indicator - shows awareness */}
        {(state === 'listening' || state === 'curious') && (
          <motion.circle
            cx="50"
            cy="45"
            r="4"
            fill="rgba(255,255,255,0.8)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Particles for celebrating state */}
        {state === 'celebrating' && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.circle
                key={i}
                cx="50"
                cy="50"
                r="3"
                fill={i % 2 === 0 ? '#f59e0b' : '#ec4899'}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI) / 3) * 40,
                  y: Math.sin((i * Math.PI) / 3) * 40,
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
            ))}
          </>
        )}
      </svg>
    </motion.div>
  )
}

export default CompanionAvatar
