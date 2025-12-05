/**
 * Coloring Book Types Tests
 *
 * Tests for type constants and presets
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TOOL_SETTINGS,
  BRUSH_PRESETS,
  COLOR_PALETTES,
  COLORING_THEMES,
} from '../types'

describe('Default Tool Settings', () => {
  it('should have all required properties', () => {
    expect(DEFAULT_TOOL_SETTINGS.tool).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.color).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.size).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.opacity).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.hardness).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.flow).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.spacing).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.pressure).toBeDefined()
    expect(DEFAULT_TOOL_SETTINGS.smoothing).toBeDefined()
  })

  it('should have valid default values', () => {
    expect(DEFAULT_TOOL_SETTINGS.tool).toBe('brush')
    expect(DEFAULT_TOOL_SETTINGS.color).toMatch(/^#[0-9A-F]{6}$/i)
    expect(DEFAULT_TOOL_SETTINGS.size).toBeGreaterThan(0)
    expect(DEFAULT_TOOL_SETTINGS.opacity).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_TOOL_SETTINGS.opacity).toBeLessThanOrEqual(100)
    expect(DEFAULT_TOOL_SETTINGS.hardness).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_TOOL_SETTINGS.hardness).toBeLessThanOrEqual(100)
  })
})

describe('Brush Presets', () => {
  it('should have multiple presets', () => {
    expect(BRUSH_PRESETS.length).toBeGreaterThan(0)
  })

  it('should have required properties for each preset', () => {
    BRUSH_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined()
      expect(preset.name).toBeDefined()
      expect(preset.tool).toBeDefined()
      expect(preset.settings).toBeDefined()
    })
  })

  it('should have unique IDs', () => {
    const ids = BRUSH_PRESETS.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should include essential brush types', () => {
    const presetNames = BRUSH_PRESETS.map((p) => p.name.toLowerCase())

    expect(presetNames.some((n) => n.includes('brush'))).toBe(true)
    expect(presetNames.some((n) => n.includes('pen'))).toBe(true)
    expect(presetNames.some((n) => n.includes('pencil'))).toBe(true)
  })
})

describe('Color Palettes', () => {
  it('should have multiple palettes', () => {
    expect(COLOR_PALETTES.length).toBeGreaterThan(0)
  })

  it('should have required properties for each palette', () => {
    COLOR_PALETTES.forEach((palette) => {
      expect(palette.id).toBeDefined()
      expect(palette.name).toBeDefined()
      expect(palette.colors).toBeDefined()
      expect(Array.isArray(palette.colors)).toBe(true)
    })
  })

  it('should have unique IDs', () => {
    const ids = COLOR_PALETTES.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have valid hex colors', () => {
    const hexRegex = /^#[0-9A-F]{6}$/i

    COLOR_PALETTES.forEach((palette) => {
      palette.colors.forEach((color) => {
        expect(color).toMatch(hexRegex)
      })
    })
  })

  it('should have a reasonable number of colors per palette', () => {
    COLOR_PALETTES.forEach((palette) => {
      expect(palette.colors.length).toBeGreaterThanOrEqual(6)
      expect(palette.colors.length).toBeLessThanOrEqual(20)
    })
  })

  it('should include essential palette types', () => {
    const paletteIds = COLOR_PALETTES.map((p) => p.id)

    expect(paletteIds).toContain('rainbow')
    expect(paletteIds).toContain('pastel')
    expect(paletteIds).toContain('neutral')
  })
})

describe('Coloring Themes', () => {
  it('should have multiple themes', () => {
    expect(COLORING_THEMES.length).toBeGreaterThan(0)
  })

  it('should have required properties for each theme', () => {
    COLORING_THEMES.forEach((theme) => {
      expect(theme.id).toBeDefined()
      expect(theme.name).toBeDefined()
      expect(theme.icon).toBeDefined()
    })
  })

  it('should have unique IDs', () => {
    const ids = COLORING_THEMES.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should include expected themes', () => {
    const themeIds = COLORING_THEMES.map((t) => t.id)

    expect(themeIds).toContain('mandala')
    expect(themeIds).toContain('nature')
    expect(themeIds).toContain('cosmic')
    expect(themeIds).toContain('animals')
  })
})
