/**
 * PlanetSetDetail Component - View and manage a specific planet set
 */
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  CheckCircle,
  Play,
  RefreshCw,
  ThumbsUp,
  MessageSquare,
  Edit3,
} from 'lucide-react'
import { PLANETS, PLANET_CATEGORIES, type Planet } from '../constants/planets'
import { PlanetRefineModal } from './PlanetRefineModal'
import { usePlanetPromptStore } from '../stores/usePlanetPromptStore'
import { useBatchGeneration } from '@/features/tarot-generator/hooks/useBatchGeneration'
import { useRefreshPlanetSet } from '../hooks/usePlanetSets'
import { updateCollection } from '@/lib/api/images'
import type { CollectionWithImages } from '@/lib/api/images'
import type { BatchGenerateItem, ImageInfo } from '@/types/image'

interface PlanetSetDetailProps {
  set: CollectionWithImages
  onBack: () => void
  onDelete: () => void
}

type SetFilter = 'all' | 'personal' | 'social' | 'transpersonal' | 'point' | 'missing'

export function PlanetSetDetail({ set, onBack, onDelete }: PlanetSetDetailProps) {
  const [filter, setFilter] = useState<SetFilter>('all')
  const [isApprovingStyle, setIsApprovingStyle] = useState(false)
  const [refinementFeedback, setRefinementFeedback] = useState('')
  const [currentlyGeneratingKey, setCurrentlyGeneratingKey] = useState<string | null>(null)
  const [selectedPlanetForRefine, setSelectedPlanetForRefine] = useState<{
    planet: Planet
    image: ImageInfo
  } | null>(null)
  const { refreshSet } = useRefreshPlanetSet()
  const getPromptForPlanet = usePlanetPromptStore(state => state.getPromptForPlanet)

  /**
   * Assemble a complete prompt with proper domain separation:
   * - Subject: The planet description (what it is)
   * - Style: Art style (how to render it)
   * - Frame: Border/frame style (composition/edges)
   */
  const assemblePrompt = (planetKey: string): string => {
    const subject = getPromptForPlanet(planetKey)
    const style = set.style_prompt || ''
    const frame = set.border_style || ''

    // Build prompt in order: subject, style, frame
    const parts = [subject]
    if (style) parts.push(style)
    if (frame) parts.push(frame)

    return parts.join(', ')
  }

  // All planets
  const allPlanets = PLANETS

  // Check if we need to generate a style preview first
  const needsStylePreview = set.image_count === 0 && !set.reference_image_id
  const hasPreviewPendingApproval = set.image_count > 0 && !set.reference_image_id

  // Get the preview planet (Sun) for the preview panel
  const previewPlanet = allPlanets[0] // Sun
  const previewImages = set.images
    .filter(img => img.item_key === previewPlanet.key)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const setFirstImage = previewImages[0] || set.images[0]

  // Filter planets
  const filteredPlanets = (() => {
    switch (filter) {
      case 'personal':
        return allPlanets.filter(p => p.category === 'personal')
      case 'social':
        return allPlanets.filter(p => p.category === 'social')
      case 'transpersonal':
        return allPlanets.filter(p => p.category === 'transpersonal')
      case 'point':
        return allPlanets.filter(p => p.category === 'point')
      case 'missing': {
        const existingKeys = new Set(set.images.map(img => img.item_key))
        return allPlanets.filter(planet => !existingKeys.has(planet.key))
      }
      default:
        return allPlanets
    }
  })()

  // Map images by key for easy lookup
  const imagesByKey = new Map(set.images.map(img => [img.item_key, img]))

  // Batch generation
  const batchGen = useBatchGeneration({
    collectionId: set.id,
    items: [],
    onProgress: (progress) => {
      // Track which item is currently being generated
      if (progress.status === 'generating') {
        // Find the planet key from the item name
        const planet = allPlanets.find(p => p.name === progress.item_name)
        setCurrentlyGeneratingKey(planet?.key || null)
      } else if (progress.status === 'complete') {
        setCurrentlyGeneratingKey(null)
      }
    },
    onComplete: () => {
      setCurrentlyGeneratingKey(null)
      refreshSet(set.id)
    },
    onError: (error) => {
      console.error('Generation error:', error)
      setCurrentlyGeneratingKey(null)
    },
  })

  // Create a name-to-key mapping for real-time images
  const planetNameToKey = useMemo(() => {
    const map = new Map<string, string>()
    allPlanets.forEach(p => map.set(p.name, p.key))
    return map
  }, [allPlanets])

  // Merge set.images with real-time generated images
  const mergedImagesByKey = useMemo(() => {
    const map = new Map<string, { url: string; id?: string }>()

    // First, add all images from the set
    set.images.forEach(img => {
      if (img.item_key) {
        map.set(img.item_key, { url: img.url, id: img.id })
      }
    })

    // Then, overlay with real-time generated images (they take priority)
    // Note: genImg.key is the planet NAME (e.g., "Mercury"), not the key (e.g., "mercury")
    batchGen.generatedImages.forEach(genImg => {
      if (genImg.key) {
        // Convert planet name to planet key for consistent lookup
        const planetKey = planetNameToKey.get(genImg.key) || genImg.key.toLowerCase()
        map.set(planetKey, { url: genImg.url, id: genImg.id })
      }
    })

    return map
  }, [set.images, batchGen.generatedImages, planetNameToKey])

  // Check if there's a more recently generated preview from real-time generation
  // Note: img.key is the planet NAME (e.g., "Sun"), not the key (e.g., "sun")
  const latestGeneratedPreview = batchGen.generatedImages.find(
    img => img.key === previewPlanet.name
  )

  // Use real-time preview if available, otherwise use set data
  const firstImage = latestGeneratedPreview
    ? { id: latestGeneratedPreview.id || '', url: latestGeneratedPreview.url }
    : setFirstImage

  // Handle planet click for refinement
  const handlePlanetClick = (planet: Planet) => {
    // Find the image for this planet (check both sources)
    const existingImage = set.images.find(img => img.item_key === planet.key)
    // Note: generatedImages uses planet NAME as key, not planet.key
    const generatedImage = batchGen.generatedImages.find(img => img.key === planet.name)

    if (existingImage) {
      setSelectedPlanetForRefine({ planet, image: existingImage })
    } else if (generatedImage && generatedImage.id) {
      // Create a temporary ImageInfo from the generated image
      const tempImage: ImageInfo = {
        id: generatedImage.id,
        image_type: 'planet',
        prompt: '',
        file_path: '',
        url: generatedImage.url,
        width: 0,
        height: 0,
        collection_id: set.id,
        item_key: planet.key,
        created_at: new Date().toISOString(),
      }
      setSelectedPlanetForRefine({ planet, image: tempImage })
    }
  }

  // Handle refinement completion
  const handleRefineComplete = () => {
    setSelectedPlanetForRefine(null)
    refreshSet(set.id)
  }

  // Generate style preview (first planet only)
  const handleGeneratePreview = () => {
    const firstPlanet = allPlanets[0] // Sun
    const items: BatchGenerateItem[] = [{
      prompt: assemblePrompt(firstPlanet.key),
      item_key: firstPlanet.key,
      name: firstPlanet.name,
    }]

    batchGen.connect()
    setTimeout(() => {
      batchGen.startGeneration(items)
    }, 500)
  }

  // Refine preview with feedback
  const handleRefineWithFeedback = () => {
    if (!firstImage?.id || !refinementFeedback.trim()) return

    const firstPlanet = allPlanets[0] // Sun
    const items: BatchGenerateItem[] = [{
      prompt: assemblePrompt(firstPlanet.key),
      item_key: firstPlanet.key,
      name: firstPlanet.name,
    }]

    batchGen.connect()
    setTimeout(() => {
      batchGen.startGeneration(items, {
        refinementFeedback: refinementFeedback.trim(),
        referenceImageId: firstImage.id,
      })
      setRefinementFeedback('')
    }, 500)
  }

  // Approve style and set as reference image
  const handleApproveStyle = async () => {
    if (!firstImage?.id) {
      alert('No preview image to approve. Please generate a preview first.')
      return
    }

    setIsApprovingStyle(true)
    try {
      await updateCollection(set.id, {
        reference_image_id: firstImage.id,
      })
      refreshSet(set.id)
    } catch (error) {
      console.error('Failed to approve style:', error)
      alert('Failed to approve style. Please try again.')
    } finally {
      setIsApprovingStyle(false)
    }
  }

  // Generate missing planets
  const handleGenerateMissing = () => {
    const existingKeys = new Set(set.images.map(img => img.item_key))
    const missingPlanets = allPlanets.filter(planet => !existingKeys.has(planet.key))

    if (missingPlanets.length === 0) {
      alert('All planets are already generated!')
      return
    }

    if (!set.reference_image_id) {
      alert('Please approve a style preview first before generating the remaining planets.')
      return
    }

    const items: BatchGenerateItem[] = missingPlanets.map(planet => ({
      prompt: assemblePrompt(planet.key),
      item_key: planet.key,
      name: planet.name,
    }))

    batchGen.connect()
    setTimeout(() => {
      batchGen.startGeneration(items, {
        referenceImageId: set.reference_image_id,
      })
    }, 500)
  }

  const missingCount = allPlanets.filter(p => !imagesByKey.has(p.key)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} data-testid="planet-btn-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-heading font-bold text-gradient-celestial">
              {set.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={set.is_complete ? 'success' : 'celestial'}>
                {set.image_count} / {set.total_expected || PLANETS.length} planets
              </Badge>
              {set.reference_image_id && (
                <Badge variant="outline">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Style Approved
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={onDelete} data-testid="planet-btn-delete-set" aria-label="Delete planet set">
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>

      {/* Generation Controls */}
      {(needsStylePreview || hasPreviewPendingApproval) && (
        <Card className="bg-gradient-to-r from-celestial-purple/10 to-celestial-pink/10 border-celestial-purple/30">
          <CardHeader>
            <CardTitle className="text-lg">
              {needsStylePreview
                ? 'Step 1: Generate Style Preview'
                : 'Step 2: Approve or Refine Style'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {needsStylePreview ? (
              <>
                <p className="text-sm text-gray-400">
                  First, let's generate a preview of {previewPlanet.name} to establish the visual style.
                  You can refine it before generating the full set.
                </p>
                <Button
                  onClick={handleGeneratePreview}
                  disabled={batchGen.isGenerating}
                >
                  {batchGen.isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Style Preview
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-4">
                  {/* Preview Image */}
                  <div className="flex-shrink-0">
                    {firstImage ? (
                      <img
                        src={firstImage.url}
                        alt={previewPlanet.name}
                        className="w-48 h-48 object-cover rounded-lg border border-gray-700"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex-1 space-y-3">
                    <p className="text-sm text-gray-400">
                      Review the preview and approve the style, or provide feedback to refine it.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleApproveStyle}
                        disabled={isApprovingStyle || batchGen.isGenerating}
                      >
                        {isApprovingStyle ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Approve Style
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGeneratePreview}
                        disabled={batchGen.isGenerating}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        New Variation
                      </Button>
                    </div>
                    {/* Refinement feedback */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={refinementFeedback}
                        onChange={(e) => setRefinementFeedback(e.target.value)}
                        placeholder="e.g., make it more vibrant, add more cosmic effects..."
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-celestial-purple focus:outline-none"
                      />
                      <Button
                        variant="outline"
                        onClick={handleRefineWithFeedback}
                        disabled={!refinementFeedback.trim() || batchGen.isGenerating}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Refine
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Remaining */}
      {set.reference_image_id && missingCount > 0 && (
        <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Generate Remaining Planets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">
              Your style has been approved! Generate the remaining {missingCount} planets with consistent styling.
            </p>
            <Button
              onClick={handleGenerateMissing}
              disabled={batchGen.isGenerating}
            >
              {batchGen.isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate {missingCount} Remaining Planets
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Batch Progress */}
      {batchGen.isGenerating && batchGen.currentProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Generating: {batchGen.currentProgress.item_name || 'Starting...'}
                </span>
                <span className="text-celestial-purple font-semibold">
                  {batchGen.currentProgress.current} / {batchGen.currentProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-celestial-purple to-celestial-pink h-3 rounded-full transition-all"
                  style={{
                    width: `${batchGen.currentProgress.percentage}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
          data-testid="planet-filter-all"
        >
          All ({allPlanets.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'personal' ? 'primary' : 'outline'}
          onClick={() => setFilter('personal')}
          data-testid="planet-filter-personal"
        >
          Personal (5)
        </Button>
        <Button
          size="sm"
          variant={filter === 'social' ? 'primary' : 'outline'}
          onClick={() => setFilter('social')}
          data-testid="planet-filter-social"
        >
          Social (2)
        </Button>
        <Button
          size="sm"
          variant={filter === 'transpersonal' ? 'primary' : 'outline'}
          onClick={() => setFilter('transpersonal')}
          data-testid="planet-filter-transpersonal"
        >
          Transpersonal (3)
        </Button>
        <Button
          size="sm"
          variant={filter === 'point' ? 'primary' : 'outline'}
          onClick={() => setFilter('point')}
          data-testid="planet-filter-points"
        >
          Points (5)
        </Button>
        {missingCount > 0 && (
          <Button
            size="sm"
            variant={filter === 'missing' ? 'primary' : 'outline'}
            onClick={() => setFilter('missing')}
            data-testid="planet-filter-missing"
          >
            Missing ({missingCount})
          </Button>
        )}
      </div>

      {/* Planet Grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        {filteredPlanets.map((planet) => {
          const mergedImage = mergedImagesByKey.get(planet.key)
          const isGenerating = currentlyGeneratingKey === planet.key
          const hasImage = !!mergedImage

          return (
            <div
              key={planet.key}
              className={`relative group rounded-lg overflow-hidden border transition-all ${
                hasImage
                  ? 'border-gray-700 hover:border-celestial-purple cursor-pointer'
                  : isGenerating
                    ? 'border-celestial-purple animate-pulse'
                    : 'border-gray-700'
              }`}
              onClick={() => hasImage && handlePlanetClick(planet)}
            >
              {hasImage ? (
                <>
                  <img
                    src={mergedImage.url}
                    alt={planet.name}
                    className="w-full aspect-square object-cover"
                  />
                  {/* Edit overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex flex-col items-center text-white">
                      <Edit3 className="w-6 h-6 mb-1" />
                      <span className="text-xs">Click to Refine</span>
                    </div>
                  </div>
                </>
              ) : isGenerating ? (
                <div className="w-full aspect-square bg-gray-800 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-celestial-purple border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-celestial-purple">Generating...</p>
                </div>
              ) : (
                <div className="w-full aspect-square bg-gray-800 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs font-medium text-white truncate">{planet.name}</p>
                <p className="text-xs text-gray-400">{PLANET_CATEGORIES[planet.category]}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Planet Refinement Modal */}
      {selectedPlanetForRefine && (
        <PlanetRefineModal
          isOpen={!!selectedPlanetForRefine}
          onClose={() => setSelectedPlanetForRefine(null)}
          planet={selectedPlanetForRefine.planet}
          image={selectedPlanetForRefine.image}
          onRefineComplete={handleRefineComplete}
        />
      )}
    </div>
  )
}
