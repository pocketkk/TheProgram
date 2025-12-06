/**
 * Palm Reading Page
 *
 * Main page for palm reading feature with camera capture and AI analysis.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hand,
  Camera,
  History,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { CameraCapture } from './components/CameraCapture'
import { PalmReadingResults } from './components/PalmReadingResults'
import { PalmReadingHistory } from './components/PalmReadingHistory'
import { useAnalyzePalm, useUpdatePalmReading } from './hooks/usePalmReading'
import type { PalmReadingResponse, PalmReadingRecord, HandType } from './types'

type ViewState = 'home' | 'capture' | 'analyzing' | 'results' | 'history' | 'view-reading'

export function PalmReadingPage() {
  const [view, setView] = useState<ViewState>('home')
  const [handType, setHandType] = useState<HandType>('both')
  const [additionalContext, setAdditionalContext] = useState('')
  const [currentReading, setCurrentReading] = useState<PalmReadingResponse | PalmReadingRecord | null>(null)
  const [capturedImage, setCapturedImage] = useState<File | null>(null)

  const analyzeMutation = useAnalyzePalm()
  const updateMutation = useUpdatePalmReading()

  // Handle image capture
  const handleCapture = async (image: File) => {
    setCapturedImage(image)
    setView('analyzing')

    try {
      const result = await analyzeMutation.mutateAsync({
        image,
        handType,
        additionalContext: additionalContext || undefined,
        saveReading: true,
      })

      setCurrentReading(result)
      setView('results')
    } catch (error) {
      console.error('Analysis failed:', error)
      setView('capture')
    }
  }

  // Handle viewing a historical reading
  const handleSelectReading = (reading: PalmReadingRecord) => {
    setCurrentReading(reading)
    setView('view-reading')
  }

  // Handle favorite toggle for current reading
  const handleToggleFavorite = () => {
    if (currentReading && 'id' in currentReading) {
      updateMutation.mutate({
        readingId: currentReading.id,
        data: { is_favorite: !currentReading.is_favorite },
      })
    }
  }

  // Reset to home
  const handleBack = () => {
    if (view === 'results' || view === 'view-reading') {
      setCurrentReading(null)
    }
    setView('home')
    setCapturedImage(null)
  }

  // Start new reading
  const handleStartReading = () => {
    setCurrentReading(null)
    setCapturedImage(null)
    setView('capture')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          {view !== 'home' && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cosmic-600 to-cosmic-500 text-white">
            <Hand className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-gradient-celestial">
              Palm Reading
            </h1>
            <p className="text-gray-400">
              Discover insights through the ancient art of palmistry
            </p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Home View */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Introduction Card */}
            <div className="glass rounded-2xl p-6 bg-gradient-to-br from-cosmic-600/20 to-cosmic-500/10">
              <div className="flex items-start gap-4">
                <Sparkles className="h-8 w-8 text-celestial-gold flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    AI-Powered Palm Analysis
                  </h2>
                  <p className="text-gray-300 leading-relaxed">
                    Hold your palms facing the camera and receive a comprehensive reading
                    that combines traditional palmistry with astrological insights. Our AI
                    analyzes your hand shape, major lines, mounts, and special markings to
                    reveal your unique cosmic blueprint.
                  </p>
                </div>
              </div>
            </div>

            {/* Hand Type Selection */}
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-white mb-4">Select Hand Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['left', 'right', 'both'] as HandType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setHandType(type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      handType === type
                        ? 'border-cosmic-500 bg-cosmic-500/20 text-white'
                        : 'border-cosmic-700 bg-cosmic-800/50 text-gray-400 hover:border-cosmic-600'
                    }`}
                  >
                    <div className="text-center">
                      <Hand
                        className={`h-8 w-8 mx-auto mb-2 ${type === 'left' ? 'scale-x-[-1]' : ''}`}
                      />
                      <span className="capitalize font-medium">{type}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {handType === 'left' &&
                  'Left hand shows inherited traits and inner potential'}
                {handType === 'right' &&
                  'Right hand shows how you manifest your potential'}
                {handType === 'both' &&
                  'Both hands provide the most complete reading'}
              </p>
            </div>

            {/* Optional Context */}
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-white mb-3">
                Additional Context (Optional)
              </h3>
              <textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="Any specific questions or areas of life you'd like insights on..."
                className="w-full p-3 bg-cosmic-800/50 border border-cosmic-700 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cosmic-500"
                rows={3}
                maxLength={500}
              />
              <p className="mt-2 text-xs text-gray-500 text-right">
                {additionalContext.length}/500
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleStartReading}
                size="lg"
                className="flex-1 bg-gradient-to-r from-cosmic-600 to-cosmic-500 py-6"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Palm Reading
              </Button>
              <Button
                onClick={() => setView('history')}
                variant="outline"
                size="lg"
                className="py-6"
              >
                <History className="h-5 w-5 mr-2" />
                History
              </Button>
            </div>

            {/* Tips */}
            <div className="glass rounded-xl p-4 bg-amber-900/20 border border-amber-700/50">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div className="text-sm text-amber-200/80">
                  <p className="font-medium mb-1">For best results:</p>
                  <ul className="space-y-1 text-amber-200/60">
                    <li>Ensure good, even lighting</li>
                    <li>Keep your palm flat with fingers slightly spread</li>
                    <li>Position your palm facing directly at the camera</li>
                    <li>Make sure the entire palm is visible in frame</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Camera Capture View */}
        {view === 'capture' && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CameraCapture
              onCapture={handleCapture}
              onCancel={() => setView('home')}
              instructions={`Position your ${handType === 'both' ? 'palms' : `${handType} palm`} facing the camera with fingers spread. Ensure good lighting.`}
            />
          </motion.div>
        )}

        {/* Analyzing View */}
        {view === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <div className="glass rounded-2xl p-12 max-w-md mx-auto">
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="inline-block mb-6"
              >
                <Sparkles className="h-16 w-16 text-celestial-gold" />
              </motion.div>
              <h2 className="text-2xl font-heading font-bold text-white mb-3">
                Reading Your Palm...
              </h2>
              <p className="text-gray-400 mb-6">
                Our AI is analyzing your palm lines, mounts, and features to create
                a personalized reading with astrological insights.
              </p>
              <Spinner size="lg" />
              <p className="mt-4 text-sm text-gray-500">
                This may take up to a minute...
              </p>

              {analyzeMutation.isError && (
                <div className="mt-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <p className="text-red-300">
                    Analysis failed. Please try again.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView('capture')}
                    className="mt-3"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Results View */}
        {view === 'results' && currentReading && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass rounded-2xl p-6 bg-gradient-to-br from-emerald-600/20 to-emerald-500/10 border border-emerald-700/50">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">
                  Your Palm Reading is Ready
                </h2>
              </div>
            </div>

            <PalmReadingResults
              reading={currentReading}
              onToggleFavorite={
                'id' in currentReading ? handleToggleFavorite : undefined
              }
              isFavorite={
                'id' in currentReading ? currentReading.is_favorite : false
              }
            />

            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleStartReading}>
                <Camera className="h-4 w-4 mr-2" />
                New Reading
              </Button>
              <Button variant="outline" onClick={() => setView('history')}>
                <History className="h-4 w-4 mr-2" />
                View History
              </Button>
            </div>
          </motion.div>
        )}

        {/* History View */}
        {view === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PalmReadingHistory onSelectReading={handleSelectReading} />
          </motion.div>
        )}

        {/* View Historical Reading */}
        {view === 'view-reading' && currentReading && (
          <motion.div
            key="view-reading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PalmReadingResults
              reading={currentReading}
              onToggleFavorite={
                'id' in currentReading ? handleToggleFavorite : undefined
              }
              isFavorite={
                'id' in currentReading ? currentReading.is_favorite : false
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
