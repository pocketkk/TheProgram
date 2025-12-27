/**
 * Transit Widget Types
 */

export interface TransitSummary {
  moonSign: string
  sunSign: string
  activeTransits: number
  significantTransits: string[] // e.g., ["Saturn square Sun", "Jupiter trine Moon"]
}
