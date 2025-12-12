/**
 * Palm Reading Hooks Tests
 *
 * Tests for TanStack Query hooks used in palm reading feature.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useAnalyzePalm,
  useQuickInsight,
  usePalmReadingHistory,
  usePalmReading,
  useUpdatePalmReading,
  useDeletePalmReading,
  palmReadingKeys,
} from '../usePalmReading'
import * as palmReadingApi from '@/lib/api/palmReading'

// Mock the API module
vi.mock('@/lib/api/palmReading', () => ({
  analyzePalm: vi.fn(),
  getQuickInsight: vi.fn(),
  listPalmReadings: vi.fn(),
  getPalmReading: vi.fn(),
  updatePalmReading: vi.fn(),
  deletePalmReading: vi.fn(),
}))

// Helper to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('Palm Reading Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('palmReadingKeys', () => {
    it('should generate correct query keys', () => {
      expect(palmReadingKeys.all).toEqual(['palm-readings'])
      expect(palmReadingKeys.lists()).toEqual(['palm-readings', 'list'])
      expect(palmReadingKeys.list({ limit: 10 })).toEqual(['palm-readings', 'list', { limit: 10 }])
      expect(palmReadingKeys.details()).toEqual(['palm-readings', 'detail'])
      expect(palmReadingKeys.detail('123')).toEqual(['palm-readings', 'detail', '123'])
    })
  })

  describe('useAnalyzePalm', () => {
    it('should call analyzePalm API on mutate', async () => {
      const mockResult = {
        success: true,
        full_reading: 'Your palm shows...',
        sections: { hand_shape: 'Earth hand' },
        hand_type: 'both',
        model_used: 'claude-sonnet-4',
        tokens_used: { input: 1000, output: 500 },
      }

      vi.mocked(palmReadingApi.analyzePalm).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useAnalyzePalm(), {
        wrapper: createWrapper(),
      })

      const mockFile = new File(['test'], 'palm.jpg', { type: 'image/jpeg' })

      result.current.mutate({
        image: mockFile,
        handType: 'both',
        saveReading: true,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.analyzePalm).toHaveBeenCalledWith({
        image: mockFile,
        handType: 'both',
        saveReading: true,
      })
      expect(result.current.data).toEqual(mockResult)
    })

    it('should handle analysis error', async () => {
      vi.mocked(palmReadingApi.analyzePalm).mockRejectedValue(new Error('Analysis failed'))

      const { result } = renderHook(() => useAnalyzePalm(), {
        wrapper: createWrapper(),
      })

      const mockFile = new File(['test'], 'palm.jpg', { type: 'image/jpeg' })

      result.current.mutate({
        image: mockFile,
        handType: 'both',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('useQuickInsight', () => {
    it('should call getQuickInsight API on mutate', async () => {
      const mockResult = {
        success: true,
        insight: 'Your palm shows strong creative energy.',
        model_used: 'claude-sonnet-4',
      }

      vi.mocked(palmReadingApi.getQuickInsight).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useQuickInsight(), {
        wrapper: createWrapper(),
      })

      const mockFile = new File(['test'], 'palm.jpg', { type: 'image/jpeg' })

      result.current.mutate(mockFile)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.getQuickInsight).toHaveBeenCalledWith(mockFile)
      expect(result.current.data).toEqual(mockResult)
    })
  })

  describe('usePalmReadingHistory', () => {
    it('should fetch reading history', async () => {
      const mockHistory = {
        readings: [
          {
            id: '1',
            hand_type: 'both',
            full_reading: 'Test reading',
            is_favorite: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      }

      vi.mocked(palmReadingApi.listPalmReadings).mockResolvedValue(mockHistory)

      const { result } = renderHook(() => usePalmReadingHistory({ limit: 20 }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.listPalmReadings).toHaveBeenCalledWith({ limit: 20 })
      expect(result.current.data).toEqual(mockHistory)
    })

    it('should pass favorites_only filter', async () => {
      vi.mocked(palmReadingApi.listPalmReadings).mockResolvedValue({
        readings: [],
        total: 0,
      })

      renderHook(() => usePalmReadingHistory({ favoritesOnly: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(palmReadingApi.listPalmReadings).toHaveBeenCalled()
      })

      expect(palmReadingApi.listPalmReadings).toHaveBeenCalledWith({
        favoritesOnly: true,
      })
    })
  })

  describe('usePalmReading', () => {
    it('should fetch a specific reading by ID', async () => {
      const mockReading = {
        id: '123',
        hand_type: 'left',
        full_reading: 'Left hand reading',
        is_favorite: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(palmReadingApi.getPalmReading).mockResolvedValue(mockReading)

      const { result } = renderHook(() => usePalmReading('123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.getPalmReading).toHaveBeenCalledWith('123')
      expect(result.current.data).toEqual(mockReading)
    })

    it('should not fetch when ID is null', () => {
      const { result } = renderHook(() => usePalmReading(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.isFetching).toBe(false)
      expect(palmReadingApi.getPalmReading).not.toHaveBeenCalled()
    })
  })

  describe('useUpdatePalmReading', () => {
    it('should update reading notes', async () => {
      const mockUpdatedReading = {
        id: '123',
        hand_type: 'both',
        full_reading: 'Test reading',
        notes: 'New notes',
        is_favorite: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(palmReadingApi.updatePalmReading).mockResolvedValue(mockUpdatedReading)

      const { result } = renderHook(() => useUpdatePalmReading(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        readingId: '123',
        data: { notes: 'New notes' },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.updatePalmReading).toHaveBeenCalledWith('123', {
        notes: 'New notes',
      })
    })

    it('should toggle favorite status', async () => {
      const mockUpdatedReading = {
        id: '123',
        hand_type: 'both',
        full_reading: 'Test reading',
        is_favorite: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(palmReadingApi.updatePalmReading).mockResolvedValue(mockUpdatedReading)

      const { result } = renderHook(() => useUpdatePalmReading(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        readingId: '123',
        data: { is_favorite: true },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.updatePalmReading).toHaveBeenCalledWith('123', {
        is_favorite: true,
      })
    })
  })

  describe('useDeletePalmReading', () => {
    it('should delete a reading', async () => {
      vi.mocked(palmReadingApi.deletePalmReading).mockResolvedValue({
        success: true,
        message: 'Palm reading deleted',
      })

      const { result } = renderHook(() => useDeletePalmReading(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('123')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(palmReadingApi.deletePalmReading).toHaveBeenCalledWith('123')
    })
  })
})
