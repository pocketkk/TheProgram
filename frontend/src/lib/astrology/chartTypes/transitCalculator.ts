/**
 * Transit Chart Calculator
 *
 * Calculates current planetary positions over natal houses
 * Transit charts show where planets are NOW in relation to your birth chart
 */

import type { BirthData, BirthChart } from '../types'
import { calculatePlanetPositions, assignHousesToPlanets, calculateBirthChart } from '../calculator'

export interface TransitChartParams {
  natalData: BirthData
  transitDate?: Date
}

/**
 * Calculate transit chart
 *
 * Transit planets are calculated for the transit date (default: now)
 * Houses remain fixed to natal chart (transits move through natal houses)
 *
 * @param params - Transit chart parameters
 * @returns Birth chart with transit planet positions and natal houses
 */
export function calculateTransitChart(params: TransitChartParams): BirthChart {
  const { natalData, transitDate = new Date() } = params

  // Calculate natal chart to get houses
  const natalChart = calculateBirthChart(natalData)

  // Calculate current planet positions at transit date
  const transitPlanets = calculatePlanetPositions(transitDate)

  // Assign transit planets to NATAL houses
  // (This is key: houses don't move, planets transit through them)
  const planetsWithHouses = assignHousesToPlanets(transitPlanets, natalChart.houses)

  // Return chart with transit planets but natal houses
  return {
    ...natalChart,
    planets: planetsWithHouses,
    birthData: {
      ...natalData,
      date: transitDate, // Store transit date for reference
    },
    // Keep natal houses and angles (they don't change)
  }
}

/**
 * Calculate transit chart for current moment
 * Convenience function for "right now" transits
 */
export function calculateCurrentTransits(natalData: BirthData): BirthChart {
  return calculateTransitChart({
    natalData,
    transitDate: new Date(),
  })
}

/**
 * Calculate transit chart for specific date
 */
export function calculateTransitForDate(natalData: BirthData, date: Date): BirthChart {
  return calculateTransitChart({
    natalData,
    transitDate: date,
  })
}
