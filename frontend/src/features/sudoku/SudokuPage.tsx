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
  PenLine
} from 'lucide-react'
import { SudokuGrid, type PencilMarks } from './components/SudokuGrid'
import { ConstraintLegend } from './components/ConstraintLegend'
import type { CellSelection, Difficulty, SolutionError } from './types'
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
  const [selectedCell, setSelectedCell] = useState<CellSelection>(null)
  const [errors, setErrors] = useState<SolutionError[]>([])
  const [hint, setHint] = useState<sudokuApi.HintResponse | null>(null)
  const [legendExpanded, setLegendExpanded] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Pencil marks (candidates)
  const [pencilMarks, setPencilMarks] = useState<PencilMarks>(new Map())
  const [pencilMode, setPencilMode] = useState(false)

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
    setPencilMarks(new Map())

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
    setPencilMarks(new Map())

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

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col })
    setHint(null) // Clear hint when selecting a new cell
  }, [])

  const handleCellInput = useCallback((value: number) => {
    if (!selectedCell || !puzzle) return

    const { row, col } = selectedCell

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

    // Clear pencil marks for this cell when entering a value
    if (value !== 0) {
      setPencilMarks(prev => {
        const newMarks = new Map(prev)
        newMarks.delete(`${row}-${col}`)
        return newMarks
      })
    }

    // Clear errors related to this cell
    setErrors(prev => prev.filter(e =>
      !e.cell || e.cell[0] !== row || e.cell[1] !== col
    ))
  }, [selectedCell, originalGrid, grid, puzzle])

  const handlePencilMarkToggle = useCallback((row: number, col: number, value: number) => {
    setPencilMarks(prev => {
      const newMarks = new Map(prev)
      const key = `${row}-${col}`
      const cellMarks = new Set(prev.get(key) || [])

      if (cellMarks.has(value)) {
        cellMarks.delete(value)
      } else {
        cellMarks.add(value)
      }

      if (cellMarks.size === 0) {
        newMarks.delete(key)
      } else {
        newMarks.set(key, cellMarks)
      }

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
      setSelectedCell({ row: hintResponse.cell[0], col: hintResponse.cell[1] })
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

  // Calculate progress
  const filledCells = grid.flat().filter(v => v !== 0).length
  const totalCells = 81
  const progress = Math.round((filledCells / totalCells) * 100)

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
                selectedCell={selectedCell}
                onCellSelect={handleCellSelect}
                onCellInput={handleCellInput}
                pencilMarks={pencilMarks}
                onPencilMarkToggle={handlePencilMarkToggle}
                pencilMode={pencilMode}
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

          {/* Controls */}
          {puzzle && gameState !== 'loading' && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => loadNewPuzzle()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800
                           hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                New Puzzle
              </button>

              <button
                onClick={loadDailyPuzzle}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800
                           hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Daily
              </button>

              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800
                           hover:bg-gray-700 rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </button>

              <button
                onClick={() => {
                  setGrid(originalGrid.map(row => [...row]))
                  setHistory([])
                  setErrors([])
                  setHint(null)
                  setPencilMarks(new Map())
                  setGameState('playing')
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600/20
                           hover:bg-orange-600/30 text-orange-400 rounded-lg transition-colors"
              >
                Reset
              </button>

              <button
                onClick={() => setPencilMode(!pencilMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                           ${pencilMode
                             ? 'bg-blue-600 text-white'
                             : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                           }`}
                title="Toggle pencil mode (or hold Shift while typing)"
              >
                <PenLine className="w-4 h-4" />
                Pencil
              </button>

              <button
                onClick={handleGetHint}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20
                           hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors"
              >
                <Lightbulb className="w-4 h-4" />
                Hint
              </button>

              <button
                onClick={handleCheckSolution}
                disabled={gameState === 'checking'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20
                           hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Check
              </button>

              <button
                onClick={handleRevealSolution}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800
                           hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Reveal
              </button>
            </div>
          )}

          {/* Number pad for touch input */}
          {puzzle && gameState !== 'loading' && (
            <div className="mt-4">
              {pencilMode && (
                <p className="text-xs text-blue-400 mb-2 text-center">
                  Pencil mode: tap numbers to toggle candidates
                </p>
              )}
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      if (!selectedCell) return
                      const { row, col } = selectedCell
                      if (pencilMode && grid[row][col] === 0) {
                        handlePencilMarkToggle(row, col, num)
                      } else {
                        handleCellInput(num)
                      }
                    }}
                    disabled={!selectedCell || originalGrid[selectedCell.row]?.[selectedCell.col] !== 0}
                    className={`w-12 h-12 hover:bg-gray-700
                               disabled:opacity-30 disabled:cursor-not-allowed
                               rounded-lg text-xl font-mono transition-colors
                               ${pencilMode ? 'bg-blue-900/30 text-blue-300' : 'bg-gray-800 text-purple-300'}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleCellInput(0)}
                  disabled={!selectedCell || originalGrid[selectedCell.row]?.[selectedCell.col] !== 0}
                  className="w-12 h-12 bg-gray-800 hover:bg-gray-700
                             disabled:opacity-30 disabled:cursor-not-allowed
                             rounded-lg text-sm text-gray-400 transition-colors"
                >
                  Clear
                </button>
              </div>
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
              <li>* Shift+number adds pencil marks (candidates)</li>
              <li>* Or toggle Pencil mode button for touch input</li>
              <li>* Use arrow keys to navigate</li>
              <li>* Backspace or 0 clears a cell</li>
              <li>* Fixed (white) numbers cannot be changed</li>
              <li>* Colored lines show variant constraints</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
