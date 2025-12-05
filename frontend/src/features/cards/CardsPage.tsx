/**
 * Cards Page
 *
 * Play card games using tarot decks: Solitaire and Cribbage
 */
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { SolitaireBoard } from './components/SolitaireBoard'
import { CribbageBoard } from './components/CribbageBoard'
import {
  type CardGame,
  type GameType,
  type SolitaireState,
  type CribbageState,
  type GameStats,
  createGame,
  listGames,
  getGame,
  getGameStats,
  isSolitaireGame,
  isCribbageGame
} from '@/lib/api/cards'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spade, Users, Trophy, Clock, Loader2 } from 'lucide-react'

export function CardsPage() {
  const [activeGame, setActiveGame] = useState<CardGame | null>(null)
  const [gameType, setGameType] = useState<GameType>('solitaire')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{ solitaire?: GameStats; cribbage?: GameStats }>({})
  const [recentGames, setRecentGames] = useState<CardGame[]>([])

  // Load stats and recent games
  useEffect(() => {
    async function loadData() {
      try {
        const [solStats, cribStats, games] = await Promise.all([
          getGameStats('solitaire'),
          getGameStats('cribbage'),
          listGames({ limit: 5 })
        ])
        setStats({ solitaire: solStats, cribbage: cribStats })
        setRecentGames(games.games.filter(g => !g.is_finished))
      } catch (error) {
        console.error('Failed to load game data:', error)
      }
    }
    loadData()
  }, [activeGame])

  const handleNewGame = useCallback(async (type: GameType) => {
    setLoading(true)
    try {
      const game = await createGame({
        game_type: type,
        ai_difficulty: 'medium',
        draw_count: 1
      })
      setActiveGame(game)
      setGameType(type)
    } catch (error) {
      console.error('Failed to create game:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleResumeGame = useCallback(async (gameId: string) => {
    setLoading(true)
    try {
      const game = await getGame(gameId)
      setActiveGame(game)
      setGameType(game.game_type as GameType)
    } catch (error) {
      console.error('Failed to resume game:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleGameUpdate = useCallback((game: CardGame) => {
    setActiveGame(game)
  }, [])

  const handleBackToMenu = useCallback(() => {
    setActiveGame(null)
  }, [])

  // Game view
  if (activeGame) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-400">
            {activeGame.game_type === 'solitaire' ? 'Solitaire' : 'Cribbage'}
          </h1>
          <Button variant="ghost" onClick={handleBackToMenu}>
            Back to Menu
          </Button>
        </div>

        {isSolitaireGame(activeGame) && (
          <SolitaireBoard
            game={activeGame}
            gameState={activeGame.game_state as SolitaireState}
            onUpdate={handleGameUpdate}
            onNewGame={() => handleNewGame('solitaire')}
          />
        )}

        {isCribbageGame(activeGame) && (
          <CribbageBoard
            game={activeGame}
            gameState={activeGame.game_state as CribbageState}
            onUpdate={handleGameUpdate}
            onNewGame={() => handleNewGame('cribbage')}
          />
        )}
      </div>
    )
  }

  // Menu view
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-amber-400 mb-2">Card Games</h1>
        <p className="text-gray-400">
          Play classic card games using your tarot decks
        </p>
      </div>

      <Tabs defaultValue="solitaire" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="solitaire" className="flex items-center gap-2">
            <Spade className="w-4 h-4" />
            Solitaire
          </TabsTrigger>
          <TabsTrigger value="cribbage" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Cribbage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solitaire">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Game card */}
            <Card className="bg-gray-900/50 border-emerald-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                  <Spade className="w-5 h-5" />
                  Klondike Solitaire
                </CardTitle>
                <CardDescription>
                  The classic patience game. Build foundations from Ace to King.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    <p className="mb-2">Rules:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Build tableau piles in descending order, alternating colors</li>
                      <li>Move cards to foundations in ascending order by suit</li>
                      <li>Only Kings can be placed in empty tableau spots</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => handleNewGame('solitaire')}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    New Game
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats card */}
            <Card className="bg-gray-900/50 border-gray-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-300">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.solitaire && stats.solitaire.games_played > 0 ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Games Played</div>
                      <div className="text-xl font-bold">{stats.solitaire.games_played}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Win Rate</div>
                      <div className="text-xl font-bold text-emerald-400">
                        {(stats.solitaire.win_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Games Won</div>
                      <div className="text-xl font-bold">{stats.solitaire.games_won}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Total Moves</div>
                      <div className="text-xl font-bold">{stats.solitaire.total_moves}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No games played yet. Start your first game!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cribbage">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Game card */}
            <Card className="bg-gray-900/50 border-purple-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <Users className="w-5 h-5" />
                  Cribbage vs Guide
                </CardTitle>
                <CardDescription>
                  Classic 2-player cribbage. Play against the Guide AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    <p className="mb-2">Rules:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Each player discards 2 cards to the crib</li>
                      <li>Peg points by making 15s, pairs, and runs</li>
                      <li>Score hands and crib after pegging</li>
                      <li>First to 121 points wins!</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => handleNewGame('cribbage')}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Challenge the Guide
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats card */}
            <Card className="bg-gray-900/50 border-gray-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-300">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Your Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.cribbage && stats.cribbage.games_played > 0 ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Games Played</div>
                      <div className="text-xl font-bold">{stats.cribbage.games_played}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Win Rate</div>
                      <div className="text-xl font-bold text-purple-400">
                        {(stats.cribbage.win_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Best Score</div>
                      <div className="text-xl font-bold">{stats.cribbage.best_score}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Avg Score</div>
                      <div className="text-xl font-bold">{stats.cribbage.average_score.toFixed(0)}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No games played yet. Challenge the Guide!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resume games */}
      {recentGames.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Games in Progress
          </h2>
          <div className="grid gap-2">
            {recentGames.map(game => (
              <Card
                key={game.id}
                className="bg-gray-900/30 border-gray-700/30 cursor-pointer hover:bg-gray-900/50 transition-colors"
                onClick={() => handleResumeGame(game.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {game.game_type === 'solitaire' ? (
                      <Spade className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Users className="w-5 h-5 text-purple-400" />
                    )}
                    <div>
                      <div className="font-medium">
                        {game.game_type === 'solitaire' ? 'Solitaire' : 'Cribbage'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {game.move_count} moves
                        {game.game_type === 'cribbage' && ` - Score: ${game.player_score}/${game.opponent_score}`}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Resume
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info about tarot mapping */}
      <div className="mt-8 p-4 bg-amber-900/20 rounded-lg border border-amber-700/30">
        <h3 className="font-semibold text-amber-400 mb-2">About the Cards</h3>
        <p className="text-sm text-gray-400">
          These games use your tarot Minor Arcana cards mapped to a standard 52-card deck:
          Wands become Clubs, Cups become Hearts, Swords become Spades, and Pentacles become Diamonds.
          Page becomes Jack, Knight becomes Queen, and King stays as King.
        </p>
      </div>
    </div>
  )
}
