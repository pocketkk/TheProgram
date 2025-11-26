/**
 * Canvas Page - Freeform chart exploration space
 *
 * Part of Phase 2: Canvas Exploration
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layout,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Circle,
  StickyNote,
  Sparkles,
  ChevronLeft,
  X,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@/components/ui'
import { useCanvasStore } from '@/store/canvasStore'
import { listCharts, type ChartResponse } from '@/lib/api/charts'

// Item type icons and colors
const itemStyles: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  planet: { icon: Circle, color: 'bg-celestial-gold/20 border-celestial-gold/50 text-celestial-gold', label: 'Planet' },
  aspect: { icon: Sparkles, color: 'bg-celestial-pink/20 border-celestial-pink/50 text-celestial-pink', label: 'Aspect' },
  pattern: { icon: Grid3X3, color: 'bg-celestial-purple/20 border-celestial-purple/50 text-celestial-purple', label: 'Pattern' },
  note: { icon: StickyNote, color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400', label: 'Note' },
  insight: { icon: Sparkles, color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400', label: 'Insight' },
  house: { icon: Layout, color: 'bg-green-500/20 border-green-500/50 text-green-400', label: 'House' },
}

export function CanvasPage() {
  const {
    boards,
    currentBoard,
    selectedItems,
    isLoading,
    error,
    zoomLevel,
    panX,
    panY,
    isDragging,
    fetchBoards,
    fetchBoard,
    createBoard,
    deleteBoard,
    addItem,
    updateItem,
    deleteItem,
    addChartElements,
    arrangeItems,
    selectItem,
    toggleItemSelection,
    clearSelection,
    setZoom,
    setPan,
    setDragging,
    resetView,
    moveItem,
    clearCurrentBoard,
    clearError,
  } = useCanvasStore()

  // Local state
  const [showBoardList, setShowBoardList] = useState(true)
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false)
  const [showAddChartDialog, setShowAddChartDialog] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [charts, setCharts] = useState<ChartResponse[]>([])
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null)

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number; itemId?: string } | null>(null)

  // Fetch boards and charts on mount
  useEffect(() => {
    fetchBoards()
    const loadCharts = async () => {
      try {
        const chartsData = await listCharts()
        setCharts(chartsData)
      } catch (err) {
        console.error('Failed to fetch charts:', err)
      }
    }
    loadCharts()
  }, [fetchBoards])

  // Handle create board
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    try {
      const board = await createBoard({ name: newBoardName })
      await fetchBoard(board.id)
      setNewBoardName('')
      setShowNewBoardDialog(false)
      setShowBoardList(false)
    } catch (err) {
      // Error handled in store
    }
  }

  // Handle delete board
  const handleDeleteBoard = async (boardId: string) => {
    if (confirm('Are you sure you want to delete this canvas?')) {
      await deleteBoard(boardId)
    }
  }

  // Handle add chart elements
  const handleAddChartElements = async () => {
    if (!selectedChartId) return
    await addChartElements(selectedChartId, ['planets', 'aspects'])
    setShowAddChartDialog(false)
    setSelectedChartId(null)
  }

  // Handle add note
  const handleAddNote = async () => {
    if (!currentBoard) return
    await addItem({
      board_id: currentBoard.id,
      item_type: 'note',
      item_data: { title: 'New Note', content: 'Click to edit...' },
      position_x: -panX + 400,
      position_y: -panY + 300,
      width: 200,
      height: 150,
    })
  }

  // Mouse handlers for pan and item dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas) {
      dragStartRef.current = { x: e.clientX - panX, y: e.clientY - panY }
      setDragging(true)
    }
  }, [panX, panY, setDragging])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return

    if (dragStartRef.current.itemId) {
      // Dragging an item
      const newX = (e.clientX - dragStartRef.current.x) / zoomLevel
      const newY = (e.clientY - dragStartRef.current.y) / zoomLevel
      moveItem(dragStartRef.current.itemId, newX, newY)
    } else {
      // Panning canvas
      setPan(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y)
    }
  }, [isDragging, zoomLevel, moveItem, setPan])

  const handleMouseUp = useCallback(() => {
    if (dragStartRef.current?.itemId && currentBoard) {
      // Save item position to backend
      const item = currentBoard.items.find(i => i.id === dragStartRef.current?.itemId)
      if (item) {
        updateItem(item.id, { position_x: item.position_x, position_y: item.position_y })
      }
    }
    dragStartRef.current = null
    setDragging(false)
  }, [currentBoard, updateItem, setDragging])

  const handleItemMouseDown = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    const item = currentBoard?.items.find(i => i.id === itemId)
    if (!item) return

    dragStartRef.current = {
      x: e.clientX - item.position_x * zoomLevel,
      y: e.clientY - item.position_y * zoomLevel,
      itemId,
    }
    setDragging(true)

    if (e.shiftKey) {
      toggleItemSelection(itemId)
    } else if (!selectedItems.includes(itemId)) {
      clearSelection()
      selectItem(itemId)
    }
  }, [currentBoard, zoomLevel, selectedItems, toggleItemSelection, clearSelection, selectItem, setDragging])

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(zoomLevel + delta)
    }
  }, [zoomLevel, setZoom])

  // Render item
  const renderItem = (item: NonNullable<typeof currentBoard>['items'][0]) => {
    const style = itemStyles[item.item_type] || itemStyles.note
    const Icon = style.icon
    const isSelected = selectedItems.includes(item.id)

    return (
      <motion.div
        key={item.id}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        style={{
          position: 'absolute',
          left: item.position_x,
          top: item.position_y,
          width: item.width || 'auto',
          height: item.height || 'auto',
          transform: `rotate(${item.rotation}deg)`,
          zIndex: item.z_index,
        }}
        onMouseDown={e => handleItemMouseDown(e, item.id)}
        className={`
          ${style.color} rounded-lg border-2 p-3 cursor-move
          ${isSelected ? 'ring-2 ring-celestial-gold ring-offset-2 ring-offset-cosmic-dark' : ''}
          hover:brightness-110 transition-all
        `}
      >
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {item.item_type === 'planet' && (
              <>
                <p className="font-medium text-sm capitalize">{String(item.item_data.planet || 'Planet')}</p>
                <p className="text-xs opacity-75">{String(item.item_data.sign || '')} {String(item.item_data.degree || '')}°</p>
              </>
            )}
            {item.item_type === 'aspect' && (
              <>
                <p className="font-medium text-sm">{String(item.item_data.type || 'Aspect')}</p>
                <p className="text-xs opacity-75">
                  {String(item.item_data.planet1 || '')} - {String(item.item_data.planet2 || '')}
                </p>
              </>
            )}
            {item.item_type === 'pattern' && (
              <>
                <p className="font-medium text-sm capitalize">{String(item.item_data.type || 'Pattern')}</p>
                <p className="text-xs opacity-75">
                  {Array.isArray(item.item_data.planets) ? item.item_data.planets.join(', ') : ''}
                </p>
              </>
            )}
            {item.item_type === 'note' && (
              <>
                <p className="font-medium text-sm">{String(item.item_data.title || 'Note')}</p>
                <p className="text-xs opacity-75 line-clamp-3">{String(item.item_data.content || '')}</p>
              </>
            )}
            {item.item_type === 'insight' && (
              <p className="text-sm">{String(item.item_data.content || 'Insight')}</p>
            )}
            {item.item_type === 'house' && (
              <>
                <p className="font-medium text-sm">House {String(item.item_data.house_number || '?')}</p>
                <p className="text-xs opacity-75">{String(item.item_data.sign || '')}</p>
              </>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-b border-cosmic-light/20 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          {currentBoard && !showBoardList && (
            <Button variant="ghost" onClick={() => {
              clearCurrentBoard()
              setShowBoardList(true)
            }}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-xl font-heading font-bold text-gradient-celestial flex items-center gap-2">
              <Layout className="h-6 w-6 text-celestial-gold" />
              {currentBoard ? currentBoard.name : 'Exploration Canvas'}
            </h1>
            {!currentBoard && (
              <p className="text-sm text-gray-400">Create visual explorations of your chart</p>
            )}
          </div>
        </div>

        {currentBoard && (
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoomLevel - 0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400 w-16 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoomLevel + 0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetView}>
              <Maximize2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-cosmic-light/20 mx-2" />

            {/* Actions */}
            <Button variant="ghost" size="sm" onClick={handleAddNote}>
              <StickyNote className="h-4 w-4 mr-1" />
              Add Note
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAddChartDialog(true)}>
              <Circle className="h-4 w-4 mr-1" />
              Add Chart
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => arrangeItems('circular')}
              disabled={!currentBoard?.items.length}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Arrange
            </Button>

            {selectedItems.length > 0 && (
              <>
                <div className="w-px h-6 bg-cosmic-light/20 mx-2" />
                <Badge>{selectedItems.length} selected</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedItems.forEach(id => deleteItem(id))}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/50 flex items-center justify-between">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {showBoardList && !currentBoard ? (
            <motion.div
              key="board-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 h-full overflow-y-auto"
            >
              {/* Board list */}
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading text-white">Your Canvases</h2>
                  <Button onClick={() => setShowNewBoardDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Canvas
                  </Button>
                </div>

                {isLoading && boards.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : boards.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Layout className="h-16 w-16 mx-auto text-celestial-gold/50 mb-6" />
                      <h3 className="text-xl font-heading text-white mb-2">No canvases yet</h3>
                      <p className="text-gray-500 mb-6">
                        Create a canvas to start exploring your chart visually
                      </p>
                      <Button onClick={() => setShowNewBoardDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Canvas
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {boards.map(board => (
                      <Card
                        key={board.id}
                        className="cursor-pointer hover:border-celestial-gold/30 transition-colors"
                        onClick={() => {
                          fetchBoard(board.id)
                          setShowBoardList(false)
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            {board.name}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteBoard(board.id)
                              }}
                              className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500 mb-2">
                            {board.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{board.item_count} items</span>
                            <span>{board.background_type} background</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : currentBoard ? (
            <motion.div
              key="canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full relative overflow-hidden"
            >
              {/* Canvas area */}
              <div
                ref={canvasRef}
                data-canvas="true"
                className={`
                  absolute inset-0 cursor-${isDragging ? 'grabbing' : 'grab'}
                  ${currentBoard.background_type === 'grid' ? 'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%230a0a1a\'/%3E%3Cpath d=\'M40 0L0 0 0 40\' fill=\'none\' stroke=\'%231a1a2e\' stroke-width=\'1\'/%3E%3C/svg%3E")]' : ''}
                  ${currentBoard.background_type === 'dots' ? 'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'1\' fill=\'%231a1a2e\'/%3E%3C/svg%3E")]' : ''}
                  ${currentBoard.background_type === 'cosmic' ? 'bg-gradient-radial from-cosmic-dark via-cosmic-deep to-cosmic-dark' : ''}
                  ${currentBoard.background_type === 'blank' || currentBoard.background_type === 'dark' ? 'bg-cosmic-dark' : ''}
                `}
                style={{
                  backgroundSize: currentBoard.background_type === 'grid' ? '40px 40px' : '20px 20px',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* Transform container */}
                <div
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                    transformOrigin: '0 0',
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <AnimatePresence>
                    {currentBoard.items.map(item => renderItem(item))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Empty state */}
              {currentBoard.items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <Layout className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-500">Canvas is empty</p>
                    <p className="text-gray-600 text-sm">Add chart elements or notes to begin</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* New Board Dialog */}
      <AnimatePresence>
        {showNewBoardDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowNewBoardDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cosmic-dark border border-cosmic-light/20 rounded-lg p-6 w-96"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-heading text-white mb-4">Create New Canvas</h3>
              <input
                type="text"
                placeholder="Canvas name..."
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateBoard()}
                autoFocus
                className="w-full px-4 py-2 bg-cosmic-deep border border-cosmic-light/20 rounded-lg
                         text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50 mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowNewBoardDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBoard} disabled={!newBoardName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Chart Dialog */}
      <AnimatePresence>
        {showAddChartDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddChartDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cosmic-dark border border-cosmic-light/20 rounded-lg p-6 w-96"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-heading text-white mb-4">Add Chart Elements</h3>
              <p className="text-sm text-gray-500 mb-4">Select a chart to add its elements to the canvas</p>
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {charts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No charts available</p>
                ) : (
                  charts.map(chart => (
                    <button
                      key={chart.id}
                      onClick={() => setSelectedChartId(chart.id)}
                      className={`w-full px-4 py-3 text-left rounded-lg border transition-colors
                                ${selectedChartId === chart.id
                                  ? 'border-celestial-gold bg-celestial-gold/20'
                                  : 'border-cosmic-light/20 hover:border-celestial-gold/30'
                                }`}
                    >
                      <p className="font-medium text-white">{chart.chart_name || `${chart.chart_type} chart`}</p>
                      <p className="text-xs text-gray-500">{chart.astro_system} • {chart.house_system}</p>
                    </button>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowAddChartDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddChartElements} disabled={!selectedChartId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Elements
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CanvasPage
