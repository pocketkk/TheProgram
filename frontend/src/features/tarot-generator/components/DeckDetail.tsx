/**
 * DeckDetail Component - View and manage a specific deck
 */
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import {
  ArrowLeft,
  Sparkles,
  Download,
  Trash2,
  CheckCircle,
  Play,
  RefreshCw,
  ThumbsUp,
  Eye,
  MessageSquare,
  Layers,
} from 'lucide-react'
import { CardGrid } from './CardPreview'
import { BatchProgress } from './BatchProgress'
import { CardRefineModal } from './CardRefineModal'
import {
  FULL_TAROT_DECK,
  MAJOR_ARCANA,
  getMinorArcana,
  type TarotCard,
} from '../constants/tarotCards'
import { useBatchGeneration } from '../hooks/useBatchGeneration'
import { useTarotPromptStore } from '../stores/useTarotPromptStore'
import { useRefreshDeck } from '../hooks/useTarotDecks'
import { updateCollection, generateCardBack } from '@/lib/api/images'
import type { CollectionWithImages } from '@/lib/api/images'
import type { BatchGenerateItem, ImageInfo } from '@/types/image'

interface DeckDetailProps {
  deck: CollectionWithImages
  onBack: () => void
  onDelete: () => void
}

type DeckFilter = 'all' | 'major' | 'minor' | 'missing'

export function DeckDetail({ deck, onBack, onDelete }: DeckDetailProps) {
  const [filter, setFilter] = useState<DeckFilter>('all')
  const [isApprovingStyle, setIsApprovingStyle] = useState(false)
  const [refinementFeedback, setRefinementFeedback] = useState('')
  const [lastGeneratedImageId, setLastGeneratedImageId] = useState<string | null>(null)
  const [selectedCardForRefine, setSelectedCardForRefine] = useState<{
    card: TarotCard
    image: ImageInfo
  } | null>(null)
  const [isGeneratingCardBack, setIsGeneratingCardBack] = useState(false)
  const [cardBackPrompt, setCardBackPrompt] = useState('')
  const { refreshDeck } = useRefreshDeck()
  const getPromptForCard = useTarotPromptStore(state => state.getPromptForCard)

  /**
   * Assemble a complete prompt with proper domain separation:
   * - Subject: The card description (what it depicts)
   * - Style: Art style (how to render it)
   * - Frame: Border/frame style (composition/edges)
   */
  const assemblePrompt = (cardKey: string): string => {
    const subject = getPromptForCard(cardKey)
    const style = deck.style_prompt || ''
    const frame = deck.border_style || ''

    // Build prompt in order: subject, style, frame
    const parts = [subject]
    if (style) parts.push(style)
    if (frame) parts.push(frame)

    return parts.join(', ')
  }

  // Determine which cards to show based on deck size
  const allCards = deck.total_expected === 22 ? MAJOR_ARCANA : FULL_TAROT_DECK

  // Check if we need to generate a style preview first
  const needsStylePreview = deck.image_count === 0 && !deck.reference_image_id
  const hasPreviewPendingApproval = deck.image_count > 0 && !deck.reference_image_id

  // Get the most recent preview card (The Fool / major_00) for the preview panel
  // Sort by created_at descending and find the first preview card
  const previewCard = allCards[0] // The Fool
  const previewImages = deck.images
    .filter(img => img.item_key === previewCard.key)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const deckFirstImage = previewImages[0] || deck.images[0]

  // Filter cards - computed after batchGen is available (see below)

  // Generate style preview (first card only)
  const handleGeneratePreview = () => {
    const firstCard = allCards[0] // The Fool
    const items: BatchGenerateItem[] = [{
      prompt: assemblePrompt(firstCard.key),
      item_key: firstCard.key,
      name: firstCard.name,
    }]

    batchGen.connect()
    setTimeout(() => {
      batchGen.startGeneration(items)
    }, 500)
  }

  // Refine preview with feedback (uses previous image as reference)
  const handleRefineWithFeedback = () => {
    if (!firstImage?.id || !refinementFeedback.trim()) return

    console.log('Refining with reference image:', firstImage.id) // Debug log

    const firstCard = allCards[0] // The Fool
    const items: BatchGenerateItem[] = [{
      prompt: assemblePrompt(firstCard.key),
      item_key: firstCard.key,
      name: firstCard.name,
    }]

    batchGen.connect()
    setTimeout(() => {
      batchGen.startGeneration(items, {
        refinementFeedback: refinementFeedback.trim(),
        referenceImageId: firstImage.id,
      })
      setRefinementFeedback('') // Clear feedback after sending
    }, 500)
  }

  // Approve style and set as reference image
  const handleApproveStyle = async () => {
    if (!firstImage?.id) {
      alert('No preview image to approve. Please generate a preview first.')
      return
    }

    console.log('Approving image:', firstImage.id) // Debug log

    setIsApprovingStyle(true)
    try {
      await updateCollection(deck.id, {
        reference_image_id: firstImage.id,
      })
      setLastGeneratedImageId(null) // Clear after approving
      refreshDeck(deck.id)
    } catch (error) {
      console.error('Failed to approve style:', error)
      alert('Failed to approve style. Please try again.')
    } finally {
      setIsApprovingStyle(false)
    }
  }

  // Generate missing cards
  const handleGenerateMissing = () => {
    const existingKeys = new Set(deck.images.map(img => img.item_key))
    const missingCards = allCards.filter(card => !existingKeys.has(card.key))

    if (missingCards.length === 0) {
      alert('All cards are already generated!')
      return
    }

    if (!deck.reference_image_id) {
      alert('Please approve a style preview first before generating the remaining cards.')
      return
    }

    const items: BatchGenerateItem[] = missingCards.map(card => ({
      prompt: assemblePrompt(card.key),
      item_key: card.key,
      name: card.name,
    }))

    // Connect and start generation with the approved reference image
    batchGen.connect()
    setTimeout(() => {
      batchGen.startGeneration(items, {
        referenceImageId: deck.reference_image_id,  // Explicitly pass reference image
      })
    }, 500)
  }

  // Handle clicking on a card to refine it
  const handleCardClick = (card: TarotCard) => {
    // Find the image for this card
    const image = deck.images.find(img => img.item_key === card.key)
    if (image) {
      setSelectedCardForRefine({ card, image })
    }
  }

  // Handle refinement completion
  const handleRefineComplete = () => {
    setSelectedCardForRefine(null)
    refreshDeck(deck.id)
  }

  // Generate card back
  const handleGenerateCardBack = async () => {
    setIsGeneratingCardBack(true)
    try {
      const result = await generateCardBack(
        deck.id,
        cardBackPrompt || undefined
      )
      if (result.success) {
        refreshDeck(deck.id)
        setCardBackPrompt('')
      } else {
        alert(`Failed to generate card back: ${result.error}`)
      }
    } catch (error) {
      console.error('Card back generation error:', error)
      alert(`Failed to generate card back: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingCardBack(false)
    }
  }

  // Batch generation
  const batchGen = useBatchGeneration({
    collectionId: deck.id,
    items: [], // Will be set when generation starts
    onProgress: (progress) => {
      // Track the last generated image ID for refinement chaining
      if (progress.status === 'complete' && progress.image_id) {
        setLastGeneratedImageId(progress.image_id)
      }
    },
    onComplete: () => {
      console.log('Batch generation complete!')
      refreshDeck(deck.id)
    },
    onError: (error) => {
      console.error('Batch generation error:', error)
      alert(`Generation failed: ${error}`)
    },
  })

  // Use the most recently generated preview image if available (more reliable than state)
  // This ensures what the user sees in the preview is exactly what gets approved
  const latestGeneratedPreview = batchGen.generatedImages.length > 0
    ? batchGen.generatedImages[batchGen.generatedImages.length - 1]
    : null

  // The display/approval image - prefer latest generated, fall back to deck data
  const firstImage = latestGeneratedPreview
    ? { id: latestGeneratedPreview.id || lastGeneratedImageId || '', url: latestGeneratedPreview.url }
    : deckFirstImage

  // Track generated images during batch operation to keep count accurate
  const generatedInCurrentBatch = batchGen.isGenerating ? batchGen.generatedImages.length : 0
  const actualGeneratedCount = deck.image_count + generatedInCurrentBatch
  const missingCount = allCards.length - actualGeneratedCount
  const progressPercent = (actualGeneratedCount / allCards.length) * 100

  // Filter cards - include keys from both deck.images AND currently generating batch
  const filteredCards = (() => {
    switch (filter) {
      case 'major':
        return MAJOR_ARCANA
      case 'minor':
        return getMinorArcana()
      case 'missing': {
        const existingKeys = new Set(deck.images.map(img => img.item_key))
        // Also exclude cards that were just generated in the current batch
        batchGen.generatedImages.forEach(img => existingKeys.add(img.key))
        return allCards.filter(card => !existingKeys.has(card.key))
      }
      default:
        return allCards
    }
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-3" data-testid="tarot-btn-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Decks
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-heading font-bold text-gradient-celestial mb-2">
                {deck.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>Created {new Date(deck.created_at).toLocaleDateString()}</span>
                {deck.is_complete && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Complete
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled data-testid="tarot-btn-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  `Delete "${deck.name}"? This will remove all ${deck.image_count} generated cards.`
                )
              ) {
                onDelete()
              }
            }}
            data-testid="tarot-btn-delete-deck"
            aria-label="Delete deck"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress */}
            <div>
              <div className="text-sm text-gray-400 mb-2">Progress</div>
              <div className="text-2xl font-bold text-celestial-purple mb-2">
                {actualGeneratedCount} / {allCards.length}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-celestial-purple to-celestial-pink h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Style */}
            <div>
              <div className="text-sm text-gray-400 mb-2">Art Style</div>
              <div className="text-sm">
                {deck.style_prompt || (
                  <span className="text-gray-500 italic">No specific style</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-end">
              {/* Step 1: Generate preview card */}
              {needsStylePreview && !batchGen.isGenerating && (
                <Button
                  onClick={handleGeneratePreview}
                  className="w-full"
                  disabled={batchGen.isGenerating}
                  data-testid="tarot-btn-generate-preview"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Generate Style Preview
                </Button>
              )}

              {/* Step 2: Approve or regenerate preview */}
              {hasPreviewPendingApproval && !batchGen.isGenerating && (
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={handleApproveStyle}
                    className="flex-1"
                    disabled={isApprovingStyle}
                    data-testid="tarot-btn-approve-style"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    {isApprovingStyle ? 'Approving...' : 'Approve Style'}
                  </Button>
                  <Button
                    onClick={handleGeneratePreview}
                    variant="outline"
                    className="flex-1"
                    disabled={batchGen.isGenerating}
                    data-testid="tarot-btn-regenerate"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}

              {/* Step 3: Generate remaining cards */}
              {deck.reference_image_id && missingCount > 0 && !batchGen.isGenerating && (
                <Button
                  onClick={handleGenerateMissing}
                  className="w-full"
                  disabled={batchGen.isGenerating}
                  data-testid="tarot-btn-generate-remaining"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {missingCount} Remaining Cards
                </Button>
              )}

              {deck.is_complete && (
                <div className="w-full text-center text-green-500 font-semibold">
                  Deck Complete!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Back Section - shown when deck has approved style */}
      {deck.reference_image_id && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-celestial-purple" />
              Card Back Design
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Current Card Back Preview */}
              <div className="w-32 h-44 flex-shrink-0 rounded-lg border border-gray-700 overflow-hidden">
                {deck.card_back_url ? (
                  <img
                    src={deck.card_back_url}
                    alt="Card Back"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-500 text-sm text-center px-2">No card back generated</span>
                  </div>
                )}
              </div>

              {/* Card Back Controls */}
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-3">
                  Generate a custom card back design that matches your deck's style.
                  This will be used when cards are face-down in readings.
                </p>

                {/* Prompt Input */}
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">
                    Card Back Design Prompt (optional)
                  </label>
                  <textarea
                    value={cardBackPrompt}
                    onChange={(e) => setCardBackPrompt(e.target.value)}
                    placeholder="e.g., Ornate mystical design with sacred geometry, celestial symbols, intricate border..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm resize-none"
                  />
                </div>

                <Button
                  onClick={handleGenerateCardBack}
                  disabled={isGeneratingCardBack || batchGen.isGenerating}
                  variant={deck.card_back_url ? 'outline' : 'primary'}
                  data-testid="tarot-btn-generate-card-back"
                >
                  {isGeneratingCardBack ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 mr-2" />
                      {deck.card_back_url ? 'Regenerate Card Back' : 'Generate Card Back'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Style Preview Panel - shown when preview is pending approval */}
      {hasPreviewPendingApproval && firstImage && !batchGen.isGenerating && (
        <Card className="border-celestial-purple/50 bg-gradient-to-br from-celestial-purple/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Preview Image */}
              <div className="w-48 h-64 flex-shrink-0">
                <img
                  src={firstImage.url}
                  alt="Style Preview"
                  className="w-full h-full object-cover rounded-lg shadow-lg"
                />
              </div>

              {/* Info and Actions */}
              <div className="flex-1">
                <h3 className="text-xl font-heading font-bold text-celestial-purple mb-2">
                  Style Preview Ready!
                </h3>
                <p className="text-gray-400 mb-4">
                  If you're happy with the style, approve it. Otherwise, provide feedback
                  to refine it or regenerate for a completely new variation.
                </p>

                {/* Feedback Input */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Refinement Feedback (optional)
                  </label>
                  <textarea
                    value={refinementFeedback}
                    onChange={(e) => setRefinementFeedback(e.target.value)}
                    placeholder="e.g., Make the border more ornate, use deeper colors, add more detail to the figure..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm resize-none"
                  />
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={handleApproveStyle}
                    disabled={isApprovingStyle}
                    size="lg"
                  >
                    <ThumbsUp className="w-5 h-5 mr-2" />
                    {isApprovingStyle ? 'Approving...' : 'Approve & Continue'}
                  </Button>
                  {refinementFeedback.trim() && (
                    <Button
                      onClick={handleRefineWithFeedback}
                      variant="outline"
                      size="lg"
                      disabled={batchGen.isGenerating}
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Refine with Feedback
                    </Button>
                  )}
                  <Button
                    onClick={handleGeneratePreview}
                    variant="ghost"
                    size="lg"
                    disabled={batchGen.isGenerating}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    New Variation
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Progress */}
      {(batchGen.isGenerating || batchGen.error) && (
        <BatchProgress
          progress={batchGen.currentProgress}
          generatedImages={batchGen.generatedImages}
          isPaused={batchGen.isPaused}
          isGenerating={batchGen.isGenerating}
          error={batchGen.error}
          onPause={batchGen.pauseGeneration}
          onResume={batchGen.resumeGeneration}
          onCancel={batchGen.cancelGeneration}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
          data-testid="tarot-filter-all"
        >
          All Cards ({allCards.length})
        </Button>
        {deck.total_expected === 78 && (
          <>
            <Button
              size="sm"
              variant={filter === 'major' ? 'primary' : 'outline'}
              onClick={() => setFilter('major')}
              data-testid="tarot-filter-major"
            >
              Major Arcana (22)
            </Button>
            <Button
              size="sm"
              variant={filter === 'minor' ? 'primary' : 'outline'}
              onClick={() => setFilter('minor')}
              data-testid="tarot-filter-minor"
            >
              Minor Arcana (56)
            </Button>
          </>
        )}
        {missingCount > 0 && (
          <Button
            size="sm"
            variant={filter === 'missing' ? 'primary' : 'outline'}
            onClick={() => setFilter('missing')}
            data-testid="tarot-filter-missing"
          >
            Missing ({missingCount})
          </Button>
        )}
      </div>

      {/* Card Grid */}
      <CardGrid
        cards={filteredCards}
        images={[
          ...deck.images,
          // Add newly generated images from current batch for real-time display
          ...batchGen.generatedImages.map(img => ({
            id: img.id || '',
            item_key: img.key,
            url: img.url,
            created_at: new Date().toISOString(),
          } as ImageInfo)),
        ]}
        generatingCards={batchGen.currentProgress?.status === 'generating' && batchGen.currentProgress.item_key
          ? new Set([batchGen.currentProgress.item_key])
          : new Set()}
        onCardClick={handleCardClick}
      />

      {/* Card Refinement Modal */}
      {selectedCardForRefine && (
        <CardRefineModal
          isOpen={!!selectedCardForRefine}
          onClose={() => setSelectedCardForRefine(null)}
          card={selectedCardForRefine.card}
          image={selectedCardForRefine.image}
          onRefineComplete={handleRefineComplete}
        />
      )}
    </div>
  )
}
