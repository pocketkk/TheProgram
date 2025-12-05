/**
 * Coloring Book Store Tests
 *
 * Tests for the Zustand store managing canvas state and tools
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useColoringBookStore } from '../stores/useColoringBookStore'
import { DEFAULT_TOOL_SETTINGS, COLOR_PALETTES } from '../types'

describe('useColoringBookStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useColoringBookStore.setState({
      currentTool: 'brush',
      toolSettings: { ...DEFAULT_TOOL_SETTINGS },
      recentColors: ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'],
      currentPalette: COLOR_PALETTES[0],
      canvasSize: { width: 1024, height: 1024 },
      zoom: 1,
      pan: { x: 0, y: 0 },
      showGrid: false,
      canUndo: false,
      canRedo: false,
    })
  })

  describe('Tool Selection', () => {
    it('should initialize with brush tool', () => {
      const { currentTool } = useColoringBookStore.getState()
      expect(currentTool).toBe('brush')
    })

    it('should update tool when setTool is called', () => {
      const { setTool } = useColoringBookStore.getState()

      setTool('pencil')

      const { currentTool, toolSettings } = useColoringBookStore.getState()
      expect(currentTool).toBe('pencil')
      expect(toolSettings.tool).toBe('pencil')
    })

    it('should allow all tool types', () => {
      const { setTool } = useColoringBookStore.getState()
      const tools = ['brush', 'pencil', 'pen', 'marker', 'airbrush', 'charcoal', 'watercolor', 'crayon', 'eraser', 'fill', 'eyedropper']

      tools.forEach((tool) => {
        setTool(tool as any)
        const { currentTool } = useColoringBookStore.getState()
        expect(currentTool).toBe(tool)
      })
    })
  })

  describe('Tool Settings', () => {
    it('should initialize with default settings', () => {
      const { toolSettings } = useColoringBookStore.getState()

      expect(toolSettings.size).toBe(DEFAULT_TOOL_SETTINGS.size)
      expect(toolSettings.opacity).toBe(DEFAULT_TOOL_SETTINGS.opacity)
      expect(toolSettings.hardness).toBe(DEFAULT_TOOL_SETTINGS.hardness)
    })

    it('should update individual settings', () => {
      const { setToolSettings } = useColoringBookStore.getState()

      setToolSettings({ size: 50 })

      const { toolSettings } = useColoringBookStore.getState()
      expect(toolSettings.size).toBe(50)
      // Other settings should remain unchanged
      expect(toolSettings.opacity).toBe(DEFAULT_TOOL_SETTINGS.opacity)
    })

    it('should update multiple settings at once', () => {
      const { setToolSettings } = useColoringBookStore.getState()

      setToolSettings({ size: 25, opacity: 75, hardness: 50 })

      const { toolSettings } = useColoringBookStore.getState()
      expect(toolSettings.size).toBe(25)
      expect(toolSettings.opacity).toBe(75)
      expect(toolSettings.hardness).toBe(50)
    })
  })

  describe('Color Management', () => {
    it('should set color and update tool settings', () => {
      const { setColor } = useColoringBookStore.getState()

      setColor('#FF5500')

      const { toolSettings } = useColoringBookStore.getState()
      expect(toolSettings.color).toBe('#FF5500')
    })

    it('should add color to recent colors', () => {
      const { setColor } = useColoringBookStore.getState()

      setColor('#AABBCC')

      const { recentColors } = useColoringBookStore.getState()
      expect(recentColors[0]).toBe('#AABBCC')
    })

    it('should not duplicate recent colors', () => {
      const { setColor } = useColoringBookStore.getState()

      setColor('#FF0000')
      setColor('#00FF00')
      setColor('#FF0000') // Set same color again

      const { recentColors } = useColoringBookStore.getState()
      // #FF0000 should only appear once and be at the beginning
      expect(recentColors.filter((c) => c === '#FF0000').length).toBe(1)
      expect(recentColors[0]).toBe('#FF0000')
    })

    it('should limit recent colors to 16', () => {
      const { addRecentColor } = useColoringBookStore.getState()

      // Add 20 colors
      for (let i = 0; i < 20; i++) {
        addRecentColor(`#${i.toString().padStart(6, '0')}`)
      }

      const { recentColors } = useColoringBookStore.getState()
      expect(recentColors.length).toBeLessThanOrEqual(16)
    })
  })

  describe('Palette Management', () => {
    it('should initialize with first palette', () => {
      const { currentPalette } = useColoringBookStore.getState()
      expect(currentPalette.id).toBe(COLOR_PALETTES[0].id)
    })

    it('should change palette', () => {
      const { setPalette } = useColoringBookStore.getState()
      const newPalette = COLOR_PALETTES[1]

      setPalette(newPalette)

      const { currentPalette } = useColoringBookStore.getState()
      expect(currentPalette.id).toBe(newPalette.id)
    })
  })

  describe('Canvas View', () => {
    it('should initialize with zoom 1', () => {
      const { zoom } = useColoringBookStore.getState()
      expect(zoom).toBe(1)
    })

    it('should update zoom within limits', () => {
      const { setZoom } = useColoringBookStore.getState()

      setZoom(2)
      expect(useColoringBookStore.getState().zoom).toBe(2)

      setZoom(0.5)
      expect(useColoringBookStore.getState().zoom).toBe(0.5)
    })

    it('should clamp zoom to minimum 0.1', () => {
      const { setZoom } = useColoringBookStore.getState()

      setZoom(0.01)

      const { zoom } = useColoringBookStore.getState()
      expect(zoom).toBe(0.1)
    })

    it('should clamp zoom to maximum 5', () => {
      const { setZoom } = useColoringBookStore.getState()

      setZoom(10)

      const { zoom } = useColoringBookStore.getState()
      expect(zoom).toBe(5)
    })

    it('should update pan position', () => {
      const { setPan } = useColoringBookStore.getState()

      setPan(100, -50)

      const { pan } = useColoringBookStore.getState()
      expect(pan.x).toBe(100)
      expect(pan.y).toBe(-50)
    })

    it('should toggle grid', () => {
      const { toggleGrid } = useColoringBookStore.getState()

      expect(useColoringBookStore.getState().showGrid).toBe(false)

      toggleGrid()
      expect(useColoringBookStore.getState().showGrid).toBe(true)

      toggleGrid()
      expect(useColoringBookStore.getState().showGrid).toBe(false)
    })

    it('should reset view', () => {
      const { setZoom, setPan, resetView } = useColoringBookStore.getState()

      setZoom(2.5)
      setPan(100, 200)

      resetView()

      const { zoom, pan } = useColoringBookStore.getState()
      expect(zoom).toBe(1)
      expect(pan.x).toBe(0)
      expect(pan.y).toBe(0)
    })
  })

  describe('History State', () => {
    it('should initialize with history disabled', () => {
      const { canUndo, canRedo } = useColoringBookStore.getState()
      expect(canUndo).toBe(false)
      expect(canRedo).toBe(false)
    })

    it('should update history state', () => {
      const { setHistoryState } = useColoringBookStore.getState()

      setHistoryState(true, false)

      const { canUndo, canRedo } = useColoringBookStore.getState()
      expect(canUndo).toBe(true)
      expect(canRedo).toBe(false)
    })
  })

  describe('Canvas Size', () => {
    it('should initialize with default canvas size', () => {
      const { canvasSize } = useColoringBookStore.getState()
      expect(canvasSize.width).toBe(1024)
      expect(canvasSize.height).toBe(1024)
    })

    it('should update canvas size', () => {
      const { setCanvasSize } = useColoringBookStore.getState()

      setCanvasSize(800, 600)

      const { canvasSize } = useColoringBookStore.getState()
      expect(canvasSize.width).toBe(800)
      expect(canvasSize.height).toBe(600)
    })
  })
})
