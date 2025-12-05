/**
 * Cribbage Game Board
 *
 * Two-player cribbage game with AI opponent (the Guide)
 */
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PlayingCardView } from './PlayingCardView'
import {
  type CardGame,
  type CribbageState,
  type CribbageMove,
  makeMove,
  getSuitSymbol
} from '@/lib/api/cards'
import { Button } from '@/components/ui/button'
import { RefreshCw, Hand, User, Bot } from 'lucide-react'

interface CribbageBoardProps {
  game: CardGame
  gameState: CribbageState
  onUpdate: (game: CardGame) => void
  onNewGame: () => void
}

export function CribbageBoard({ game, gameState, onUpdate, onNewGame }: CribbageBoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastOpponentMove, setLastOpponentMove] = useState<string | null>(null)

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleMove = useCallback(async (move: CribbageMove) => {
    setLoading(true)
    try {
      const response = await makeMove(game.id, move)
      onUpdate(response.game)
      setSelectedCards([])

      // Show opponent move if any
      if (response.opponent_move) {
        const oppMove = response.opponent_move as Record<string, unknown>
        if (oppMove.move_type === 'peg') {
          setLastOpponentMove(`Guide played a card (${response.opponent_points} points)`)
        } else if (oppMove.move_type === 'say_go') {
          setLastOpponentMove('Guide says Go')
        } else if (oppMove.move_type === 'discard') {
          setLastOpponentMove('Guide discarded to crib')
        }
        setTimeout(() => setLastOpponentMove(null), 2000)
      }

      if (response.points_earned > 0) {
        showMessage(`You scored ${response.points_earned} points!`)
      }

      if (response.game.status === 'won') {
        showMessage('Congratulations! You won!')
      } else if (response.game.status === 'lost') {
        showMessage('The Guide won this time!')
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Move failed')
    } finally {
      setLoading(false)
    }
  }, [game.id, onUpdate])

  const toggleCardSelection = (cardId: string) => {
    if (gameState.phase !== 'discard') return

    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId))
    } else if (selectedCards.length < 2) {
      setSelectedCards([...selectedCards, cardId])
    }
  }

  const handleDiscard = () => {
    if (selectedCards.length !== 2) {
      showMessage('Select exactly 2 cards to discard')
      return
    }
    handleMove({ move_type: 'discard', cards: selectedCards })
  }

  const handlePeg = (cardId: string) => {
    if (gameState.phase !== 'pegging') return
    if (gameState.current_turn !== 'player') return
    handleMove({ move_type: 'peg', card_id: cardId })
  }

  const handleSayGo = () => {
    handleMove({ move_type: 'say_go' })
  }

  const canPlay = gameState.player_hand.some(
    card => card.value + gameState.pegging_count <= 31
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Score board */}
      <div className="flex items-center justify-between bg-amber-900/30 rounded-lg p-4 border border-amber-700/30">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          <span className="text-amber-200">You:</span>
          <span className="text-2xl font-bold text-amber-400">{game.player_score}</span>
          <span className="text-amber-500/50">/121</span>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-400">
            {gameState.phase === 'discard' && 'Discard 2 cards to the crib'}
            {gameState.phase === 'pegging' && `Count: ${gameState.pegging_count}/31`}
            {gameState.phase === 'counting' && 'Counting hands...'}
          </div>
          <div className="text-xs text-amber-500">
            {gameState.dealer === 'player' ? 'You deal' : 'Guide deals'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-400">{game.opponent_score}</span>
          <span className="text-purple-500/50">/121</span>
          <span className="text-purple-200">:Guide</span>
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
      </div>

      {/* Messages */}
      {(message || lastOpponentMove) && (
        <div className={cn(
          'text-center py-2 px-4 rounded-lg',
          lastOpponentMove ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
        )}>
          {lastOpponentMove || message}
        </div>
      )}

      {/* Game board */}
      <div className="bg-emerald-800/30 rounded-xl p-6 border border-emerald-700/30">
        {/* Opponent's area */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">Guide's Hand</span>
          </div>
          <div className="flex gap-2">
            {gameState.opponent_hand.map((card) => (
              <PlayingCardView
                key={card.id}
                card={{ ...card, face_up: false }}
                size="md"
              />
            ))}
          </div>
        </div>

        {/* Center area: Cut card, pegging pile, crib */}
        <div className="flex justify-center gap-8 mb-8">
          {/* Cut card */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Cut Card</div>
            {gameState.cut_card ? (
              <PlayingCardView card={gameState.cut_card} size="md" />
            ) : (
              <div className="w-16 h-24 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                <span className="text-gray-600 text-xs">Cut</span>
              </div>
            )}
          </div>

          {/* Pegging pile */}
          {gameState.phase === 'pegging' && (
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">
                Pegging ({gameState.pegging_count}/31)
              </div>
              <div className="flex gap-1">
                {gameState.pegging_pile.length > 0 ? (
                  gameState.pegging_pile.slice(-4).map((card, i) => (
                    <PlayingCardView key={card.id} card={card} size="sm" />
                  ))
                ) : (
                  <div className="w-12 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                    <span className="text-gray-600 text-xs">Play</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Crib */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">
              Crib ({gameState.dealer === 'player' ? 'Yours' : "Guide's"})
            </div>
            <div className="relative">
              {gameState.crib.length > 0 ? (
                <div className="relative w-16 h-24">
                  {gameState.crib.slice(0, Math.min(4, gameState.crib.length)).map((card, i) => (
                    <div
                      key={card.id}
                      className="absolute"
                      style={{ left: i * 3, top: i * 2 }}
                    >
                      <PlayingCardView
                        card={{ ...card, face_up: false }}
                        size="md"
                      />
                    </div>
                  ))}
                  <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {gameState.crib.length}
                  </div>
                </div>
              ) : (
                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-amber-600/50 flex items-center justify-center">
                  <Hand className="w-4 h-4 text-amber-600/50" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player's area */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">Your Hand</span>
            {gameState.phase === 'discard' && (
              <span className="text-xs text-gray-400">
                (Select 2 cards to discard)
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            {gameState.player_hand.map((card) => (
              <PlayingCardView
                key={card.id}
                card={card}
                size="lg"
                selected={selectedCards.includes(card.id)}
                onClick={() => {
                  if (gameState.phase === 'discard') {
                    toggleCardSelection(card.id)
                  } else if (gameState.phase === 'pegging' && gameState.current_turn === 'player') {
                    handlePeg(card.id)
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-4">
        {gameState.phase === 'discard' && (
          <Button
            onClick={handleDiscard}
            disabled={selectedCards.length !== 2 || loading}
            className="bg-amber-600 hover:bg-amber-500"
          >
            Discard to Crib
          </Button>
        )}

        {gameState.phase === 'pegging' && !canPlay && gameState.current_turn === 'player' && (
          <Button
            onClick={handleSayGo}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500"
          >
            Say "Go"
          </Button>
        )}

        <Button variant="outline" onClick={onNewGame}>
          <RefreshCw className="w-4 h-4 mr-1" />
          New Game
        </Button>
      </div>

      {/* Game over overlay */}
      {game.is_finished && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-amber-500/50">
            <h2 className={cn(
              'text-3xl font-bold mb-4',
              game.status === 'won' ? 'text-amber-400' : 'text-purple-400'
            )}>
              {game.status === 'won' ? 'You Won!' : 'Guide Wins!'}
            </h2>
            <div className="text-gray-300 mb-6">
              <p>Final Score:</p>
              <p className="text-xl">You: {game.player_score} - Guide: {game.opponent_score}</p>
            </div>
            <Button onClick={onNewGame} className="bg-amber-600 hover:bg-amber-500">
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
