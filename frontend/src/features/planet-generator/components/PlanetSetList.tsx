/**
 * PlanetSetList Component - Display list of planet sets
 */
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { Trash2, Eye, CheckCircle, Circle } from 'lucide-react'
import type { CollectionInfo } from '@/types/image'
import { TOTAL_PLANETS } from '../constants/planets'

interface PlanetSetListProps {
  sets: CollectionInfo[]
  onSelectSet: (setId: string) => void
  onDeleteSet: (setId: string) => void
  isLoading?: boolean
}

export function PlanetSetList({
  sets,
  onSelectSet,
  onDeleteSet,
  isLoading,
}: PlanetSetListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-700 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (sets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-gray-400">
          <Circle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No planet sets yet</p>
          <p className="text-sm">Create your first set to get started</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sets.map((set) => (
        <Card key={set.id} className="hover:border-celestial-purple transition-all">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {set.name}
                {set.is_complete && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </CardTitle>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(set.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Progress - cap at max since image_count may include refinements */}
              <div>
                {(() => {
                  const maxPlanets = set.total_expected || TOTAL_PLANETS
                  const displayCount = Math.min(set.image_count, maxPlanets)
                  const progressPercent = Math.min((displayCount / maxPlanets) * 100, 100)
                  return (
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Planets Generated</span>
                        <span className="text-celestial-purple font-semibold">
                          {displayCount} / {maxPlanets}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-celestial-purple to-celestial-pink h-2 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Style */}
              {set.style_prompt && (
                <div className="text-xs text-gray-400 line-clamp-2">
                  Style: {set.style_prompt}
                </div>
              )}

              {/* Status Badge */}
              <div className="flex gap-2">
                {set.is_complete && (
                  <Badge variant="success">Complete</Badge>
                )}
                {set.is_active && !set.is_complete && (
                  <Badge variant="celestial">Active</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onSelectSet(set.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Set
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete "${set.name}"? This will remove all ${set.image_count} generated planets.`
                      )
                    ) {
                      onDeleteSet(set.id)
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
