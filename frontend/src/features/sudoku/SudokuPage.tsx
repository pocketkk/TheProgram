/**
 * Variant Sudoku Page
 *
 * Transit-based sudoku puzzle solver featuring variant constraints
 * derived from astrological aspects.
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Puzzle,
  RefreshCw,
  Lightbulb,
  Check,
  Eye,
  Calendar,
  HelpCircle,
  Sparkles,
  Undo2,
  Redo2,
  Settings,
  Maximize2,
  ClipboardList,
  History,
  Grid3X3,
  Delete,
  Palette,
  CornerDownRight,
  Type
} from 'lucide-react'
import { SudokuGrid, type CellMarks } from './components/SudokuGrid'
import { ConstraintLegend } from './components/ConstraintLegend'
import type { Difficulty, SolutionError, MarkMode } from './types'
import * as sudokuApi from '@/lib/api/sudoku'

type GameState = 'loading' | 'playing' | 'checking' | 'complete' | 'error'

export const SudokuPage = () => {
  // Puzzle state
  const [puzzle, setPuzzle] = useState<sudokuApi.SudokuPuzzle | null>(null)
  const [grid, setGrid] = useState<number[][]>([])
  const [originalGrid, setOriginalGrid] = useState<number[][]>([])
  const [history, setHistory] = useState<number[][][]>([])

  // UI state
  const [gameState, setGameState] = useState<GameState>('loading')
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<SolutionError[]>([])
  const [hint, setHint] = useState<sudokuApi.HintResponse | null>(null)
  const [legendExpanded, setLegendExpanded] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Marks state (corner and center)
  const [cornerMarks, setCornerMarks] = useState<CellMarks>(new Map())
  const [centerMarks, setCenterMarks] = useState<CellMarks>(new Map())
  const [markMode, setMarkMode] = useState<MarkMode>('digit')

  // Settings
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [showTransitInfo, setShowTransitInfo] = useState(true)

  // Load initial puzzle
  useEffect(() => {
    loadNewPuzzle()
  }, [])

  const loadNewPuzzle = async (diff: Difficulty = difficulty) => {
    setGameState('loading')
    setErrors([])
    setHint(null)
    setErrorMessage(null)
    setHistory([])
    setCornerMarks(new Map())
    setCenterMarks(new Map())
    setSelectedCells(new Set())

    try {
      const newPuzzle = await sudokuApi.generatePuzzle({ difficulty: diff })
      setPuzzle(newPuzzle)
      setGrid(newPuzzle.grid.map(row => [...row]))
      setOriginalGrid(newPuzzle.grid.map(row => [...row]))
      setGameState('playing')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load puzzle')
      setGameState('error')
    }
  }

  const loadDailyPuzzle = async () => {
    setGameState('loading')
    setErrors([])
    setHint(null)
    setErrorMessage(null)
    setHistory([])
    setCornerMarks(new Map())
    setCenterMarks(new Map())
    setSelectedCells(new Set())

    try {
      const newPuzzle = await sudokuApi.getDailyPuzzle(difficulty)
      setPuzzle(newPuzzle)
      setGrid(newPuzzle.grid.map(row => [...row]))
      setOriginalGrid(newPuzzle.grid.map(row => [...row]))
      setGameState('playing')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load daily puzzle')
      setGameState('error')
    }
  }

  const handleCellSelect = useCallback((row: number, col: number, addToSelection?: boolean) => {
    if (addToSelection) {
      setSelectedCells(prev => {
        const newSet = new Set(prev)
        const key = `${row}-${col}`
        if (newSet.has(key)) {
          newSet.delete(key)
        } else {
          newSet.add(key)
        }
        return newSet
      })
    } else {
      setSelectedCells(new Set([`${row}-${col}`]))
    }
    setHint(null)
  }, [])

  const handleSelectionChange = useCallback((cells: Set<string>) => {
    setSelectedCells(cells)
    setHint(null)
  }, [])

  const handleCellInput = useCallback((value: number) => {
    if (selectedCells.size !== 1 || !puzzle) return

    const [row, col] = Array.from(selectedCells)[0].split('-').map(Number)

    // Don't modify fixed cells
    if (originalGrid[row][col] !== 0) return

    // Save current state to history
    setHistory(prev => [...prev, grid.map(row => [...row])])

    // Update grid
    setGrid(prev => {
      const newGrid = prev.map(row => [...row])
      newGrid[row][col] = value
      return newGrid
    })

    // Clear marks for this cell when entering a value
    if (value !== 0) {
      const key = `${row}-${col}`
      setCornerMarks(prev => {
        const newMarks = new Map(prev)
        newMarks.delete(key)
        return newMarks
      })
      setCenterMarks(prev => {
        const newMarks = new Map(prev)
        newMarks.delete(key)
        return newMarks
      })
    }

    // Clear errors related to this cell
    setErrors(prev => prev.filter(e =>
      !e.cell || e.cell[0] !== row || e.cell[1] !== col
    ))
  }, [selectedCells, originalGrid, grid, puzzle])

  const handleMarkToggle = useCallback((cells: Set<string>, value: number, markType: 'corner' | 'center') => {
    const setMarks = markType === 'corner' ? setCornerMarks : setCenterMarks

    setMarks(prev => {
      const newMarks = new Map(prev)

      // Check if we should add or remove - if ALL cells have this mark, remove it; otherwise add it
      const allHaveMark = Array.from(cells).every(key => {
        const cellMarks = prev.get(key)
        return cellMarks && cellMarks.has(value)
      })

      cells.forEach(key => {
        const cellMarks = new Set(prev.get(key) || [])

        if (allHaveMark) {
          cellMarks.delete(value)
        } else {
          cellMarks.add(value)
        }

        if (cellMarks.size === 0) {
          newMarks.delete(key)
        } else {
          newMarks.set(key, cellMarks)
        }
      })

      return newMarks
    })
  }, [])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return

    const previousGrid = history[history.length - 1]
    setGrid(previousGrid)
    setHistory(prev => prev.slice(0, -1))
    setErrors([])
  }, [history])

  const handleGetHint = async () => {
    if (!puzzle) return

    try {
      const hintResponse = await sudokuApi.getHint(puzzle.puzzle_id, grid)
      setHint(hintResponse)
      setSelectedCells(new Set([`${hintResponse.cell[0]}-${hintResponse.cell[1]}`]))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to get hint')
    }
  }

  const handleCheckSolution = async () => {
    if (!puzzle) return

    setGameState('checking')
    try {
      const result = await sudokuApi.checkSolution(puzzle.puzzle_id, grid)
      setErrors(result.errors)

      if (result.is_correct) {
        setGameState('complete')
      } else {
        setGameState('playing')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to check solution')
      setGameState('playing')
    }
  }

  const handleRevealSolution = async () => {
    if (!puzzle) return

    try {
      const solution = await sudokuApi.revealSolution(puzzle.puzzle_id)
      setGrid(solution)
      setGameState('complete')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to reveal solution')
    }
  }

  const handleDifficultyChange = (diff: Difficulty) => {
    setDifficulty(diff)
    loadNewPuzzle(diff)
  }

  // Handle numpad click based on current mode
  const handleNumpadClick = useCallback((num: number) => {
    if (selectedCells.size === 0) return

    // Get first selected cell to check if it's fixed
    const firstKey = Array.from(selectedCells)[0]
    const [firstRow, firstCol] = firstKey.split('-').map(Number)

    // For single selection with digit mode, enter the digit
    if (markMode === 'digit' && selectedCells.size === 1) {
      if (originalGrid[firstRow][firstCol] === 0) {
        handleCellInput(num)
      }
      return
    }

    // For corner/center mode or multi-selection, toggle marks
    const validCells = new Set<string>()
    selectedCells.forEach(key => {
      const [r, c] = key.split('-').map(Number)
      if (originalGrid[r][c] === 0 && grid[r][c] === 0) {
        validCells.add(key)
      }
    })

    if (validCells.size > 0) {
      handleMarkToggle(validCells, num, markMode === 'center' ? 'center' : 'corner')
    }
  }, [selectedCells, markMode, originalGrid, grid, handleCellInput, handleMarkToggle])

  // Calculate progress
  const filledCells = grid.flat().filter(v => v !== 0).length
  const totalCells = 81
  const progress = Math.round((filledCells / totalCells) * 100)

  // Get first selected cell for checking if input is allowed
  const getFirstSelectedCell = () => {
    if (selectedCells.size === 0) return null
    const first = Array.from(selectedCells)[0]
    const [row, col] = first.split('-').map(Number)
    return { row, col }
  }

  const firstSelected = getFirstSelectedCell()
  const canInput = firstSelected && originalGrid[firstSelected.row]?.[firstSelected.col] === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-gradient-celestial flex items-center gap-3">
            <Puzzle className="w-8 h-8" />
            Transit Sudoku
          </h1>
          <p className="text-gray-400 mt-1">
            Variant puzzles shaped by celestial aspects
          </p>
        </div>

        {/* Difficulty selector */}
        <div className="flex items-center gap-2">
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(diff => (
            <button
              key={diff}
              onClick={() => handleDifficultyChange(diff)}
              className={`
                px-3 py-1.5 rounded-lg capitalize text-sm transition-colors
                ${difficulty === diff
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {diff}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-900/30 border border-red-500/50 rounded-lg p-4"
          >
            <p className="text-red-400">{errorMessage}</p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => loadNewPuzzle()}
                className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50
                           text-red-300 rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-sm text-red-300/60 hover:text-red-200"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex gap-6 flex-wrap lg:flex-nowrap">
        {/* Puzzle area */}
        <div className="flex-shrink-0">
          {/* Loading state */}
          {gameState === 'loading' && (
            <div className="flex items-center justify-center"
                 style={{ width: 432, height: 432 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw className="w-8 h-8 text-purple-400" />
              </motion.div>
            </div>
          )}

          {/* Error state */}
          {gameState === 'error' && (
            <div className="flex flex-col items-center justify-center bg-gray-800/50 rounded-lg"
                 style={{ width: 432, height: 432 }}>
              <HelpCircle className="w-16 h-16 text-red-400/50 mb-4" />
              <p className="text-gray-400 text-center mb-4">
                Failed to generate puzzle
              </p>
              <button
                onClick={() => loadNewPuzzle()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500
                           rounded-lg text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Grid */}
          {(gameState === 'playing' || gameState === 'checking' || gameState === 'complete') && puzzle && (
            <div className="relative">
              <SudokuGrid
                grid={grid}
                originalGrid={originalGrid}
                constraints={puzzle.constraints}
                selectedCells={selectedCells}
                onCellSelect={handleCellSelect}
                onSelectionChange={handleSelectionChange}
                onCellInput={handleCellInput}
                cornerMarks={cornerMarks}
                centerMarks={centerMarks}
                onMarkToggle={handleMarkToggle}
                markMode={markMode}
                errors={errors}
                highlightedCells={hint ? [hint.cell] : []}
                isComplete={gameState === 'complete'}
              />

              {/* Completion overlay */}
              <AnimatePresence>
                {gameState === 'complete' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-green-900/80 rounded-lg
                               flex flex-col items-center justify-center gap-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                    >
                      <Sparkles className="w-16 h-16 text-green-400" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white">Puzzle Complete!</h2>
                    <button
                      onClick={() => loadNewPuzzle()}
                      className="px-6 py-2 bg-green-600 hover:bg-green-500
                                 rounded-lg text-white font-medium transition-colors"
                    >
                      New Puzzle
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Compact Control Panel */}
          {puzzle && gameState !== 'loading' && (
            <div className="mt-4 flex items-start gap-2">
              {/* Left toolbar - 2 columns of utility icons */}
              <div className="grid grid-cols-2 gap-2">
                {/* Row 1 */}
                <button
                  onClick={() => {/* settings - future */}}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Undo"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                {/* Row 2 */}
                <button
                  onClick={() => {/* fullscreen - future */}}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {/* redo - future */}}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors opacity-40"
                  title="Redo"
                  disabled
                >
                  <Redo2 className="w-5 h-5" />
                </button>
                {/* Row 3 */}
                <button
                  onClick={() => {/* notes - future */}}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="Notes"
                >
                  <ClipboardList className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCheckSolution}
                  disabled={gameState === 'checking'}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="Check Solution"
                >
                  <Check className="w-5 h-5" />
                </button>
                {/* Row 4 */}
                <button
                  onClick={handleGetHint}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="Get Hint"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => loadNewPuzzle()}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="New Puzzle"
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                {/* Row 5 */}
                <button
                  onClick={() => {/* history - future */}}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors"
                  title="History"
                >
                  <History className="w-5 h-5" />
                </button>
                <div /> {/* Empty spacer */}
              </div>

              {/* Center - Number pad */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleNumpadClick(num)}
                      disabled={selectedCells.size === 0 || !canInput}
                      className={`w-12 h-12 flex items-center justify-center
                                 disabled:opacity-30 disabled:cursor-not-allowed
                                 rounded-xl text-2xl font-semibold transition-colors
                                 ${markMode === 'corner'
                                   ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                   : markMode === 'center'
                                     ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                     : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                {/* Bottom row: 0 and delete */}
                <div className="grid grid-cols-3 gap-2">
                  <div /> {/* Empty spacer */}
                  <button
                    onClick={() => handleCellInput(0)}
                    disabled={selectedCells.size !== 1 || !canInput}
                    className="w-12 h-12 flex items-center justify-center bg-purple-600 hover:bg-purple-500
                               disabled:opacity-30 disabled:cursor-not-allowed
                               rounded-xl text-2xl font-semibold text-white transition-colors"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleCellInput(0)}
                    disabled={selectedCells.size !== 1 || !canInput}
                    className="w-12 h-12 flex items-center justify-center bg-purple-600 hover:bg-purple-500
                               disabled:opacity-30 disabled:cursor-not-allowed
                               rounded-xl text-white transition-colors"
                    title="Clear cell"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Right toolbar - mode toggles and features */}
              <div className="flex flex-col gap-2">
                {/* Digit mode */}
                <button
                  onClick={() => setMarkMode('digit')}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors
                             border ${markMode === 'digit'
                               ? 'bg-purple-600 border-purple-400 text-white'
                               : 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-300'}`}
                  title="Digit Mode"
                >
                  <Type className="w-5 h-5" />
                </button>
                {/* Corner marks mode */}
                <button
                  onClick={() => setMarkMode('corner')}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors
                             border ${markMode === 'corner'
                               ? 'bg-blue-600 border-blue-400 text-white'
                               : 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-300'}`}
                  title="Corner Marks Mode (Shift+number)"
                >
                  <CornerDownRight className="w-5 h-5" />
                </button>
                {/* Center marks mode */}
                <button
                  onClick={() => setMarkMode('center')}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors
                             border ${markMode === 'center'
                               ? 'bg-amber-600 border-amber-400 text-white'
                               : 'bg-gray-700 hover:bg-gray-600 border-gray-500 text-gray-300'}`}
                  title="Center Marks Mode (Ctrl+number)"
                >
                  <div className="text-[9px] font-bold leading-tight">
                    <div>123</div>
                  </div>
                </button>
                {/* Reveal solution */}
                <button
                  onClick={handleRevealSolution}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors border border-gray-500"
                  title="Reveal Solution"
                >
                  <Eye className="w-5 h-5" />
                </button>
                {/* Daily puzzle */}
                <button
                  onClick={loadDailyPuzzle}
                  className="w-11 h-11 flex items-center justify-center bg-gray-700 hover:bg-gray-600
                             rounded-xl text-gray-300 transition-colors border border-gray-500"
                  title="Daily Puzzle"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Mode indicator */}
          {puzzle && gameState !== 'loading' && (
            <div className="mt-2 text-center text-sm">
              {markMode === 'digit' && (
                <span className="text-purple-400">Digit mode - click to enter numbers</span>
              )}
              {markMode === 'corner' && (
                <span className="text-blue-400">Corner mode - drag to select, click digits for corner marks</span>
              )}
              {markMode === 'center' && (
                <span className="text-amber-400">Center mode - drag to select, click digits for center marks</span>
              )}
              {selectedCells.size > 1 && (
                <span className="ml-2 text-gray-500">({selectedCells.size} cells selected)</span>
              )}
            </div>
          )}

          {/* Progress bar */}
          {puzzle && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Progress</span>
                <span>{filledCells}/{totalCells} ({progress}%)</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex-1 min-w-[280px] space-y-4">
          {/* Hint display */}
          <AnimatePresence>
            {hint && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-400">{hint.technique}</h4>
                    <p className="text-sm text-yellow-200/80 mt-1">{hint.explanation}</p>
                    <p className="text-xs text-yellow-400/60 mt-2">
                      Cell R{hint.cell[0] + 1}C{hint.cell[1] + 1} = {hint.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Errors display */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-900/30 border border-red-500/50 rounded-lg p-4"
              >
                <h4 className="font-medium text-red-400 mb-2">
                  {errors.length} {errors.length === 1 ? 'Error' : 'Errors'} Found
                </h4>
                <ul className="text-sm text-red-300/80 space-y-1">
                  {errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>
                      {error.cell && (
                        <span>R{error.cell[0] + 1}C{error.cell[1] + 1}: </span>
                      )}
                      {error.message || error.type.replace(/_/g, ' ')}
                    </li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-red-400/60">
                      +{errors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transit info */}
          {puzzle && showTransitInfo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-800/50 rounded-lg p-4"
            >
              <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Transit Context
              </h3>
              <p className="text-sm text-gray-400">
                {puzzle.transit_summary}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(puzzle.transit_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </motion.div>
          )}

          {/* Constraint legend */}
          {puzzle && (
            <ConstraintLegend
              constraints={puzzle.constraints}
              expanded={legendExpanded}
              onToggle={() => setLegendExpanded(!legendExpanded)}
            />
          )}

          {/* Help section */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              How to Play
            </h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>* Click a cell and type 1-9 to enter a digit</li>
              <li>* Drag to select multiple cells</li>
              <li>* Shift+click to add cells to selection</li>
              <li>* Corner mode: add corner pencil marks</li>
              <li>* Center mode: add center candidates</li>
              <li>* Keyboard: Shift+num = corner, Ctrl+num = center</li>
              <li>* Arrow keys to navigate</li>
              <li>* Backspace or 0 clears a cell</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
