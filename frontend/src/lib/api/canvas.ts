/**
 * Canvas API client
 *
 * Part of Phase 2: Canvas Exploration
 */
import { apiClient, getErrorMessage } from './client'

// Types
export interface CanvasBoard {
  id: string
  birth_data_id: string | null
  chart_id: string | null
  name: string
  description: string | null
  background_type: 'grid' | 'dots' | 'blank' | 'cosmic' | 'paper' | 'dark'
  zoom_level: number
  pan_x: number
  pan_y: number
  canvas_settings: Record<string, unknown> | null
  ai_analysis: string | null
  item_count: number
  created_at: string
  updated_at: string
}

export interface CanvasItem {
  id: string
  board_id: string
  item_type: 'planet' | 'aspect' | 'pattern' | 'note' | 'insight' | 'house' | 'image' | 'connector' | 'text' | 'shape'
  item_data: Record<string, unknown>
  position_x: number
  position_y: number
  width: number | null
  height: number | null
  rotation: number
  z_index: number
  style: Record<string, unknown> | null
  connections: string[] | null
  position: [number, number]
  size: [number | null, number | null]
  created_at: string
  updated_at: string
}

export interface CanvasBoardWithItems extends CanvasBoard {
  items: CanvasItem[]
}

export interface CanvasBoardCreate {
  name: string
  description?: string
  birth_data_id?: string
  chart_id?: string
  background_type?: 'grid' | 'dots' | 'blank' | 'cosmic' | 'paper' | 'dark'
  zoom_level?: number
  pan_x?: number
  pan_y?: number
  canvas_settings?: Record<string, unknown>
}

export interface CanvasBoardUpdate {
  name?: string
  description?: string
  background_type?: 'grid' | 'dots' | 'blank' | 'cosmic' | 'paper' | 'dark'
  zoom_level?: number
  pan_x?: number
  pan_y?: number
  canvas_settings?: Record<string, unknown>
  birth_data_id?: string
  chart_id?: string
}

export interface CanvasItemCreate {
  board_id: string
  item_type: CanvasItem['item_type']
  item_data: Record<string, unknown>
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  rotation?: number
  z_index?: number
  style?: Record<string, unknown>
  connections?: string[]
}

export interface CanvasItemUpdate {
  item_data?: Record<string, unknown>
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  rotation?: number
  z_index?: number
  style?: Record<string, unknown>
  connections?: string[]
}

export interface CanvasItemBatchUpdate {
  updates: Array<{ id: string } & CanvasItemUpdate>
}

export interface AddChartElementsRequest {
  board_id: string
  chart_id: string
  elements: ('planets' | 'aspects' | 'houses' | 'patterns')[]
  layout?: 'circular' | 'grid' | 'free'
  center_x?: number
  center_y?: number
  radius?: number
}

export interface ArrangeItemsRequest {
  board_id: string
  item_ids?: string[]
  arrangement: 'circular' | 'grid' | 'force' | 'hierarchical'
  center_x?: number
  center_y?: number
  spacing?: number
}

export interface CanvasBoardListParams {
  birth_data_id?: string
  chart_id?: string
  limit?: number
  offset?: number
}

// API Functions - Canvas Boards

/**
 * Create a new canvas board
 */
export async function createCanvasBoard(data: CanvasBoardCreate): Promise<CanvasBoard> {
  try {
    const response = await apiClient.post<CanvasBoard>('/canvas/boards', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * List canvas boards with optional filters
 */
export async function listCanvasBoards(params?: CanvasBoardListParams): Promise<CanvasBoard[]> {
  try {
    const response = await apiClient.get<CanvasBoard[]>('/canvas/boards', { params })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific canvas board by ID with items
 */
export async function getCanvasBoard(boardId: string): Promise<CanvasBoardWithItems> {
  try {
    const response = await apiClient.get<CanvasBoardWithItems>(`/canvas/boards/${boardId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a canvas board
 */
export async function updateCanvasBoard(boardId: string, data: CanvasBoardUpdate): Promise<CanvasBoard> {
  try {
    const response = await apiClient.put<CanvasBoard>(`/canvas/boards/${boardId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a canvas board
 */
export async function deleteCanvasBoard(boardId: string): Promise<void> {
  try {
    await apiClient.delete(`/canvas/boards/${boardId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// API Functions - Canvas Items

/**
 * Create a new canvas item
 */
export async function createCanvasItem(data: CanvasItemCreate): Promise<CanvasItem> {
  try {
    const response = await apiClient.post<CanvasItem>('/canvas/items', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get a specific canvas item by ID
 */
export async function getCanvasItem(itemId: string): Promise<CanvasItem> {
  try {
    const response = await apiClient.get<CanvasItem>(`/canvas/items/${itemId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Update a canvas item
 */
export async function updateCanvasItem(itemId: string, data: CanvasItemUpdate): Promise<CanvasItem> {
  try {
    const response = await apiClient.put<CanvasItem>(`/canvas/items/${itemId}`, data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Delete a canvas item
 */
export async function deleteCanvasItem(itemId: string): Promise<void> {
  try {
    await apiClient.delete(`/canvas/items/${itemId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Batch update multiple canvas items
 */
export async function batchUpdateCanvasItems(data: CanvasItemBatchUpdate): Promise<{ updated_count: number; items: CanvasItem[] }> {
  try {
    const response = await apiClient.post<{ updated_count: number; items: CanvasItem[] }>('/canvas/items/batch', data)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

// API Functions - Chart Element Operations

/**
 * Add chart elements to canvas
 */
export async function addChartElements(boardId: string, request: Omit<AddChartElementsRequest, 'board_id'>): Promise<{ items_created: number; items: CanvasItem[] }> {
  try {
    const response = await apiClient.post<{ items_created: number; items: CanvasItem[] }>(
      `/canvas/boards/${boardId}/add-chart-elements`,
      { board_id: boardId, ...request }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Auto-arrange canvas items
 */
export async function arrangeItems(boardId: string, request: Omit<ArrangeItemsRequest, 'board_id'>): Promise<{ items_arranged: number; items: CanvasItem[] }> {
  try {
    const response = await apiClient.post<{ items_arranged: number; items: CanvasItem[] }>(
      `/canvas/boards/${boardId}/arrange`,
      { board_id: boardId, ...request }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get valid item types
 */
export async function getItemTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/canvas/item-types')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get valid background types
 */
export async function getBackgroundTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/canvas/background-types')
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
