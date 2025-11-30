/**
 * DeckSelector Component - Select custom tarot deck for readings
 */
import { ChevronDown, Layers, Image as ImageIcon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { CollectionInfo } from '@/types/image'

interface DeckSelectorProps {
  selectedDeckId: string | null
  availableDecks: CollectionInfo[]
  onSelectDeck: (deckId: string | null) => void
}

export function DeckSelector({
  selectedDeckId,
  availableDecks,
  onSelectDeck,
}: DeckSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedDeck = availableDecks.find(d => d.id === selectedDeckId)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-cosmic-dark/30 border border-cosmic-light/10 rounded-lg hover:border-purple-500/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {selectedDeck ? (
            <>
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <span className="text-white">{selectedDeck.name}</span>
              <span className="text-xs text-gray-500">
                ({selectedDeck.image_count} cards)
              </span>
            </>
          ) : (
            <>
              <Layers className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">Default Symbols</span>
            </>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-cosmic-light/20 rounded-lg shadow-xl overflow-hidden">
          {/* Default option */}
          <button
            onClick={() => {
              onSelectDeck(null)
              setIsOpen(false)
            }}
            className={`w-full flex items-center gap-2 p-3 text-left hover:bg-purple-600/20 transition-colors ${
              !selectedDeckId ? 'bg-purple-600/10 border-l-2 border-purple-500' : ''
            }`}
          >
            <Layers className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-white">Default Symbols</p>
              <p className="text-xs text-gray-500">Use emoji symbols for cards</p>
            </div>
          </button>

          {/* Divider if there are custom decks */}
          {availableDecks.length > 0 && (
            <div className="border-t border-cosmic-light/10 px-3 py-1">
              <span className="text-xs text-gray-500">Custom Decks</span>
            </div>
          )}

          {/* Custom decks */}
          {availableDecks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => {
                onSelectDeck(deck.id)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 p-3 text-left hover:bg-purple-600/20 transition-colors ${
                selectedDeckId === deck.id ? 'bg-purple-600/10 border-l-2 border-purple-500' : ''
              }`}
            >
              <ImageIcon className="h-4 w-4 text-purple-400" />
              <div className="flex-1 min-w-0">
                <p className="text-white truncate">{deck.name}</p>
                <p className="text-xs text-gray-500">
                  {deck.image_count} / {deck.total_expected || 78} cards generated
                </p>
              </div>
            </button>
          ))}

          {/* Empty state */}
          {availableDecks.length === 0 && (
            <div className="p-3 text-center text-gray-500 text-sm">
              <p>No custom decks available</p>
              <p className="text-xs mt-1">Create a deck in the Tarot Generator</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
