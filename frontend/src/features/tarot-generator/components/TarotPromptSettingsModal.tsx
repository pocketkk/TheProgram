/**
 * TarotPromptSettingsModal - Modal for managing tarot card prompt settings
 *
 * Allows users to:
 * - Switch between prompt traditions (RWS, Thoth, Marseille, Custom)
 * - View and edit individual card prompts
 * - Reset prompts to tradition defaults
 */
import { useState, useMemo } from 'react'
import { X, RotateCcw, ChevronDown, ChevronRight, Check, Edit2, Search } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import {
  useTarotPromptStore,
  TarotTradition,
  TAROT_TRADITION_LABELS,
  TAROT_TRADITION_DESCRIPTIONS,
} from '../stores/useTarotPromptStore'
import { MAJOR_ARCANA, WANDS_SUIT, CUPS_SUIT, SWORDS_SUIT, PENTACLES_SUIT } from '../constants/tarotCards'

interface TarotPromptSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type CardSection = {
  title: string
  cards: Array<{ key: string; name: string }>
}

const CARD_SECTIONS: CardSection[] = [
  { title: 'Major Arcana', cards: MAJOR_ARCANA },
  { title: 'Wands', cards: WANDS_SUIT },
  { title: 'Cups', cards: CUPS_SUIT },
  { title: 'Swords', cards: SWORDS_SUIT },
  { title: 'Pentacles', cards: PENTACLES_SUIT },
]

export function TarotPromptSettingsModal({ isOpen, onClose }: TarotPromptSettingsModalProps) {
  const {
    activeTradition,
    setTradition,
    getPromptForCard,
    updatePrompt,
    resetPrompt,
    resetAllPrompts,
    isPromptModified,
    getModifiedCount,
  } = useTarotPromptStore()

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Major Arcana']))
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const traditions: TarotTradition[] = ['rws', 'thoth', 'marseille', 'custom']

  // Filter cards based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return CARD_SECTIONS

    const query = searchQuery.toLowerCase()
    return CARD_SECTIONS.map(section => ({
      ...section,
      cards: section.cards.filter(card =>
        card.name.toLowerCase().includes(query) ||
        card.key.toLowerCase().includes(query)
      ),
    })).filter(section => section.cards.length > 0)
  }, [searchQuery])

  if (!isOpen) return null

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  const startEditing = (cardKey: string) => {
    setEditingCard(cardKey)
    setEditText(getPromptForCard(cardKey))
  }

  const saveEdit = () => {
    if (editingCard && editText.trim()) {
      updatePrompt(editingCard, editText.trim())
    }
    setEditingCard(null)
    setEditText('')
  }

  const cancelEdit = () => {
    setEditingCard(null)
    setEditText('')
  }

  const handleResetAll = () => {
    if (window.confirm(`Reset all prompts to ${TAROT_TRADITION_LABELS[activeTradition]} defaults?`)) {
      resetAllPrompts()
    }
  }

  const modifiedCount = getModifiedCount()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-heading font-bold text-gradient-celestial">
              Tarot Prompt Settings
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Customize the prompts used to generate your tarot card images
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Tradition Selector */}
          <div className="p-4 border-b border-gray-800">
            <label className="block text-sm font-medium mb-3">Prompt Tradition</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {traditions.map((tradition) => (
                <button
                  key={tradition}
                  onClick={() => setTradition(tradition)}
                  className={`p-3 text-left rounded-lg border-2 transition ${
                    activeTradition === tradition
                      ? 'border-celestial-purple bg-celestial-purple/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold text-sm">
                    {TAROT_TRADITION_LABELS[tradition]}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {TAROT_TRADITION_DESCRIPTIONS[tradition]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm"
              />
            </div>

            {/* Modified count & Reset */}
            <div className="flex items-center gap-3">
              {modifiedCount > 0 && (
                <span className="text-sm text-celestial-pink">
                  {modifiedCount} modified
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                disabled={modifiedCount === 0}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset All
              </Button>
            </div>
          </div>

          {/* Card List */}
          <div className="p-4 space-y-4">
            {filteredSections.map((section) => (
              <div key={section.title} className="border border-gray-700 rounded-lg overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full p-3 bg-gray-800/50 flex items-center justify-between hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-2">
                    {expandedSections.has(section.title) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-semibold">{section.title}</span>
                    <span className="text-sm text-gray-400">({section.cards.length} cards)</span>
                  </div>
                </button>

                {/* Section Content */}
                {expandedSections.has(section.title) && (
                  <div className="divide-y divide-gray-800">
                    {section.cards.map((card) => {
                      const isModified = isPromptModified(card.key)
                      const isEditing = editingCard === card.key

                      return (
                        <div key={card.key} className="p-3 hover:bg-gray-800/30 transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{card.name}</span>
                                {isModified && (
                                  <span className="px-1.5 py-0.5 text-xs bg-celestial-pink/20 text-celestial-pink rounded">
                                    Modified
                                  </span>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-celestial-purple focus:outline-none text-sm"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveEdit}>
                                      <Check className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                  {getPromptForCard(card.key)}
                                </p>
                              )}
                            </div>

                            {!isEditing && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditing(card.key)}
                                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                                  title="Edit prompt"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {isModified && (
                                  <button
                                    onClick={() => resetPrompt(card.key)}
                                    className="p-1.5 text-gray-400 hover:text-celestial-pink hover:bg-gray-700 rounded transition"
                                    title="Reset to default"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {filteredSections.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No cards found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-end">
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default TarotPromptSettingsModal
