/**
 * TarotCardDisplay Component - Display a tarot card with symbol or custom image
 */
import type { TarotCard } from '@/lib/api/tarot'
import type { ImageInfo } from '@/types/image'
import { getSuitSymbol } from '@/lib/api/tarot'

interface TarotCardDisplayProps {
  card: TarotCard
  image?: ImageInfo
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TarotCardDisplay({
  card,
  image,
  size = 'md',
  className = '',
}: TarotCardDisplayProps) {
  const sizeClasses = {
    sm: 'w-8 h-12',
    md: 'w-16 h-24',
    lg: 'w-24 h-36',
  }

  const symbolSizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  }

  if (image?.url) {
    return (
      <div className={`${sizeClasses[size]} ${className} overflow-hidden rounded`}>
        <img
          src={image.url}
          alt={card.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }

  // Fallback to symbol
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <span className={symbolSizes[size]}>{getSuitSymbol(card.suit)}</span>
    </div>
  )
}

/**
 * Inline symbol or image for card display in cards
 */
interface InlineCardSymbolProps {
  card: TarotCard
  image?: ImageInfo
  className?: string
}

export function InlineCardSymbol({ card, image, className = '' }: InlineCardSymbolProps) {
  if (image?.url) {
    return (
      <img
        src={image.url}
        alt={card.name}
        className={`w-12 h-16 object-cover rounded ${className}`}
        loading="lazy"
      />
    )
  }

  return <span className={`text-3xl ${className}`}>{getSuitSymbol(card.suit)}</span>
}
