/**
 * Tarot Page - Interactive Tarot Reading Interface
 *
 * Part of Phase 3: Multi-Paradigm Integration
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  RefreshCw,
  Shuffle,
  X,
  ChevronRight,
  Sun,
  HelpCircle
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge
} from '@/components/ui'
import { useTarotStore } from '@/store/tarotStore'
import {
  getSuitSymbol,
  getSuitColorClass,
  formatCardName,
  SPREAD_TYPES,
  type SpreadType
} from '@/lib/api/tarot'

export function TarotPage() {
  const {
    spreads,
    currentReading,
    selectedSpread,
    question,
    dailyCard,
    selectedCard,
    readingHistory,
    isLoading,
    error,
    loadSpreads,
    setSelectedSpread,
    setQuestion,
    performReading,
    clearReading,
    getDailyCard,
    selectCard,
    clearError
  } = useTarotStore()

  const [showHistory, setShowHistory] = useState(false)

  // Load spreads on mount
  useEffect(() => {
    loadSpreads()
  }, [loadSpreads])

  // Get daily card on mount
  useEffect(() => {
    if (!dailyCard) {
      getDailyCard()
    }
  }, [dailyCard, getDailyCard])

  const handleNewReading = async () => {
    await performReading()
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-heading font-bold text-gradient-celestial flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-purple-400" />
          Tarot Reading
        </h1>
        <p className="text-gray-400 mt-2">
          Seek guidance through the wisdom of the cards
        </p>
      </motion.div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between"
        >
          <span className="text-red-400">{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Daily Card & Reading Setup */}
        <div className="space-y-6">
          {/* Daily Card */}
          {dailyCard && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-gradient-to-br from-purple-900/30 to-cosmic-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sun className="h-5 w-5 text-celestial-gold" />
                    Card of the Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-center cursor-pointer"
                    onClick={() => selectCard(dailyCard.card)}
                  >
                    <div className="text-6xl mb-3">
                      {getSuitSymbol(dailyCard.card.suit)}
                    </div>
                    <h3 className={`text-xl font-semibold ${getSuitColorClass(dailyCard.card.suit)}`}>
                      {formatCardName(dailyCard.card)}
                    </h3>
                    <p className="text-sm text-gray-400 mt-2">
                      {dailyCard.card.keywords?.slice(0, 3).join(' • ') || ''}
                    </p>
                    {dailyCard.daily_guidance && (
                      <p className="text-sm text-gray-300 mt-3 italic">
                        "{dailyCard.daily_guidance.slice(0, 100)}..."
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Reading Setup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-celestial-blue" />
                  New Reading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Spread Selection */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Choose a Spread</label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(SPREAD_TYPES).map(([key, name]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedSpread(key as SpreadType)}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          selectedSpread === key
                            ? 'bg-purple-600/30 border border-purple-500/50'
                            : 'bg-cosmic-dark/30 border border-cosmic-light/10 hover:border-purple-500/30'
                        }`}
                      >
                        <p className="font-medium text-white">{name}</p>
                        {spreads[key] && (
                          <p className="text-xs text-gray-500 mt-1">
                            {spreads[key].positions.length} cards
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Input */}
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Your Question (optional)
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What guidance do you seek?"
                    className="w-full p-3 bg-cosmic-900/50 border border-cosmic-400/20 rounded-lg
                             text-white placeholder-gray-500 resize-none
                             focus:outline-none focus:border-purple-500/50"
                    rows={3}
                  />
                </div>

                {/* Draw Button */}
                <Button
                  onClick={handleNewReading}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shuffle className="h-4 w-4 mr-2" />
                  )}
                  Draw Cards
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reading History */}
          {readingHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Recent Readings
                    <Badge>{readingHistory.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {readingHistory.slice(0, 5).map((reading, i) => (
                      <div
                        key={i}
                        className="p-2 bg-cosmic-dark/30 rounded text-sm"
                      >
                        <p className="text-white">{reading.spread_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(reading.timestamp).toLocaleString()}
                        </p>
                        {reading.question && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            Q: {reading.question}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Middle & Right Columns - Reading Display */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {currentReading ? (
              <motion.div
                key="reading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{currentReading.spread_name}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={clearReading}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                    {currentReading.question && (
                      <p className="text-sm text-gray-400 italic">
                        "{currentReading.question}"
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Cards Display */}
                    <div className={`grid gap-4 mb-6 ${
                      currentReading.positions.length <= 3
                        ? 'grid-cols-1 md:grid-cols-3'
                        : currentReading.positions.length <= 6
                        ? 'grid-cols-2 md:grid-cols-3'
                        : 'grid-cols-2 md:grid-cols-5'
                    }`}>
                      {currentReading.positions.map((pos, i) => (
                        <motion.div
                          key={pos.position}
                          initial={{ opacity: 0, y: 20, rotateY: 180 }}
                          animate={{ opacity: 1, y: 0, rotateY: 0 }}
                          transition={{ delay: i * 0.15, duration: 0.5 }}
                          onClick={() => selectCard(pos.card)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all
                                    ${selectedCard?.id === pos.card.id
                                      ? 'border-purple-500 bg-purple-500/10'
                                      : 'border-cosmic-light/20 bg-cosmic-dark/30 hover:border-purple-500/50'
                                    }
                                    ${pos.card.reversed ? 'rotate-180' : ''}`}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          <div className={pos.card.reversed ? 'rotate-180' : ''}>
                            <div className="text-center mb-2">
                              <span className="text-3xl">{getSuitSymbol(pos.card.suit)}</span>
                            </div>
                            <p className="text-xs text-gray-500 text-center mb-1">
                              {pos.position_name}
                            </p>
                            <h4 className={`text-sm font-medium text-center ${getSuitColorClass(pos.card.suit)}`}>
                              {formatCardName(pos.card)}
                            </h4>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-gradient-to-r from-purple-900/20 to-cosmic-800 rounded-lg">
                      <h4 className="font-medium text-white mb-2">Reading Summary</h4>
                      <p className="text-gray-300 text-sm">{currentReading.summary}</p>
                    </div>

                    {/* Position Interpretations */}
                    <div className="mt-6 space-y-3">
                      <h4 className="font-medium text-white">Card Interpretations</h4>
                      {currentReading.positions.map((pos) => (
                        <div
                          key={pos.position}
                          className="p-3 bg-cosmic-dark/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getSuitColorClass(pos.card.suit)}>
                              {pos.position_name}
                            </Badge>
                            <span className="text-white font-medium">
                              {formatCardName(pos.card)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{pos.interpretation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <Sparkles className="h-16 w-16 mx-auto text-purple-500/50 mb-6" />
                    <h3 className="text-xl font-heading text-white mb-2">
                      Ready for Your Reading
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Choose a spread and focus on your question. When you're ready,
                      draw the cards to reveal your guidance.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => selectCard(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cosmic-dark border border-cosmic-light/30 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-center flex-1">
                  <span className="text-5xl">{getSuitSymbol(selectedCard.suit)}</span>
                  <h3 className={`text-2xl font-heading mt-2 ${getSuitColorClass(selectedCard.suit)}`}>
                    {formatCardName(selectedCard)}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 capitalize">
                    {selectedCard.suit === 'major' ? 'Major Arcana' : `${selectedCard.suit} Suit`}
                  </p>
                </div>
                <button
                  onClick={() => selectCard(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.keywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="capitalize">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-green-400 mb-1">Upright Meaning</h4>
                  <p className="text-gray-300 text-sm">{selectedCard.upright_meaning}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-1">Reversed Meaning</h4>
                  <p className="text-gray-300 text-sm">{selectedCard.reversed_meaning}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TarotPage
