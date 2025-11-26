/**
 * Canvas Store
 *
 * State management for canvas boards and items using Zustand.
 * Part of Phase 2: Canvas Exploration
 */
import { create } from 'zustand'
import * as canvasApi from '@/lib/api/canvas'
import type {
  CanvasBoard,
  CanvasBoardWithItems,
  CanvasBoardCreate,
  CanvasBoardUpdate,
  CanvasItem,
  CanvasItemCreate,
  CanvasItemUpdate
} from '@/lib/api/canvas'

interface CanvasState {
  // State
  boards: CanvasBoard[]
  currentBoard: CanvasBoardWithItems | null
  selectedItems: string[]
  isLoading: boolean
  error: string | null

  // View settings
  zoomLevel: number
  panX: number
  panY: number
  isDragging: boolean

  // Board actions
  fetchBoards: (params?: canvasApi.CanvasBoardListParams) => Promise<void>
  fetchBoard: (boardId: string) => Promise<void>
  createBoard: (data: CanvasBoardCreate) => Promise<CanvasBoard>
  updateBoard: (boardId: string, data: CanvasBoardUpdate) => Promise<CanvasBoard>
  deleteBoard: (boardId: string) => Promise<void>

  // Item actions
  addItem: (data: CanvasItemCreate) => Promise<CanvasItem>
  updateItem: (itemId: string, data: CanvasItemUpdate) => Promise<CanvasItem>
  deleteItem: (itemId: string) => Promise<void>
  batchUpdateItems: (updates: Array<{ id: string } & CanvasItemUpdate>) => Promise<void>

  // Chart element actions
  addChartElements: (chartId: string, elements: ('planets' | 'aspects' | 'houses' | 'patterns')[]) => Promise<void>
  arrangeItems: (arrangement: 'circular' | 'grid' | 'force' | 'hierarchical') => Promise<void>

  // Selection actions
  selectItem: (itemId: string) => void
  deselectItem: (itemId: string) => void
  toggleItemSelection: (itemId: string) => void
  selectAll: () => void
  clearSelection: () => void

  // View actions
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setDragging: (dragging: boolean) => void
  resetView: () => void

  // Local item updates (optimistic)
  moveItem: (itemId: string, x: number, y: number) => void
  resizeItem: (itemId: string, width: number, height: number) => void
  rotateItem: (itemId: string, rotation: number) => void

  // UI actions
  clearCurrentBoard: () => void
  clearError: () => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  boards: [],
  currentBoard: null,
  selectedItems: [],
  isLoading: false,
  error: null,

  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isDragging: false,

  // Fetch boards
  fetchBoards: async (params) => {
    set({ isLoading: true, error: null })
    try {
      const boards = await canvasApi.listCanvasBoards(params)
      set({ boards, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch boards', isLoading: false })
    }
  },

  // Fetch single board with items
  fetchBoard: async (boardId) => {
    set({ isLoading: true, error: null })
    try {
      const board = await canvasApi.getCanvasBoard(boardId)
      set({
        currentBoard: board,
        zoomLevel: board.zoom_level,
        panX: board.pan_x,
        panY: board.pan_y,
        isLoading: false
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch board', isLoading: false })
    }
  },

  // Create board
  createBoard: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const board = await canvasApi.createCanvasBoard(data)
      set(state => ({
        boards: [board, ...state.boards],
        isLoading: false,
      }))
      return board
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create board', isLoading: false })
      throw error
    }
  },

  // Update board
  updateBoard: async (boardId, data) => {
    set({ isLoading: true, error: null })
    try {
      const board = await canvasApi.updateCanvasBoard(boardId, data)
      set(state => ({
        boards: state.boards.map(b => b.id === boardId ? board : b),
        currentBoard: state.currentBoard?.id === boardId
          ? { ...state.currentBoard, ...board }
          : state.currentBoard,
        isLoading: false,
      }))
      return board
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update board', isLoading: false })
      throw error
    }
  },

  // Delete board
  deleteBoard: async (boardId) => {
    set({ isLoading: true, error: null })
    try {
      await canvasApi.deleteCanvasBoard(boardId)
      set(state => ({
        boards: state.boards.filter(b => b.id !== boardId),
        currentBoard: state.currentBoard?.id === boardId ? null : state.currentBoard,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete board', isLoading: false })
      throw error
    }
  },

  // Add item
  addItem: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const item = await canvasApi.createCanvasItem(data)
      set(state => ({
        currentBoard: state.currentBoard ? {
          ...state.currentBoard,
          items: [...state.currentBoard.items, item],
          item_count: state.currentBoard.item_count + 1,
        } : null,
        isLoading: false,
      }))
      return item
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add item', isLoading: false })
      throw error
    }
  },

  // Update item
  updateItem: async (itemId, data) => {
    set({ isLoading: true, error: null })
    try {
      const item = await canvasApi.updateCanvasItem(itemId, data)
      set(state => ({
        currentBoard: state.currentBoard ? {
          ...state.currentBoard,
          items: state.currentBoard.items.map(i => i.id === itemId ? item : i),
        } : null,
        isLoading: false,
      }))
      return item
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update item', isLoading: false })
      throw error
    }
  },

  // Delete item
  deleteItem: async (itemId) => {
    set({ isLoading: true, error: null })
    try {
      await canvasApi.deleteCanvasItem(itemId)
      set(state => ({
        currentBoard: state.currentBoard ? {
          ...state.currentBoard,
          items: state.currentBoard.items.filter(i => i.id !== itemId),
          item_count: state.currentBoard.item_count - 1,
        } : null,
        selectedItems: state.selectedItems.filter(id => id !== itemId),
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete item', isLoading: false })
      throw error
    }
  },

  // Batch update items
  batchUpdateItems: async (updates) => {
    set({ isLoading: true, error: null })
    try {
      const result = await canvasApi.batchUpdateCanvasItems({ updates })
      set(state => ({
        currentBoard: state.currentBoard ? {
          ...state.currentBoard,
          items: state.currentBoard.items.map(item => {
            const updated = result.items.find(i => i.id === item.id)
            return updated || item
          }),
        } : null,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update items', isLoading: false })
      throw error
    }
  },

  // Add chart elements
  addChartElements: async (chartId, elements) => {
    const { currentBoard, panX, panY } = get()
    if (!currentBoard) return

    set({ isLoading: true, error: null })
    try {
      const result = await canvasApi.addChartElements(currentBoard.id, {
        chart_id: chartId,
        elements,
        layout: 'circular',
        center_x: -panX + 400,
        center_y: -panY + 300,
        radius: 200,
      })
      set(state => ({
        currentBoard: state.currentBoard ? {
          ...state.currentBoard,
          items: [...state.currentBoard.items, ...result.items],
          item_count: state.currentBoard.item_count + result.items_created,
        } : null,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add chart elements', isLoading: false })
      throw error
    }
  },

  // Arrange items
  arrangeItems: async (arrangement) => {
    const { currentBoard, selectedItems, panX, panY } = get()
    if (!currentBoard) return

    set({ isLoading: true, error: null })
    try {
      const result = await canvasApi.arrangeItems(currentBoard.id, {
        item_ids: selectedItems.length > 0 ? selectedItems : undefined,
        arrangement,
        center_x: -panX + 400,
        center_y: -panY + 300,
        spacing: 100,
      })
      set(state => ({
        currentBoard: state.currentBoard ? {
          ...state.currentBoard,
          items: state.currentBoard.items.map(item => {
            const updated = result.items.find(i => i.id === item.id)
            return updated || item
          }),
        } : null,
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to arrange items', isLoading: false })
      throw error
    }
  },

  // Selection actions
  selectItem: (itemId) => set(state => ({
    selectedItems: state.selectedItems.includes(itemId)
      ? state.selectedItems
      : [...state.selectedItems, itemId]
  })),

  deselectItem: (itemId) => set(state => ({
    selectedItems: state.selectedItems.filter(id => id !== itemId)
  })),

  toggleItemSelection: (itemId) => set(state => ({
    selectedItems: state.selectedItems.includes(itemId)
      ? state.selectedItems.filter(id => id !== itemId)
      : [...state.selectedItems, itemId]
  })),

  selectAll: () => set(state => ({
    selectedItems: state.currentBoard?.items.map(i => i.id) || []
  })),

  clearSelection: () => set({ selectedItems: [] }),

  // View actions
  setZoom: (zoom) => set({ zoomLevel: Math.max(0.1, Math.min(3, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setDragging: (dragging) => set({ isDragging: dragging }),
  resetView: () => set({ zoomLevel: 1, panX: 0, panY: 0 }),

  // Local item updates (optimistic)
  moveItem: (itemId, x, y) => set(state => ({
    currentBoard: state.currentBoard ? {
      ...state.currentBoard,
      items: state.currentBoard.items.map(item =>
        item.id === itemId ? { ...item, position_x: x, position_y: y, position: [x, y] as [number, number] } : item
      ),
    } : null,
  })),

  resizeItem: (itemId, width, height) => set(state => ({
    currentBoard: state.currentBoard ? {
      ...state.currentBoard,
      items: state.currentBoard.items.map(item =>
        item.id === itemId ? { ...item, width, height, size: [width, height] as [number, number] } : item
      ),
    } : null,
  })),

  rotateItem: (itemId, rotation) => set(state => ({
    currentBoard: state.currentBoard ? {
      ...state.currentBoard,
      items: state.currentBoard.items.map(item =>
        item.id === itemId ? { ...item, rotation } : item
      ),
    } : null,
  })),

  // UI actions
  clearCurrentBoard: () => set({ currentBoard: null, selectedItems: [] }),
  clearError: () => set({ error: null }),
}))
