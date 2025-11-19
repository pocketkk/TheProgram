/**
 * Progressed Chart Calculator (Secondary Progressions)
 *
 * Secondary progressions: 1 day after birth = 1 year of life
 * This is one of the most important predictive techniques in astrology
 */

import type { BirthData, BirthChart } from '../types'
import { calculateBirthChart } from '../calculator'

export interface ProgressedChartParams {
  natalData: BirthData
  currentDate?: Date
}

/**
 * Calculate the number of days to progress based on age
 *
 * @param birthDate - Birth date
 * @param currentDate - Current date (default: now)
 * @returns Number of days to add to birth date for calculation
 */
function calculateProgressionDays(birthDate: Date, currentDate: Date = new Date()): number {
  // Calculate age in years (decimal)
  const millisPerYear = 365.25 * 24 * 60 * 60 * 1000
  const ageInYears = (currentDate.getTime() - birthDate.getTime()) / millisPerYear

  // In secondary progressions, 1 day = 1 year
  // So add same number of days as years lived
  return ageInYears
}

/**
 * Calculate progressed chart using secondary progressions
 *
 * The progressed chart shows symbolic development over time
 * Formula: Add one day for each year lived to the birth date
 *
 * @param params - Progressed chart parameters
 * @returns Birth chart calculated for the progressed date
 */
export function calculateProgressedChart(params: ProgressedChartParams): BirthChart {
  const { natalData, currentDate = new Date() } = params

  // Calculate how many days to progress
  const daysToProgress = calculateProgressionDays(natalData.date, currentDate)

  // Create progressed calculation date
  // This is birth date + days equal to years lived
  const progressedDate = new Date(natalData.date)
  progressedDate.setDate(progressedDate.getDate() + Math.floor(daysToProgress))

  // Also add fractional day (hours/minutes) for precision
  const fractionalDay = daysToProgress - Math.floor(daysToProgress)
  const millisecondsToAdd = fractionalDay * 24 * 60 * 60 * 1000
  progressedDate.setTime(progressedDate.getTime() + millisecondsToAdd)

  // Calculate chart for progressed date at natal location
  // (Progressed chart uses natal location, not current location)
  const progressedChart = calculateBirthChart({
    date: progressedDate,
    latitude: natalData.latitude,
    longitude: natalData.longitude,
  })

  // Add metadata about progression
  return {
    ...progressedChart,
    birthData: {
      ...natalData,
      date: currentDate, // Store current date for reference
    },
  }
}

/**
 * Calculate progressed chart for current moment
 * Convenience function for "right now" progressions
 */
export function calculateCurrentProgressions(natalData: BirthData): BirthChart {
  return calculateProgressedChart({
    natalData,
    currentDate: new Date(),
  })
}

/**
 * Calculate progressed chart for specific date
 * Useful for checking progressions at any point in life
 */
export function calculateProgressedForDate(natalData: BirthData, date: Date): BirthChart {
  return calculateProgressedChart({
    natalData,
    currentDate: date,
  })
}

/**
 * Get progressed age for display
 *
 * @param natalData - Birth data
 * @param currentDate - Current date (default: now)
 * @returns Formatted age string
 */
export function getProgressedAge(natalData: BirthData, currentDate: Date = new Date()): string {
  const daysProgressed = calculateProgressionDays(natalData.date, currentDate)
  const years = Math.floor(daysProgressed)
  const months = Math.floor((daysProgressed - years) * 12)

  return `${years} years, ${months} months`
}

/**
 * Calculate progressed Moon position (moves ~1° per month)
 * This is the fastest moving progressed point and very important
 *
 * @param natalData - Birth data
 * @param currentDate - Current date (default: now)
 * @returns Progressed Moon information
 */
export function getProgressedMoonInfo(natalData: BirthData, currentDate: Date = new Date()) {
  const progressedChart = calculateProgressedChart({ natalData, currentDate })
  const progressedMoon = progressedChart.planets.find(p => p.name === 'Moon')

  if (!progressedMoon) return null

  // Calculate how long until progressed Moon changes sign
  // Moon progresses ~1° per month = 30° per 30 months = 2.5 years per sign
  const degreesInSign = progressedMoon.degree
  const degreesRemaining = 30 - degreesInSign
  const monthsUntilSignChange = degreesRemaining * 30 // 1° = 30 days = ~1 month

  return {
    planet: progressedMoon,
    monthsUntilSignChange: Math.floor(monthsUntilSignChange),
    progressionRate: '1° per month (approximately)',
  }
}
