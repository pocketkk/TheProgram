/**
 * Myers-Briggs type definitions
 */

export type MBViewMode = 'overview' | 'dichotomies' | 'cognitive' | 'reading'

export interface Selection {
  type: 'none' | 'dichotomy' | 'function'
  id: string | null
}

// Re-export API types for convenience
export type {
  MBTypeResponse,
  MBTypeInfo,
  MBFullReadingResponse,
  DichotomyScore,
  CognitiveFunction,
  AstrologicalCorrelation,
  MBDichotomyInfo,
} from '@/lib/api/myersBriggs'
