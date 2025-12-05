/**
 * Coloring Book Store
 *
 * Manages state for the art canvas, tools, and colors
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ToolType, ToolSettings, ColorPalette } from '../types'
import { DEFAULT_TOOL_SETTINGS, COLOR_PALETTES } from '../types'

interface ColoringBookState {
  // Tool state
  currentTool: ToolType
  toolSettings: ToolSettings
  recentColors: string[]
  currentPalette: ColorPalette

  // Canvas state
  canvasSize: { width: number; height: number }
  zoom: number
  pan: { x: number; y: number }
  showGrid: boolean

  // History
  canUndo: boolean
  canRedo: boolean

  // Actions
  setTool: (tool: ToolType) => void
  setToolSettings: (settings: Partial<ToolSettings>) => void
  setColor: (color: string) => void
  addRecentColor: (color: string) => void
  setPalette: (palette: ColorPalette) => void
  setCanvasSize: (width: number, height: number) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  toggleGrid: () => void
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void
  resetView: () => void
}

export const useColoringBookStore = create<ColoringBookState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Actions
      setTool: (tool) => {
        set((state) => ({
          currentTool: tool,
          toolSettings: { ...state.toolSettings, tool },
        }))
      },

      setToolSettings: (settings) => {
        set((state) => ({
          toolSettings: { ...state.toolSettings, ...settings },
        }))
      },

      setColor: (color) => {
        set((state) => ({
          toolSettings: { ...state.toolSettings, color },
        }))
        get().addRecentColor(color)
      },

      addRecentColor: (color) => {
        set((state) => {
          const recent = [color, ...state.recentColors.filter((c) => c !== color)]
          return { recentColors: recent.slice(0, 16) }
        })
      },

      setPalette: (palette) => {
        set({ currentPalette: palette })
      },

      setCanvasSize: (width, height) => {
        set({ canvasSize: { width, height } })
      },

      setZoom: (zoom) => {
        set({ zoom: Math.max(0.1, Math.min(5, zoom)) })
      },

      setPan: (x, y) => {
        set({ pan: { x, y } })
      },

      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }))
      },

      setHistoryState: (canUndo, canRedo) => {
        set({ canUndo, canRedo })
      },

      resetView: () => {
        set({ zoom: 1, pan: { x: 0, y: 0 } })
      },
    }),
    {
      name: 'coloring-book-settings',
      partialize: (state) => ({
        recentColors: state.recentColors,
        currentPalette: state.currentPalette,
        toolSettings: state.toolSettings,
        showGrid: state.showGrid,
      }),
    }
  )
)
