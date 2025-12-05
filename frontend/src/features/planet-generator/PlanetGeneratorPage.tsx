/**
 * Planet Generator Page - Create and manage AI-generated planet imagery
 *
 * Features:
 * - Create custom planet sets with different art styles
 * - Batch generate planets using Gemini API
 * - Track generation progress in real-time via WebSocket
 * - Manage multiple planet set collections
 */
import { useState } from 'react'
import { Plus, Sparkles, Globe, Settings } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { PlanetSetList } from './components/PlanetSetList'
import { PlanetSetDetail } from './components/PlanetSetDetail'
import { CreatePlanetSetModal } from './components/CreatePlanetSetModal'
import { PlanetPromptSettingsModal } from './components/PlanetPromptSettingsModal'
import {
  usePlanetSets,
  usePlanetSet,
  useCreatePlanetSet,
  useDeletePlanetSet,
} from './hooks/usePlanetSets'
import { TOTAL_PLANETS } from './constants/planets'

export function PlanetGeneratorPage() {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Queries
  const { data: sets, isLoading: isLoadingSets } = usePlanetSets({
    is_active: true,
  })
  const { data: selectedSet, isLoading: isLoadingSet } = usePlanetSet(selectedSetId)

  // Mutations
  const createSet = useCreatePlanetSet()
  const deleteSet = useDeletePlanetSet()

  const handleCreateSet = async (data: any) => {
    try {
      const newSet = await createSet.mutateAsync(data)
      setIsCreateModalOpen(false)
      // Automatically select the new set
      setSelectedSetId(newSet.id)
    } catch (error) {
      console.error('Failed to create planet set:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create planet set. Please try again.'
      )
    }
  }

  const handleDeleteSet = async (setId: string) => {
    try {
      await deleteSet.mutateAsync(setId)
      // If the deleted set was selected, go back to list
      if (selectedSetId === setId) {
        setSelectedSetId(null)
      }
    } catch (error) {
      console.error('Failed to delete planet set:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete planet set. Please try again.'
      )
    }
  }

  // Show set detail view
  if (selectedSetId && selectedSet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PlanetSetDetail
          set={selectedSet}
          onBack={() => setSelectedSetId(null)}
          onDelete={() => handleDeleteSet(selectedSetId)}
        />
      </div>
    )
  }

  // Show loading state for set detail
  if (selectedSetId && isLoadingSet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-400">Loading planet set...</p>
        </div>
      </div>
    )
  }

  // Show set list view
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400">
              Create custom planet imagery with AI-generated art
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSettingsModalOpen(true)}
              title="Prompt Settings"
              data-testid="planet-btn-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="planet-btn-new-set"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Planet Set
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-gradient-to-r from-celestial-purple/10 to-celestial-pink/10 border border-celestial-purple/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-celestial-purple flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-celestial-purple mb-1">
                Powered by Google Gemini
              </p>
              <p className="text-gray-400">
                Generate beautiful planet imagery for all {TOTAL_PLANETS} celestial bodies:
                Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto,
                Chiron, North Node, South Node, Black Moon Lilith, and Part of Fortune.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Set List */}
      <PlanetSetList
        sets={sets || []}
        onSelectSet={setSelectedSetId}
        onDeleteSet={handleDeleteSet}
        isLoading={isLoadingSets}
      />

      {/* Create Set Modal */}
      <CreatePlanetSetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSet}
        isCreating={createSet.isPending}
      />

      {/* Prompt Settings Modal */}
      <PlanetPromptSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  )
}
