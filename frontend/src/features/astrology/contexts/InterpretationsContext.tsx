/**
 * Chart Interpretations Context
 *
 * Provides AI-generated interpretations to child components
 */

import { createContext, useContext, ReactNode } from 'react'
import { useChartInterpretations } from '../hooks/useChartInterpretations'
import type { ChartInterpretation, ElementType } from '@/types/interpretation'

interface InterpretationsContextValue {
  interpretations: Map<string, ChartInterpretation>
  isLoading: boolean
  error: Error | null
  fetchInterpretations: () => Promise<void>
  generateInterpretations: (elementTypes?: ElementType[]) => Promise<void>
  getInterpretationFor: (elementType: ElementType, elementKey: string) => ChartInterpretation | undefined
}

const InterpretationsContext = createContext<InterpretationsContextValue | null>(null)

interface InterpretationsProviderProps {
  chartId: string | null
  zodiacSystem?: string  // Triggers refetch when zodiac system changes
  children: ReactNode
}

export function InterpretationsProvider({ chartId, zodiacSystem, children }: InterpretationsProviderProps) {
  const interpretationsData = useChartInterpretations({ chartId, zodiacSystem, autoFetch: true })

  return (
    <InterpretationsContext.Provider value={interpretationsData}>
      {children}
    </InterpretationsContext.Provider>
  )
}

export function useInterpretations() {
  const context = useContext(InterpretationsContext)
  if (!context) {
    throw new Error('useInterpretations must be used within InterpretationsProvider')
  }
  return context
}
