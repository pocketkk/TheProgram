/**
 * Generate Interpretations Button
 * Context-aware button that changes size based on whether interpretations exist
 */

import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui'
import { useInterpretations } from '../contexts/InterpretationsContext'

interface GenerateInterpretationsButtonProps {
  onClick: () => Promise<void>
  isGenerating: boolean
  hasSavedChart: boolean
}

export function GenerateInterpretationsButton({
  onClick,
  isGenerating,
  hasSavedChart,
}: GenerateInterpretationsButtonProps) {
  const { interpretations, fetchInterpretations } = useInterpretations()

  const handleClick = async () => {
    await onClick()
    // Refetch interpretations after generation completes
    await fetchInterpretations()
  }

  // Show compact version when interpretations exist
  if (interpretations.size > 0) {
    return (
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-cosmic-400 hover:text-cosmic-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Regenerating...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            <span>Regenerate Interpretations</span>
          </>
        )}
      </button>
    )
  }

  // Show full prominent button when no interpretations
  return (
    <Button
      onClick={handleClick}
      disabled={isGenerating}
      variant="primary"
      className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
          Generating AI Interpretations...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 inline mr-2" />
          {hasSavedChart ? 'Regenerate Interpretations' : 'Generate AI Interpretations'}
        </>
      )}
    </Button>
  )
}
