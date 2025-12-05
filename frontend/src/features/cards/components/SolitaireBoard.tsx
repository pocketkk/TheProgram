/**
 * Solitaire (Klondike) Game Board
 *
 * Classic solitaire game using tarot deck cards
 */
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { PlayingCardView, CardStack } from './PlayingCardView'
import {
  type CardGame,
  type SolitaireState,
  type SolitaireMove,
  type ValidMove,
  makeMove,
  getValidMoves,
  getHint,
  getSuitSymbol
} from '@/lib/api/cards'
import { Button } from '@/components/ui/button'
import { Lightbulb, RotateCcw, RefreshCw } from 'lucide-react'

interface SolitaireBoardProps {
  game: CardGame
  gameState: SolitaireState
  onUpdate: (game: CardGame) => void
  onNewGame: () => void
}

export function SolitaireBoard({ game, gameState, onUpdate, onNewGame }: SolitaireBoardProps) {
  const [selectedCard, setSelectedCard] = useState<{ pile: string; index: number } | null>(null)
  const [validMoves, setValidMoves] = useState<ValidMove[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2000)
  }

  const handleMove = useCallback(async (move: SolitaireMove) => {
    setLoading(true)
    try {
      const response = await makeMove(game.id, move)
      onUpdate(response.game)
      showMessage(response.message)
      setSelectedCard(null)
      setHint(null)

      if (response.game.status === 'won') {
        showMessage('Congratulations! You won!')
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Move failed')
    } finally {
      setLoading(false)
    }
  }, [game.id, onUpdate])

  const handleDraw = useCallback(() => {
    if (gameState.stock.length > 0) {
      handleMove({ move_type: 'draw' })
    } else if (gameState.waste.length > 0) {
      handleMove({ move_type: 'reset_stock' })
    }
  }, [gameState.stock.length, gameState.waste.length, handleMove])

  const handleCardClick = useCallback(async (pile: string, index: number) => {
    if (loading) return

    // If clicking the same card, deselect
    if (selectedCard?.pile === pile && selectedCard?.index === index) {
      setSelectedCard(null)
      return
    }

    // If a card is already selected, try to move it
    if (selectedCard) {
      let move: SolitaireMove | null = null

      if (selectedCard.pile === 'waste') {
        if (pile.startsWith('tableau_')) {
          move = { move_type: 'waste_to_tableau', to_pile: pile }
        } else if (pile.startsWith('foundation_')) {
          move = { move_type: 'waste_to_foundation', to_pile: pile }
        }
      } else if (selectedCard.pile.startsWith('tableau_')) {
        if (pile.startsWith('tableau_') && pile !== selectedCard.pile) {
          move = { move_type: 'tableau_move', from_pile: selectedCard.pile, to_pile: pile }
        } else if (pile.startsWith('foundation_')) {
          move = { move_type: 'tableau_to_foundation', from_pile: selectedCard.pile, to_pile: pile }
        }
      }

      if (move) {
        await handleMove(move)
      } else {
        setSelectedCard({ pile, index })
      }
    } else {
      // Select the card
      setSelectedCard({ pile, index })
    }
  }, [selectedCard, loading, handleMove])

  const handleGetHint = useCallback(async () => {
    try {
      const hintResponse = await getHint(game.id)
      setHint(hintResponse.message)
      setTimeout(() => setHint(null), 5000)
    } catch (error) {
      showMessage('Could not get hint')
    }
  }, [game.id])

  const foundationSuits = ['hearts', 'diamonds', 'clubs', 'spades']

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGetHint} disabled={loading}>
            <Lightbulb className="w-4 h-4 mr-1" />
            Hint
          </Button>
          <Button variant="outline" size="sm" onClick={onNewGame}>
            <RefreshCw className="w-4 h-4 mr-1" />
            New Game
          </Button>
        </div>
        <div className="text-sm text-gray-400">
          Moves: {game.move_count}
        </div>
      </div>

      {/* Messages */}
      {(message || hint) && (
        <div className={cn(
          'text-center py-2 px-4 rounded-lg',
          hint ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'
        )}>
          {hint || message}
        </div>
      )}

      {/* Game board */}
      <div className="bg-emerald-800/30 rounded-xl p-6 border border-emerald-700/30">
        {/* Top row: Stock, Waste, and Foundations */}
        <div className="flex justify-between mb-8">
          {/* Stock and Waste */}
          <div className="flex gap-4">
            {/* Stock pile */}
            <div
              className="cursor-pointer"
              onClick={handleDraw}
            >
              {gameState.stock.length > 0 ? (
                <div className="relative">
                  <PlayingCardView
                    card={{ ...gameState.stock[0], face_up: false }}
                  />
                  <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {gameState.stock.length}
                  </div>
                </div>
              ) : (
                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-emerald-600 flex items-center justify-center cursor-pointer hover:bg-emerald-600/20">
                  <RotateCcw className="w-6 h-6 text-emerald-600" />
                </div>
              )}
            </div>

            {/* Waste pile */}
            <div onClick={() => gameState.waste.length > 0 && handleCardClick('waste', gameState.waste.length - 1)}>
              {gameState.waste.length > 0 ? (
                <PlayingCardView
                  card={gameState.waste[gameState.waste.length - 1]}
                  selected={selectedCard?.pile === 'waste'}
                />
              ) : (
                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">Waste</span>
                </div>
              )}
            </div>
          </div>

          {/* Foundations */}
          <div className="flex gap-2">
            {gameState.foundations.map((foundation, i) => (
              <div
                key={i}
                className="cursor-pointer"
                onClick={() => handleCardClick(`foundation_${i}`, foundation.length - 1)}
              >
                {foundation.length > 0 ? (
                  <PlayingCardView
                    card={foundation[foundation.length - 1]}
                    selected={selectedCard?.pile === `foundation_${i}`}
                  />
                ) : (
                  <div className={cn(
                    'w-16 h-24 rounded-lg border-2 border-dashed flex items-center justify-center',
                    foundationSuits[i] === 'hearts' || foundationSuits[i] === 'diamonds'
                      ? 'border-red-600/50 text-red-600/50'
                      : 'border-gray-600/50 text-gray-600/50'
                  )}>
                    <span className="text-2xl">{getSuitSymbol(foundationSuits[i])}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="flex gap-3 justify-center">
          {gameState.tableau.map((pile, i) => (
            <div
              key={i}
              className="min-h-[150px]"
              onClick={() => pile.length === 0 && handleCardClick(`tableau_${i}`, -1)}
            >
              {pile.length > 0 ? (
                <CardStack
                  cards={pile}
                  spread
                  spreadAmount={25}
                  onClick={(index) => handleCardClick(`tableau_${i}`, index)}
                  selectedIndex={selectedCard?.pile === `tableau_${i}` ? selectedCard.index : undefined}
                />
              ) : (
                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                  <span className="text-gray-600 text-xs">K</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Game won overlay */}
      {game.status === 'won' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-amber-500/50">
            <h2 className="text-3xl font-bold text-amber-400 mb-4">You Won!</h2>
            <p className="text-gray-300 mb-6">Completed in {game.move_count} moves</p>
            <Button onClick={onNewGame} className="bg-amber-600 hover:bg-amber-500">
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
