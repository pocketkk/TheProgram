/**
 * Chart Type Calculation Pipeline
 * Handles different astrological chart types with shared logic
 */

import type { BirthData, BirthChart, PlanetPosition } from './types'
import { calculateBirthChart } from './calculator'

export interface ChartCalculator {
  type: string
  calculate: (params: ChartCalculationParams) => BirthChart
  description: string
}

export interface ChartCalculationParams {
  natal?: BirthData
  transit?: Date
  progressed?: Date
  partner?: BirthData
  options?: ChartOptions
}

export interface ChartOptions {
  houseSystem?: 'Placidus' | 'Koch' | 'Equal' | 'Whole Sign' | 'Campanus' | 'Regiomontanus'
  zodiacType?: 'Tropical' | 'Sidereal'
  aspectOrbs?: Record<string, number>
  includeChiron?: boolean
  includeNodes?: boolean
  includeAsteroids?: boolean
}

/**
 * Base calculator with shared logic
 */
abstract class BaseChartCalculator implements ChartCalculator {
  abstract type: string
  abstract description: string

  abstract calculate(params: ChartCalculationParams): BirthChart

  protected applyOptions(chart: BirthChart, options?: ChartOptions): BirthChart {
    if (!options) return chart

    // Apply option modifications
    let modifiedChart = { ...chart }

    // Adjust aspect orbs if specified
    if (options.aspectOrbs) {
      // Filter aspects based on custom orbs
      // This would recalculate aspects with new orb values
    }

    return modifiedChart
  }
}

/**
 * Natal Chart Calculator
 */
class NatalChartCalculator extends BaseChartCalculator {
  type = 'natal'
  description = 'Birth chart calculated for moment of birth'

  calculate(params: ChartCalculationParams): BirthChart {
    if (!params.natal) {
      throw new Error('Natal data required for natal chart')
    }

    const chart = calculateBirthChart(params.natal)
    return this.applyOptions(chart, params.options)
  }
}

/**
 * Transit Chart Calculator
 * Shows current planetary positions relative to natal chart
 */
class TransitChartCalculator extends BaseChartCalculator {
  type = 'transit'
  description = 'Current planetary positions overlaid on natal chart'

  calculate(params: ChartCalculationParams): BirthChart {
    if (!params.natal) {
      throw new Error('Natal data required for transit chart')
    }

    const transitDate = params.transit || new Date()

    // Calculate transit positions for current/specified date
    const transitChart = calculateBirthChart({
      date: transitDate,
      latitude: params.natal.latitude,
      longitude: params.natal.longitude,
    })

    // For transits, we keep the natal houses but show transit planets
    const natalChart = calculateBirthChart(params.natal)

    return {
      ...transitChart,
      houses: natalChart.houses, // Use natal houses
      ascendant: natalChart.ascendant,
      midheaven: natalChart.midheaven,
      descendant: natalChart.descendant,
      ic: natalChart.ic,
    }
  }
}

/**
 * Progressed Chart Calculator
 * Secondary progressions (1 day = 1 year)
 */
class ProgressedChartCalculator extends BaseChartCalculator {
  type = 'progressed'
  description = 'Secondary progressions showing psychological evolution'

  calculate(params: ChartCalculationParams): BirthChart {
    if (!params.natal) {
      throw new Error('Natal data required for progressed chart')
    }

    const progressedDate = params.progressed || new Date()

    // Calculate years since birth
    const birthDate = params.natal.date
    const yearsSinceBirth =
      (progressedDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    // Add days equal to years (1 day = 1 year)
    const progressedCalcDate = new Date(birthDate)
    progressedCalcDate.setDate(progressedCalcDate.getDate() + Math.floor(yearsSinceBirth))

    // Calculate chart for progressed date
    const progressedChart = calculateBirthChart({
      date: progressedCalcDate,
      latitude: params.natal.latitude,
      longitude: params.natal.longitude,
    })

    return this.applyOptions(progressedChart, params.options)
  }
}

/**
 * Synastry Chart Calculator
 * Compares two natal charts for relationship analysis
 */
class SynastryChartCalculator extends BaseChartCalculator {
  type = 'synastry'
  description = 'Relationship chart comparing two birth charts'

  calculate(params: ChartCalculationParams): BirthChart {
    if (!params.natal || !params.partner) {
      throw new Error('Both natal and partner data required for synastry')
    }

    // Calculate both charts
    const chart1 = calculateBirthChart(params.natal)
    const chart2 = calculateBirthChart(params.partner)

    // For synastry, we combine planets but use first person's houses
    const combinedPlanets: PlanetPosition[] = [
      ...chart1.planets.map(p => ({ ...p, name: `${p.name}₁` })),
      ...chart2.planets.map(p => ({ ...p, name: `${p.name}₂` })),
    ]

    // Calculate inter-chart aspects
    // This would need a special aspect calculator for cross-chart aspects

    return {
      birthData: params.natal,
      planets: combinedPlanets,
      houses: chart1.houses,
      aspects: [...chart1.aspects, ...chart2.aspects], // Simplified
      ascendant: chart1.ascendant,
      midheaven: chart1.midheaven,
      descendant: chart1.descendant,
      ic: chart1.ic,
    }
  }
}

/**
 * Composite Chart Calculator
 * Midpoint chart between two people
 */
class CompositeChartCalculator extends BaseChartCalculator {
  type = 'composite'
  description = 'Midpoint chart representing the relationship itself'

  calculate(params: ChartCalculationParams): BirthChart {
    if (!params.natal || !params.partner) {
      throw new Error('Both natal and partner data required for composite')
    }

    const chart1 = calculateBirthChart(params.natal)
    const chart2 = calculateBirthChart(params.partner)

    // Calculate midpoints for all planets
    const compositePlanets: PlanetPosition[] = chart1.planets.map((p1, index) => {
      const p2 = chart2.planets[index]

      // Calculate midpoint longitude
      let midpointLon = (p1.longitude + p2.longitude) / 2

      // Handle wrap-around at 360°
      if (Math.abs(p1.longitude - p2.longitude) > 180) {
        midpointLon = ((p1.longitude + p2.longitude + 360) / 2) % 360
      }

      return {
        ...p1,
        longitude: midpointLon,
        latitude: (p1.latitude + p2.latitude) / 2,
        distance: (p1.distance + p2.distance) / 2,
        speed: (p1.speed + p2.speed) / 2,
        isRetrograde: p1.isRetrograde || p2.isRetrograde,
      }
    })

    // Calculate composite midpoint for location and time
    const compositeLat = (params.natal.latitude + params.partner.latitude) / 2
    const compositeLon = (params.natal.longitude + params.partner.longitude) / 2
    const compositeTime = new Date(
      (params.natal.date.getTime() + params.partner.date.getTime()) / 2
    )

    // Calculate houses for composite location
    const compositeChart = calculateBirthChart({
      date: compositeTime,
      latitude: compositeLat,
      longitude: compositeLon,
    })

    return {
      ...compositeChart,
      planets: compositePlanets,
    }
  }
}

/**
 * Solar Return Chart Calculator
 * Chart for when Sun returns to exact natal position
 */
class SolarReturnChartCalculator extends BaseChartCalculator {
  type = 'solar-return'
  description = 'Chart for the year when Sun returns to natal position'

  calculate(params: ChartCalculationParams): BirthChart {
    if (!params.natal) {
      throw new Error('Natal data required for solar return')
    }

    // Get natal sun position
    const natalChart = calculateBirthChart(params.natal)
    const natalSunLongitude = natalChart.planets.find(p => p.name === 'Sun')?.longitude || 0

    // Find date when current year's Sun returns to natal position
    // This is an approximation - would need iterative calculation for precision
    const currentYear = new Date().getFullYear()
    const birthMonth = params.natal.date.getMonth()
    const birthDay = params.natal.date.getDate()

    const solarReturnDate = new Date(currentYear, birthMonth, birthDay)

    const solarReturnChart = calculateBirthChart({
      date: solarReturnDate,
      latitude: params.natal.latitude,
      longitude: params.natal.longitude,
    })

    return this.applyOptions(solarReturnChart, params.options)
  }
}

/**
 * Chart Calculator Registry
 */
export class ChartCalculatorRegistry {
  private calculators: Map<string, ChartCalculator>

  constructor() {
    this.calculators = new Map()
    this.registerDefaultCalculators()
  }

  private registerDefaultCalculators() {
    this.register(new NatalChartCalculator())
    this.register(new TransitChartCalculator())
    this.register(new ProgressedChartCalculator())
    this.register(new SynastryChartCalculator())
    this.register(new CompositeChartCalculator())
    this.register(new SolarReturnChartCalculator())
  }

  register(calculator: ChartCalculator) {
    this.calculators.set(calculator.type, calculator)
  }

  get(type: string): ChartCalculator | undefined {
    return this.calculators.get(type)
  }

  calculate(type: string, params: ChartCalculationParams): BirthChart {
    const calculator = this.get(type)
    if (!calculator) {
      throw new Error(`No calculator registered for chart type: ${type}`)
    }
    return calculator.calculate(params)
  }

  getAvailableTypes(): string[] {
    return Array.from(this.calculators.keys())
  }
}

// Export singleton instance
export const chartRegistry = new ChartCalculatorRegistry()
