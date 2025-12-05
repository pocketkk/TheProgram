/**
 * BatchProgress Component - Real-time progress display for batch generation
 */
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Pause, Play, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import type { BatchProgressUpdate } from '@/types/image'

interface BatchProgressProps {
  progress: BatchProgressUpdate | null
  generatedImages: Array<{ key: string; url: string }>
  isPaused: boolean
  isGenerating: boolean
  error?: string | null
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}

export function BatchProgress({
  progress,
  generatedImages,
  isPaused,
  isGenerating,
  error,
  onPause,
  onResume,
  onCancel,
}: BatchProgressProps) {
  // Show error state
  if (error && !isGenerating) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Generation Failed</h3>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isGenerating && !progress) {
    return null
  }

  const percentage = progress?.percentage || 0
  const current = progress?.current || 0
  const total = progress?.total || 0
  const isComplete = current === total && total > 0

  return (
    <Card className="border-celestial-purple/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-celestial-purple" />
            <span>Batch Generation Progress</span>
          </div>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <>
                {isPaused ? (
                  <Button size="sm" variant="outline" onClick={onResume}>
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={onPause}>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">
              {isComplete ? 'Complete!' : isPaused ? 'Paused' : 'Generating...'}
            </span>
            <span className="text-celestial-purple font-semibold">
              {current} / {total} cards
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 transition-all duration-500 ${
                isComplete
                  ? 'bg-green-500'
                  : isPaused
                  ? 'bg-yellow-500'
                  : 'bg-gradient-to-r from-celestial-purple to-celestial-pink'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-center text-xs text-gray-400 mt-1">
            {percentage.toFixed(1)}%
          </div>
        </div>

        {/* Current Item */}
        {progress && !isComplete && (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-start gap-3">
              {progress.status === 'generating' && (
                <div className="w-5 h-5 border-3 border-celestial-purple border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
              )}
              {progress.status === 'complete' && (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
              {progress.status === 'failed' && (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{progress.item_name}</p>
                {progress.error && (
                  <p className="text-xs text-red-400 mt-1">{progress.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-green-500 font-semibold">
              All {total} cards generated successfully!
            </p>
          </div>
        )}

        {/* Recent Images Preview */}
        {generatedImages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Recently Generated</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {generatedImages.slice(-12).map((img, idx) => (
                <div
                  key={`${img.key}-${idx}`}
                  className="aspect-[2/3] rounded overflow-hidden bg-gray-800 border border-gray-700"
                >
                  <img
                    src={img.url}
                    alt={img.key}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
