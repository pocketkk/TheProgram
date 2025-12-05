/**
 * Tarot Generator Page - Create and manage AI-generated tarot decks
 *
 * Features:
 * - Create custom tarot decks with different art styles
 * - Batch generate cards using Gemini API
 * - Track generation progress in real-time via WebSocket
 * - Manage multiple deck collections
 */
import { useState } from 'react'
import { Plus, Sparkles, Settings } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { DeckList } from './components/DeckList'
import { DeckDetail } from './components/DeckDetail'
import { CreateDeckModal } from './components/CreateDeckModal'
import { TarotPromptSettingsModal } from './components/TarotPromptSettingsModal'
import {
  useTarotDecks,
  useTarotDeck,
  useCreateTarotDeck,
  useDeleteTarotDeck,
} from './hooks/useTarotDecks'

interface TarotGeneratorPageProps {
  embedded?: boolean
}

export function TarotGeneratorPage({ embedded = false }: TarotGeneratorPageProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Queries
  const { data: decks, isLoading: isLoadingDecks } = useTarotDecks({
    is_active: true,
  })
  const { data: selectedDeck, isLoading: isLoadingDeck } = useTarotDeck(selectedDeckId)

  // Mutations
  const createDeck = useCreateTarotDeck()
  const deleteDeck = useDeleteTarotDeck()

  const handleCreateDeck = async (data: any) => {
    try {
      const newDeck = await createDeck.mutateAsync(data)
      setIsCreateModalOpen(false)
      // Automatically select the new deck
      setSelectedDeckId(newDeck.id)
    } catch (error) {
      console.error('Failed to create deck:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to create deck. Please try again.'
      )
    }
  }

  const handleDeleteDeck = async (deckId: string) => {
    try {
      await deleteDeck.mutateAsync(deckId)
      // If the deleted deck was selected, go back to list
      if (selectedDeckId === deckId) {
        setSelectedDeckId(null)
      }
    } catch (error) {
      console.error('Failed to delete deck:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to delete deck. Please try again.'
      )
    }
  }

  // Show deck detail view
  if (selectedDeckId && selectedDeck) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DeckDetail
          deck={selectedDeck}
          onBack={() => setSelectedDeckId(null)}
          onDelete={() => handleDeleteDeck(selectedDeckId)}
        />
      </div>
    )
  }

  // Show loading state for deck detail
  if (selectedDeckId && isLoadingDeck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-400">Loading deck...</p>
        </div>
      </div>
    )
  }

  // Show deck list view
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header - only show when not embedded */}
      {!embedded && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-heading font-bold text-gradient-celestial mb-2">
                Tarot Deck Generator
              </h1>
              <p className="text-gray-400">
                Create custom tarot decks with AI-generated imagery
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSettingsModalOpen(true)}
                title="Prompt Settings"
                data-testid="tarot-btn-settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                data-testid="tarot-btn-new-deck"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Deck
              </Button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-4 bg-gradient-to-r from-celestial-purple/10 to-celestial-pink/10 border border-celestial-purple/30 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-celestial-purple flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-celestial-purple mb-1">
                  Powered by Google Gemini
                </p>
                <p className="text-gray-400">
                  Generate beautiful, unique tarot cards with customizable art styles.
                  Each deck can contain the full 78 cards or just the 22 Major Arcana.
                  Generation happens in batches with real-time progress tracking.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded header - compact with New Deck and Settings buttons */}
      {embedded && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            Create custom tarot decks with AI-generated imagery
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSettingsModalOpen(true)}
              title="Prompt Settings"
              data-testid="tarot-btn-settings-embedded"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="tarot-btn-new-deck-embedded"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Deck
            </Button>
          </div>
        </div>
      )}

      {/* Deck List */}
      <DeckList
        decks={decks || []}
        onSelectDeck={setSelectedDeckId}
        onDeleteDeck={handleDeleteDeck}
        isLoading={isLoadingDecks}
      />

      {/* Create Deck Modal */}
      <CreateDeckModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateDeck}
        isCreating={createDeck.isPending}
      />

      {/* Prompt Settings Modal */}
      <TarotPromptSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  )
}
