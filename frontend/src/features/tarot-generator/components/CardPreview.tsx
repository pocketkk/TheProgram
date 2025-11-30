/**
 * CardPreview Component - Display a single tarot card
 */
import { Card, CardContent, Badge } from '@/components/ui'
import { Image as ImageIcon, AlertCircle } from 'lucide-react'
import type { ImageInfo } from '@/types/image'
import type { TarotCard } from '../constants/tarotCards'

interface CardPreviewProps {
  card: TarotCard
  image?: ImageInfo
  isGenerating?: boolean
  onClick?: () => void
}

export function CardPreview({
  card,
  image,
  isGenerating,
  onClick,
}: CardPreviewProps) {
  const hasImage = !!image

  return (
    <Card
      className={`overflow-hidden transition-all ${
        onClick ? 'cursor-pointer hover:scale-105 hover:border-celestial-purple' : ''
      } ${isGenerating ? 'animate-pulse' : ''}`}
      onClick={onClick}
    >
      <div className="aspect-[2/3] bg-gray-800 relative">
        {hasImage && image.url ? (
          <img
            src={image.url}
            alt={card.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-celestial-purple border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-gray-400">Generating...</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
            <ImageIcon className="w-12 h-12 mb-2" />
            <p className="text-xs">Not Generated</p>
          </div>
        )}

        {/* Card type badge */}
        <div className="absolute top-2 right-2">
          {card.arcana === 'major' ? (
            <Badge variant="celestial" className="text-xs">
              Major
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs capitalize">
              {card.suit}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm truncate">{card.name}</h3>
          {card.number !== undefined && (
            <p className="text-xs text-gray-400">
              {card.arcana === 'major' ? `${card.number}` : `${card.number} of ${card.suit}`}
            </p>
          )}
          {image && (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Generated
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CardGridProps {
  cards: TarotCard[]
  images: ImageInfo[]
  generatingCards?: Set<string>
  onCardClick?: (card: TarotCard) => void
}

/**
 * Grid display for multiple cards
 */
export function CardGrid({
  cards,
  images,
  generatingCards = new Set(),
  onCardClick,
}: CardGridProps) {
  // Create a map for quick image lookup - use the most recent image for each item_key
  const imageMap = new Map<string, ImageInfo>()
  // Sort by created_at descending so most recent comes first
  const sortedImages = [...images].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  sortedImages.forEach((img) => {
    if (img.item_key && !imageMap.has(img.item_key)) {
      // Only set if not already set (first = most recent due to sort)
      imageMap.set(img.item_key, img)
    }
  })

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <CardPreview
          key={card.key}
          card={card}
          image={imageMap.get(card.key)}
          isGenerating={generatingCards.has(card.key)}
          onClick={onCardClick ? () => onCardClick(card) : undefined}
        />
      ))}
    </div>
  )
}
