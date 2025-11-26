/**
 * Chart Store - Hybrid Chart Features Tests
 *
 * Tests for multi-tradition astrology settings:
 * - Zodiac system switching (Western, Vedic, Human Design)
 * - Ayanamsa selection for Vedic charts
 * - House system selection
 * - Hybrid options (nakshatras in Western, aspects in Vedic)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useChartStore } from '../chartStore'
import type { ZodiacSystem, AyanamsaSystem, HouseSystem } from '../chartStore'

describe('Chart Store - Hybrid Chart Features', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChartStore.setState({
      zodiacSystem: 'western',
      ayanamsa: 'lahiri',
      houseSystem: 'placidus',
      includeNakshatras: false,
      includeWesternAspects: false,
      includeMinorAspects: true,
    })
  })

  describe('Zodiac System', () => {
    it('should default to western zodiac system', () => {
      const { zodiacSystem } = useChartStore.getState()
      expect(zodiacSystem).toBe('western')
    })

    it('should switch to vedic zodiac system', () => {
      useChartStore.getState().setZodiacSystem('vedic')
      const { zodiacSystem } = useChartStore.getState()
      expect(zodiacSystem).toBe('vedic')
    })

    it('should switch to human-design zodiac system', () => {
      useChartStore.getState().setZodiacSystem('human-design')
      const { zodiacSystem } = useChartStore.getState()
      expect(zodiacSystem).toBe('human-design')
    })

    it('should support all zodiac systems', () => {
      const systems: ZodiacSystem[] = ['western', 'vedic', 'human-design']
      systems.forEach(system => {
        useChartStore.getState().setZodiacSystem(system)
        expect(useChartStore.getState().zodiacSystem).toBe(system)
      })
    })
  })

  describe('Ayanamsa System', () => {
    it('should default to lahiri ayanamsa', () => {
      const { ayanamsa } = useChartStore.getState()
      expect(ayanamsa).toBe('lahiri')
    })

    it('should switch ayanamsa system', () => {
      const ayanamsaSystems: AyanamsaSystem[] = [
        'lahiri',
        'raman',
        'krishnamurti',
        'yukteshwar',
        'jn_bhasin',
        'fagan_bradley',
        'true_chitrapaksha',
        'true_revati',
        'true_pushya',
      ]

      ayanamsaSystems.forEach(system => {
        useChartStore.getState().setAyanamsa(system)
        expect(useChartStore.getState().ayanamsa).toBe(system)
      })
    })

    it('should persist ayanamsa when switching zodiac systems', () => {
      useChartStore.getState().setAyanamsa('raman')
      useChartStore.getState().setZodiacSystem('western')
      useChartStore.getState().setZodiacSystem('vedic')
      expect(useChartStore.getState().ayanamsa).toBe('raman')
    })
  })

  describe('House System', () => {
    it('should default to placidus house system', () => {
      const { houseSystem } = useChartStore.getState()
      expect(houseSystem).toBe('placidus')
    })

    it('should switch house system', () => {
      const houseSystems: HouseSystem[] = [
        'placidus',
        'koch',
        'whole_sign',
        'equal',
        'campanus',
        'regiomontanus',
        'porphyry',
        'morinus',
      ]

      houseSystems.forEach(system => {
        useChartStore.getState().setHouseSystem(system)
        expect(useChartStore.getState().houseSystem).toBe(system)
      })
    })
  })

  describe('Hybrid Options - Nakshatras in Western', () => {
    it('should default to not including nakshatras', () => {
      const { includeNakshatras } = useChartStore.getState()
      expect(includeNakshatras).toBe(false)
    })

    it('should enable nakshatras in Western charts', () => {
      useChartStore.getState().setIncludeNakshatras(true)
      const { includeNakshatras } = useChartStore.getState()
      expect(includeNakshatras).toBe(true)
    })

    it('should disable nakshatras', () => {
      useChartStore.getState().setIncludeNakshatras(true)
      useChartStore.getState().setIncludeNakshatras(false)
      const { includeNakshatras } = useChartStore.getState()
      expect(includeNakshatras).toBe(false)
    })
  })

  describe('Hybrid Options - Western Aspects in Vedic', () => {
    it('should default to not including Western aspects', () => {
      const { includeWesternAspects } = useChartStore.getState()
      expect(includeWesternAspects).toBe(false)
    })

    it('should enable Western aspects in Vedic charts', () => {
      useChartStore.getState().setIncludeWesternAspects(true)
      const { includeWesternAspects } = useChartStore.getState()
      expect(includeWesternAspects).toBe(true)
    })

    it('should disable Western aspects', () => {
      useChartStore.getState().setIncludeWesternAspects(true)
      useChartStore.getState().setIncludeWesternAspects(false)
      const { includeWesternAspects } = useChartStore.getState()
      expect(includeWesternAspects).toBe(false)
    })
  })

  describe('Hybrid Options - Minor Aspects', () => {
    it('should default to including minor aspects', () => {
      const { includeMinorAspects } = useChartStore.getState()
      expect(includeMinorAspects).toBe(true)
    })

    it('should disable minor aspects', () => {
      useChartStore.getState().setIncludeMinorAspects(false)
      const { includeMinorAspects } = useChartStore.getState()
      expect(includeMinorAspects).toBe(false)
    })

    it('should enable minor aspects', () => {
      useChartStore.getState().setIncludeMinorAspects(false)
      useChartStore.getState().setIncludeMinorAspects(true)
      const { includeMinorAspects } = useChartStore.getState()
      expect(includeMinorAspects).toBe(true)
    })
  })

  describe('Combined Settings', () => {
    it('should allow Vedic system with all hybrid options', () => {
      const store = useChartStore.getState()
      store.setZodiacSystem('vedic')
      store.setAyanamsa('krishnamurti')
      store.setHouseSystem('whole_sign')
      store.setIncludeWesternAspects(true)
      store.setIncludeMinorAspects(true)

      const state = useChartStore.getState()
      expect(state.zodiacSystem).toBe('vedic')
      expect(state.ayanamsa).toBe('krishnamurti')
      expect(state.houseSystem).toBe('whole_sign')
      expect(state.includeWesternAspects).toBe(true)
      expect(state.includeMinorAspects).toBe(true)
    })

    it('should allow Western system with nakshatras', () => {
      const store = useChartStore.getState()
      store.setZodiacSystem('western')
      store.setHouseSystem('koch')
      store.setIncludeNakshatras(true)
      store.setIncludeMinorAspects(false)

      const state = useChartStore.getState()
      expect(state.zodiacSystem).toBe('western')
      expect(state.houseSystem).toBe('koch')
      expect(state.includeNakshatras).toBe(true)
      expect(state.includeMinorAspects).toBe(false)
    })

    it('should preserve all settings independently', () => {
      const store = useChartStore.getState()

      // Set everything
      store.setZodiacSystem('vedic')
      store.setAyanamsa('raman')
      store.setHouseSystem('equal')
      store.setIncludeNakshatras(true)
      store.setIncludeWesternAspects(true)
      store.setIncludeMinorAspects(false)

      // Change one thing
      store.setHouseSystem('campanus')

      // Verify others unchanged
      const state = useChartStore.getState()
      expect(state.zodiacSystem).toBe('vedic')
      expect(state.ayanamsa).toBe('raman')
      expect(state.houseSystem).toBe('campanus')
      expect(state.includeNakshatras).toBe(true)
      expect(state.includeWesternAspects).toBe(true)
      expect(state.includeMinorAspects).toBe(false)
    })
  })
})
