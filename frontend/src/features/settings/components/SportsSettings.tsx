/**
 * Sports Settings Component
 *
 * Manage favorite teams and sports preferences for Cosmic Chronicle.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Trophy,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui'
import { apiClient } from '@/lib/api/client'

// Supported leagues
const LEAGUES = [
  { id: 'nfl', name: 'NFL', sport: 'Football' },
  { id: 'nba', name: 'NBA', sport: 'Basketball' },
  { id: 'mlb', name: 'MLB', sport: 'Baseball' },
  { id: 'nhl', name: 'NHL', sport: 'Hockey' },
  { id: 'ncaaf', name: 'College Football', sport: 'Football' },
  { id: 'ncaab', name: 'College Basketball', sport: 'Basketball' },
  { id: 'mls', name: 'MLS', sport: 'Soccer' },
  { id: 'epl', name: 'Premier League', sport: 'Soccer' },
]

interface SportsFavorite {
  id: string
  league: string
  team_id: string
  team_name: string
  created_at: string
}

interface SportsFavoritesResponse {
  favorites: SportsFavorite[]
  total: number
}

export function SportsSettings() {
  const queryClient = useQueryClient()
  const [selectedLeague, setSelectedLeague] = useState('')
  const [teamSearch, setTeamSearch] = useState('')

  // Fetch favorites
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['sports-favorites'],
    queryFn: async (): Promise<SportsFavoritesResponse> => {
      try {
        const response = await apiClient.get('/chronicle/sports/favorites')
        return response.data
      } catch {
        return { favorites: [], total: 0 }
      }
    }
  })

  // Fetch teams for selected league
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['sports-teams', selectedLeague],
    queryFn: async () => {
      if (!selectedLeague) return []
      const response = await apiClient.get(`/chronicle/sports/teams/${selectedLeague}`)
      return response.data.teams || []
    },
    enabled: !!selectedLeague
  })

  // Add favorite mutation
  const addFavorite = useMutation({
    mutationFn: async ({ league, teamId, teamName }: { league: string; teamId: string; teamName: string }) => {
      await apiClient.post('/chronicle/sports/favorites', {
        league,
        team_id: teamId,
        team_name: teamName
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports-favorites'] })
      setSelectedLeague('')
      setTeamSearch('')
    }
  })

  // Remove favorite mutation
  const removeFavorite = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/chronicle/sports/favorites/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sports-favorites'] })
    }
  })

  // Filter teams by search
  const filteredTeams = teams?.filter((team: { name: string }) =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      {/* Current favorites */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Favorite Teams</h4>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : favorites?.favorites.length === 0 ? (
          <p className="text-sm text-gray-500">
            No favorite teams yet. Add teams to see their scores in your Chronicle.
          </p>
        ) : (
          <div className="space-y-2">
            {favorites?.favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between p-3 bg-cosmic-dark/50 rounded-lg border border-cosmic-light/10"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-4 w-4 text-celestial-gold" />
                  <div>
                    <p className="text-sm font-medium text-white">{fav.team_name}</p>
                    <p className="text-xs text-gray-500">
                      {LEAGUES.find(l => l.id === fav.league)?.name || fav.league}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFavorite.mutate(fav.id)}
                  disabled={removeFavorite.isPending}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new favorite */}
      <div className="border-t border-cosmic-light/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">Add Team</h4>

        {/* League selector */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Select League</label>
          <div className="flex flex-wrap gap-2">
            {LEAGUES.map((league) => (
              <button
                key={league.id}
                onClick={() => {
                  setSelectedLeague(league.id)
                  setTeamSearch('')
                }}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  selectedLeague === league.id
                    ? 'bg-celestial-gold text-cosmic-dark'
                    : 'bg-cosmic-light/10 text-gray-400 hover:bg-cosmic-light/20'
                }`}
              >
                {league.name}
              </button>
            ))}
          </div>
        </div>

        {/* Team selector */}
        {selectedLeague && (
          <div className="space-y-2">
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search teams..."
              className="w-full px-3 py-2 bg-cosmic-dark/50 border border-cosmic-light/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-celestial-gold/50"
            />

            {isLoadingTeams ? (
              <div className="flex items-center gap-2 text-gray-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading teams...
              </div>
            ) : filteredTeams.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredTeams.slice(0, 20).map((team: { id: string; name: string }) => {
                  const isAdded = favorites?.favorites.some(
                    f => f.team_id === team.id && f.league === selectedLeague
                  )
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        if (!isAdded) {
                          addFavorite.mutate({
                            league: selectedLeague,
                            teamId: team.id,
                            teamName: team.name
                          })
                        }
                      }}
                      disabled={isAdded || addFavorite.isPending}
                      className={`w-full flex items-center justify-between p-2 rounded text-left text-sm transition-colors ${
                        isAdded
                          ? 'bg-green-500/10 text-green-400'
                          : 'hover:bg-cosmic-light/10 text-gray-300'
                      }`}
                    >
                      <span>{team.name}</span>
                      {isAdded ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  )
                })}
              </div>
            ) : teamSearch ? (
              <p className="text-sm text-gray-500 py-2">No teams found</p>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                Type to search for teams
              </p>
            )}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 p-3 bg-cosmic-light/5 rounded-lg">
        <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          Sports scores are fetched from ESPN. No API key required.
          Scores for your favorite teams will appear in the Chronicle sports ticker.
        </p>
      </div>
    </div>
  )
}
