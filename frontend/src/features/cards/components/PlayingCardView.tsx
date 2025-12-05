/**
 * Playing Card Component
 *
 * Displays a single playing card with tarot styling
 */
import { cn } from '@/lib/utils'
import { type PlayingCard, getSuitSymbol } from '@/lib/api/cards'

interface PlayingCardViewProps {
  card: PlayingCard
  onClick?: () => void
  selected?: boolean
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PlayingCardView({
  card,
  onClick,
  selected = false,
  draggable = false,
  onDragStart,
  size = 'md',
  className
}: PlayingCardViewProps) {
  const sizeClasses = {
    sm: 'w-12 h-16 text-xs',
    md: 'w-16 h-24 text-sm',
    lg: 'w-24 h-36 text-base'
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'

  if (!card.face_up) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-lg border-2 border-amber-600/50',
          'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900',
          'flex items-center justify-center cursor-pointer',
          'shadow-lg transition-transform hover:scale-105',
          className
        )}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <div className="w-3/4 h-3/4 border border-amber-500/30 rounded flex items-center justify-center">
          <span className="text-amber-500/50 text-2xl">*</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg border-2',
        'bg-gradient-to-br from-amber-50 to-amber-100',
        'flex flex-col justify-between p-1 cursor-pointer',
        'shadow-lg transition-all',
        selected ? 'ring-2 ring-blue-500 -translate-y-2' : 'hover:scale-105',
        onClick ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {/* Top left */}
      <div className={cn('text-left leading-none', isRed ? 'text-red-600' : 'text-gray-900')}>
        <div className="font-bold">{card.rank}</div>
        <div>{getSuitSymbol(card.suit)}</div>
      </div>

      {/* Center - show tarot name for face cards */}
      <div className="flex-1 flex items-center justify-center">
        {['J', 'Q', 'K'].includes(card.rank) && (
          <div className={cn(
            'text-[0.5rem] text-center px-0.5 leading-tight',
            isRed ? 'text-red-600/70' : 'text-gray-700'
          )}>
            {card.tarot_name.split(' of ')[0]}
          </div>
        )}
        {!['J', 'Q', 'K'].includes(card.rank) && (
          <div className={cn('text-lg', isRed ? 'text-red-600' : 'text-gray-900')}>
            {getSuitSymbol(card.suit)}
          </div>
        )}
      </div>

      {/* Bottom right (inverted) */}
      <div className={cn('text-right leading-none rotate-180', isRed ? 'text-red-600' : 'text-gray-900')}>
        <div className="font-bold">{card.rank}</div>
        <div>{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  )
}

interface CardStackProps {
  cards: PlayingCard[]
  spread?: boolean
  spreadAmount?: number
  onClick?: (index: number) => void
  selectedIndex?: number
  className?: string
}

export function CardStack({
  cards,
  spread = false,
  spreadAmount = 20,
  onClick,
  selectedIndex,
  className
}: CardStackProps) {
  if (cards.length === 0) {
    return (
      <div className={cn(
        'w-16 h-24 rounded-lg border-2 border-dashed border-gray-600',
        'flex items-center justify-center',
        className
      )}>
        <span className="text-gray-600 text-xs">Empty</span>
      </div>
    )
  }

  if (!spread) {
    // Show only top card with stack effect
    return (
      <div className={cn('relative', className)}>
        {cards.length > 1 && (
          <>
            <div className="absolute top-0.5 left-0.5 w-16 h-24 rounded-lg bg-gray-800 opacity-30" />
            <div className="absolute top-1 left-1 w-16 h-24 rounded-lg bg-gray-800 opacity-20" />
          </>
        )}
        <PlayingCardView
          card={cards[cards.length - 1]}
          onClick={() => onClick?.(cards.length - 1)}
          selected={selectedIndex === cards.length - 1}
        />
        {cards.length > 1 && (
          <div className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {cards.length}
          </div>
        )}
      </div>
    )
  }

  // Spread cards vertically (for tableau)
  return (
    <div className={cn('relative', className)} style={{ height: `${96 + (cards.length - 1) * spreadAmount}px` }}>
      {cards.map((card, index) => (
        <div
          key={card.id}
          className="absolute left-0"
          style={{ top: `${index * spreadAmount}px`, zIndex: index }}
        >
          <PlayingCardView
            card={card}
            onClick={() => onClick?.(index)}
            selected={selectedIndex === index}
          />
        </div>
      ))}
    </div>
  )
}
