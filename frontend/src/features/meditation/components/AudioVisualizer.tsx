/**
 * Audio Visualizer Component
 *
 * Canvas-based audio visualization with multiple visualization types
 */
import { useRef, useEffect, useCallback } from 'react'
import type { VisualizationType } from '../types'

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null
  type: VisualizationType
  isPlaying: boolean
  intensity?: number
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
  }
  className?: string
}

const DEFAULT_COLORS = {
  primary: '#8b5cf6',    // Purple
  secondary: '#6366f1',  // Indigo
  accent: '#fbbf24',     // Amber
  background: '#0f0f23', // Dark
}

export function AudioVisualizer({
  audioElement,
  type,
  isPlaying,
  intensity = 0.5,
  colors = DEFAULT_COLORS,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  // Particle system for particle visualization
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    color: string
    life: number
  }>>([])

  // Mandala state
  const mandalaAngleRef = useRef(0)

  // Cosmos state
  const starsRef = useRef<Array<{
    x: number
    y: number
    z: number
    radius: number
    color: string
  }>>([])

  // Initialize audio analyzer
  useEffect(() => {
    if (!audioElement) return

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current

      // Create analyzer
      const analyzer = ctx.createAnalyser()
      analyzer.fftSize = 256
      analyzer.smoothingTimeConstant = 0.8

      // Connect audio element to analyzer
      const source = ctx.createMediaElementSource(audioElement)
      source.connect(analyzer)
      analyzer.connect(ctx.destination)

      analyzerRef.current = analyzer
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount)
    } catch (error) {
      console.warn('Could not create audio analyzer:', error)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioElement])

  // Initialize particles for particle visualization
  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: 100 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: Math.random() * 3 + 1,
      color: [colors.primary, colors.secondary, colors.accent][Math.floor(Math.random() * 3)] || DEFAULT_COLORS.primary,
      life: Math.random(),
    }))
  }, [colors])

  // Initialize stars for cosmos visualization
  const initStars = useCallback((width: number, height: number) => {
    starsRef.current = Array.from({ length: 200 }, () => ({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      z: Math.random() * 1000,
      radius: Math.random() * 2 + 0.5,
      color: [colors.primary, colors.secondary, colors.accent, '#ffffff'][Math.floor(Math.random() * 4)] || '#ffffff',
    }))
  }, [colors])

  // Get audio frequency data
  const getFrequencyData = useCallback((): number[] => {
    if (analyzerRef.current && dataArrayRef.current) {
      analyzerRef.current.getByteFrequencyData(dataArrayRef.current)
      return Array.from(dataArrayRef.current)
    }
    // Return simulated data if no audio
    return Array.from({ length: 128 }, () =>
      Math.sin(Date.now() * 0.001 * (Math.random() + 0.5)) * 128 * intensity + 64
    )
  }, [intensity])

  // Draw waveform visualization
  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, data: number[]) => {
    const centerY = height / 2
    const barWidth = width / data.length
    const maxHeight = height * 0.4 * intensity

    // Draw gradient background glow
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, colors.primary || DEFAULT_COLORS.primary)
    gradient.addColorStop(0.5, colors.secondary || DEFAULT_COLORS.secondary)
    gradient.addColorStop(1, colors.accent || DEFAULT_COLORS.accent)

    ctx.strokeStyle = gradient
    ctx.lineWidth = 2

    // Draw smooth waveform
    ctx.beginPath()
    data.forEach((value, i) => {
      const x = i * barWidth
      const normalizedValue = value / 255
      const y = centerY + (normalizedValue - 0.5) * maxHeight * 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw mirror
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    data.forEach((value, i) => {
      const x = i * barWidth
      const normalizedValue = value / 255
      const y = centerY - (normalizedValue - 0.5) * maxHeight * 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()
    ctx.globalAlpha = 1
  }, [colors, intensity])

  // Draw particles visualization
  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, data: number[]) => {
    const avgFrequency = data.reduce((a, b) => a + b, 0) / data.length / 255

    particlesRef.current.forEach((particle) => {
      // Update position with audio-reactive velocity
      particle.x += particle.vx * (1 + avgFrequency * 2 * intensity)
      particle.y += particle.vy * (1 + avgFrequency * 2 * intensity)

      // Wrap around edges
      if (particle.x < 0) particle.x = width
      if (particle.x > width) particle.x = 0
      if (particle.y < 0) particle.y = height
      if (particle.y > height) particle.y = 0

      // Draw particle with glow
      const radius = particle.radius * (1 + avgFrequency * intensity)

      ctx.beginPath()
      ctx.arc(particle.x, particle.y, radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = particle.color + '22'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = particle.color
      ctx.fill()
    })

    // Draw connections between nearby particles
    ctx.strokeStyle = (colors.primary || DEFAULT_COLORS.primary) + '33'
    ctx.lineWidth = 0.5
    particlesRef.current.forEach((p1, i) => {
      particlesRef.current.slice(i + 1).forEach((p2) => {
        const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y)
        if (distance < 100) {
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      })
    })
  }, [colors, intensity])

  // Draw mandala visualization
  const drawMandala = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, data: number[]) => {
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.4

    mandalaAngleRef.current += 0.002

    // Draw multiple layers of the mandala
    const layers = 6
    const segments = 12

    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = maxRadius * ((layer + 1) / layers)
      const dataSlice = data.slice(layer * 20, (layer + 1) * 20)
      const avgValue = dataSlice.reduce((a, b) => a + b, 0) / dataSlice.length / 255

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(mandalaAngleRef.current * (layer % 2 === 0 ? 1 : -1))

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const pulseRadius = layerRadius * (1 + avgValue * 0.3 * intensity)

        ctx.save()
        ctx.rotate(angle)

        // Draw petal
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseRadius)
        gradient.addColorStop(0, (colors.primary || DEFAULT_COLORS.primary) + '00')
        gradient.addColorStop(0.5, (colors.secondary || DEFAULT_COLORS.secondary) + '66')
        gradient.addColorStop(1, (colors.accent || DEFAULT_COLORS.accent) + '00')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.ellipse(0, pulseRadius * 0.5, pulseRadius * 0.2, pulseRadius * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      ctx.restore()
    }

    // Draw center
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50)
    centerGradient.addColorStop(0, colors.accent || DEFAULT_COLORS.accent)
    centerGradient.addColorStop(1, (colors.accent || DEFAULT_COLORS.accent) + '00')
    ctx.fillStyle = centerGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2)
    ctx.fill()
  }, [colors, intensity])

  // Draw cosmos visualization
  const drawCosmos = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, data: number[]) => {
    const centerX = width / 2
    const centerY = height / 2
    const avgFrequency = data.reduce((a, b) => a + b, 0) / data.length / 255

    // Update and draw stars
    starsRef.current.forEach((star) => {
      // Move stars towards viewer
      star.z -= 2 + avgFrequency * 10 * intensity

      // Reset if too close
      if (star.z <= 0) {
        star.z = 1000
        star.x = (Math.random() - 0.5) * width * 2
        star.y = (Math.random() - 0.5) * height * 2
      }

      // Project to 2D
      const scale = 500 / star.z
      const screenX = centerX + star.x * scale
      const screenY = centerY + star.y * scale
      const screenRadius = star.radius * scale * (1 + avgFrequency * 0.5)

      // Only draw if on screen
      if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) {
        // Draw star with trail
        const trailLength = Math.min(20, 1000 - star.z) * scale * 0.1

        if (trailLength > 1) {
          const gradient = ctx.createLinearGradient(
            screenX, screenY,
            screenX - (star.x * scale * 0.01), screenY - (star.y * scale * 0.01)
          )
          gradient.addColorStop(0, star.color)
          gradient.addColorStop(1, star.color + '00')

          ctx.strokeStyle = gradient
          ctx.lineWidth = screenRadius
          ctx.beginPath()
          ctx.moveTo(screenX, screenY)
          ctx.lineTo(
            screenX - (star.x * scale * 0.02 * trailLength),
            screenY - (star.y * scale * 0.02 * trailLength)
          )
          ctx.stroke()
        }

        // Draw star glow
        ctx.beginPath()
        ctx.arc(screenX, screenY, screenRadius * 2, 0, Math.PI * 2)
        ctx.fillStyle = star.color + '33'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2)
        ctx.fillStyle = star.color
        ctx.fill()
      }
    })
  }, [intensity])

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

      // Reinitialize visualizations that need size
      if (type === 'particles') initParticles(rect.width, rect.height)
      if (type === 'cosmos') initStars(rect.width, rect.height)
    }
    updateSize()
    window.addEventListener('resize', updateSize)

    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      const { width, height } = rect

      // Clear canvas with fade effect
      ctx.fillStyle = (colors.background || DEFAULT_COLORS.background) + 'ee'
      ctx.fillRect(0, 0, width, height)

      // Get frequency data
      const data = getFrequencyData()

      // Draw based on type
      switch (type) {
        case 'waveform':
          drawWaveform(ctx, width, height, data)
          break
        case 'particles':
          drawParticles(ctx, width, height, data)
          break
        case 'mandala':
          drawMandala(ctx, width, height, data)
          break
        case 'cosmos':
          drawCosmos(ctx, width, height, data)
          break
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Start animation when playing
    if (isPlaying || type === 'mandala' || type === 'cosmos') {
      animate()
    } else {
      // Draw static state
      const rect = canvas.getBoundingClientRect()
      ctx.fillStyle = colors.background || DEFAULT_COLORS.background
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    return () => {
      window.removeEventListener('resize', updateSize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [
    type,
    isPlaying,
    colors,
    getFrequencyData,
    drawWaveform,
    drawParticles,
    drawMandala,
    drawCosmos,
    initParticles,
    initStars,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ backgroundColor: colors.background || DEFAULT_COLORS.background }}
    />
  )
}
