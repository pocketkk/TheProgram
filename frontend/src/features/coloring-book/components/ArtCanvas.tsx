/**
 * Art Canvas Component
 *
 * A fully-featured drawing canvas with pressure sensitivity,
 * various brush types, and smooth rendering.
 */
import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useColoringBookStore } from '../stores/useColoringBookStore'
import type { ToolType } from '../types'

interface Point {
  x: number
  y: number
  pressure: number
  time: number
}

interface ArtCanvasProps {
  width?: number
  height?: number
  backgroundImage?: string
  className?: string
  onSave?: (dataUrl: string) => void
}

export interface ArtCanvasRef {
  clear: () => void
  undo: () => void
  redo: () => void
  getImageData: () => string
  loadImage: (dataUrl: string) => void
  fillArea: (x: number, y: number, color: string) => void
}

// Brush rendering helpers
function getToolBrush(tool: ToolType, size: number, hardness: number) {
  const radius = size / 2
  const softness = (100 - hardness) / 100

  return { radius, softness }
}

function hexToRgba(hex: string, alpha: number = 1): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
      alpha,
    ]
  }
  return [0, 0, 0, alpha]
}

function createBrushGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  hardness: number
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  const [r, g, b] = hexToRgba(color)
  const softness = (100 - hardness) / 100

  if (softness > 0) {
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`)
    gradient.addColorStop(1 - softness, `rgba(${r},${g},${b},1)`)
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
  } else {
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`)
    gradient.addColorStop(1, `rgba(${r},${g},${b},1)`)
  }

  return gradient
}

export const ArtCanvas = forwardRef<ArtCanvasRef, ArtCanvasProps>(
  ({ width = 1024, height = 1024, backgroundImage, className, onSave }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const overlayRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [isDrawing, setIsDrawing] = useState(false)
    const [lastPoint, setLastPoint] = useState<Point | null>(null)
    const [history, setHistory] = useState<ImageData[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [points, setPoints] = useState<Point[]>([])

    const {
      toolSettings,
      zoom,
      pan,
      showGrid,
      setHistoryState,
    } = useColoringBookStore()

    // Initialize canvas
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      // Fill with white background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)

      // Save initial state
      const imageData = ctx.getImageData(0, 0, width, height)
      setHistory([imageData])
      setHistoryIndex(0)
    }, [width, height])

    // Load background image
    useEffect(() => {
      if (!backgroundImage || !canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)

        // Center the image
        const scale = Math.min(width / img.width, height / img.height)
        const x = (width - img.width * scale) / 2
        const y = (height - img.height * scale) / 2

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

        // Save to history
        const imageData = ctx.getImageData(0, 0, width, height)
        setHistory([imageData])
        setHistoryIndex(0)
      }
      img.src = backgroundImage
    }, [backgroundImage, width, height])

    // Draw grid overlay
    useEffect(() => {
      const overlay = overlayRef.current
      if (!overlay) return

      const ctx = overlay.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, width, height)

      if (showGrid) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)'
        ctx.lineWidth = 1

        const gridSize = 50
        for (let x = 0; x <= width; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
          ctx.stroke()
        }
        for (let y = 0; y <= height; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
      }
    }, [showGrid, width, height])

    // Update history state in store
    useEffect(() => {
      setHistoryState(historyIndex > 0, historyIndex < history.length - 1)
    }, [historyIndex, history.length, setHistoryState])

    // Get canvas coordinates from event
    const getCanvasPoint = useCallback(
      (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0, pressure: 0.5, time: Date.now() }

        const rect = canvas.getBoundingClientRect()
        const scaleX = width / rect.width
        const scaleY = height / rect.height

        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
          pressure: e.pressure || 0.5,
          time: Date.now(),
        }
      },
      [width, height]
    )

    // Draw a single point (dot)
    const drawPoint = useCallback(
      (ctx: CanvasRenderingContext2D, point: Point) => {
        const { color, size, opacity, hardness, tool } = toolSettings
        const pressure = toolSettings.pressure ? point.pressure : 1
        const actualSize = size * pressure

        ctx.save()
        ctx.globalAlpha = opacity / 100

        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (tool === 'airbrush') {
          // Airbrush: many small dots
          const numDots = Math.floor(actualSize * (toolSettings.flow / 100))
          for (let i = 0; i < numDots; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = Math.random() * actualSize / 2
            const dotX = point.x + Math.cos(angle) * dist
            const dotY = point.y + Math.sin(angle) * dist
            ctx.beginPath()
            ctx.arc(dotX, dotY, 1, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.globalAlpha = (opacity / 100) * 0.1
            ctx.fill()
          }
        } else if (tool === 'charcoal') {
          // Charcoal: textured, rough edges
          const numStrokes = 5
          for (let i = 0; i < numStrokes; i++) {
            const offsetX = (Math.random() - 0.5) * actualSize * 0.3
            const offsetY = (Math.random() - 0.5) * actualSize * 0.3
            ctx.beginPath()
            ctx.arc(point.x + offsetX, point.y + offsetY, actualSize / 2 * (0.5 + Math.random() * 0.5), 0, Math.PI * 2)
            const gradient = createBrushGradient(ctx, point.x + offsetX, point.y + offsetY, actualSize / 2, color, hardness * 0.6)
            ctx.fillStyle = gradient
            ctx.globalAlpha = (opacity / 100) * (0.3 + Math.random() * 0.4)
            ctx.fill()
          }
        } else if (tool === 'watercolor') {
          // Watercolor: soft, translucent
          const gradient = createBrushGradient(ctx, point.x, point.y, actualSize, color, 10)
          ctx.fillStyle = gradient
          ctx.globalAlpha = (opacity / 100) * 0.15
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize, 0, Math.PI * 2)
          ctx.fill()
        } else if (tool === 'crayon') {
          // Crayon: slightly rough, textured
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize / 2, 0, Math.PI * 2)
          const gradient = createBrushGradient(ctx, point.x, point.y, actualSize / 2, color, hardness * 0.8)
          ctx.fillStyle = gradient
          ctx.fill()

          // Add texture
          for (let i = 0; i < 3; i++) {
            const tx = point.x + (Math.random() - 0.5) * actualSize * 0.5
            const ty = point.y + (Math.random() - 0.5) * actualSize * 0.5
            ctx.beginPath()
            ctx.arc(tx, ty, 1, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.globalAlpha = (opacity / 100) * 0.3
            ctx.fill()
          }
        } else if (tool === 'pen') {
          // Pen: hard edges, consistent
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        } else if (tool === 'pencil') {
          // Pencil: slightly textured line
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.globalAlpha = (opacity / 100) * (0.7 + Math.random() * 0.3)
          ctx.fill()
        } else if (tool === 'marker') {
          // Marker: saturated, slightly transparent
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize / 2, 0, Math.PI * 2)
          const gradient = createBrushGradient(ctx, point.x, point.y, actualSize / 2, color, 70)
          ctx.fillStyle = gradient
          ctx.fill()
        } else {
          // Default brush
          const gradient = createBrushGradient(ctx, point.x, point.y, actualSize / 2, color, hardness)
          ctx.beginPath()
          ctx.arc(point.x, point.y, actualSize / 2, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        ctx.restore()
      },
      [toolSettings]
    )

    // Draw a line between two points
    const drawLine = useCallback(
      (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
        const dist = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
        const spacing = Math.max(1, toolSettings.size * (toolSettings.spacing / 100))
        const steps = Math.ceil(dist / spacing)

        for (let i = 0; i <= steps; i++) {
          const t = i / Math.max(1, steps)
          const point: Point = {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
            pressure: from.pressure + (to.pressure - from.pressure) * t,
            time: from.time + (to.time - from.time) * t,
          }
          drawPoint(ctx, point)
        }
      },
      [toolSettings, drawPoint]
    )

    // Save state to history
    const saveToHistory = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, width, height)

      // Remove any redo states
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(imageData)

      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift()
      }

      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }, [history, historyIndex, width, height])

    // Pointer event handlers
    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.setPointerCapture(e.pointerId)
        setIsDrawing(true)

        const point = getCanvasPoint(e)
        setLastPoint(point)
        setPoints([point])

        const ctx = canvas.getContext('2d')
        if (ctx) {
          if (toolSettings.tool === 'fill') {
            // Flood fill
            floodFill(ctx, Math.floor(point.x), Math.floor(point.y), toolSettings.color)
            saveToHistory()
          } else if (toolSettings.tool === 'eyedropper') {
            // Color picker
            const imageData = ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1)
            const [r, g, b] = imageData.data
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            useColoringBookStore.getState().setColor(hex)
          } else {
            drawPoint(ctx, point)
          }
        }
      },
      [getCanvasPoint, toolSettings, drawPoint, saveToHistory]
    )

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const point = getCanvasPoint(e)

        if (toolSettings.tool === 'eyedropper') {
          // Preview color under cursor
          return
        }

        if (toolSettings.tool !== 'fill' && lastPoint) {
          drawLine(ctx, lastPoint, point)
        }

        setLastPoint(point)
        setPoints((prev) => [...prev, point])
      },
      [isDrawing, lastPoint, getCanvasPoint, toolSettings, drawLine]
    )

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (canvas) {
          canvas.releasePointerCapture(e.pointerId)
        }

        setIsDrawing(false)
        setLastPoint(null)
        setPoints([])

        if (toolSettings.tool !== 'fill' && toolSettings.tool !== 'eyedropper') {
          saveToHistory()
        }
      },
      [isDrawing, toolSettings, saveToHistory]
    )

    // Flood fill algorithm
    const floodFill = useCallback(
      (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        const [fillR, fillG, fillB] = hexToRgba(fillColor)

        const startIdx = (startY * width + startX) * 4
        const startR = data[startIdx]
        const startG = data[startIdx + 1]
        const startB = data[startIdx + 2]

        // Don't fill if already same color
        if (startR === fillR && startG === fillG && startB === fillB) return

        const stack: [number, number][] = [[startX, startY]]
        const visited = new Set<string>()

        const tolerance = 32 // Color matching tolerance

        const matchesStart = (idx: number) => {
          return (
            Math.abs(data[idx] - startR) <= tolerance &&
            Math.abs(data[idx + 1] - startG) <= tolerance &&
            Math.abs(data[idx + 2] - startB) <= tolerance
          )
        }

        while (stack.length > 0) {
          const [x, y] = stack.pop()!
          const key = `${x},${y}`

          if (visited.has(key)) continue
          if (x < 0 || x >= width || y < 0 || y >= height) continue

          const idx = (y * width + x) * 4
          if (!matchesStart(idx)) continue

          visited.add(key)

          data[idx] = fillR
          data[idx + 1] = fillG
          data[idx + 2] = fillB
          data[idx + 3] = 255

          stack.push([x + 1, y])
          stack.push([x - 1, y])
          stack.push([x, y + 1])
          stack.push([x, y - 1])
        }

        ctx.putImageData(imageData, 0, 0)
      },
      [width, height]
    )

    // Imperative handle for parent component
    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          saveToHistory()
        },

        undo: () => {
          if (historyIndex <= 0) return
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const newIndex = historyIndex - 1
          ctx.putImageData(history[newIndex], 0, 0)
          setHistoryIndex(newIndex)
        },

        redo: () => {
          if (historyIndex >= history.length - 1) return
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const newIndex = historyIndex + 1
          ctx.putImageData(history[newIndex], 0, 0)
          setHistoryIndex(newIndex)
        },

        getImageData: () => {
          const canvas = canvasRef.current
          if (!canvas) return ''
          return canvas.toDataURL('image/png')
        },

        loadImage: (dataUrl: string) => {
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const img = new Image()
          img.onload = () => {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, width, height)
            ctx.drawImage(img, 0, 0)
            saveToHistory()
          }
          img.src = dataUrl
        },

        fillArea: (x: number, y: number, color: string) => {
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          floodFill(ctx, Math.floor(x), Math.floor(y), color)
          saveToHistory()
        },
      }),
      [width, height, history, historyIndex, saveToHistory, floodFill]
    )

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          if (e.shiftKey) {
            // Redo
            if (historyIndex < history.length - 1) {
              const canvas = canvasRef.current
              if (!canvas) return
              const ctx = canvas.getContext('2d')
              if (!ctx) return
              const newIndex = historyIndex + 1
              ctx.putImageData(history[newIndex], 0, 0)
              setHistoryIndex(newIndex)
            }
          } else {
            // Undo
            if (historyIndex > 0) {
              const canvas = canvasRef.current
              if (!canvas) return
              const ctx = canvas.getContext('2d')
              if (!ctx) return
              const newIndex = historyIndex - 1
              ctx.putImageData(history[newIndex], 0, 0)
              setHistoryIndex(newIndex)
            }
          }
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [history, historyIndex])

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-gray-100 ${className}`}
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="bg-white shadow-lg cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
        <canvas
          ref={overlayRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 pointer-events-none"
        />
      </div>
    )
  }
)

ArtCanvas.displayName = 'ArtCanvas'
