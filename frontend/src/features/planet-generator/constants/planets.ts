/**
 * Planet definitions for image generation
 *
 * Full Set (15 celestial bodies):
 * - Personal planets (Sun, Moon, Mercury, Venus, Mars)
 * - Social planets (Jupiter, Saturn)
 * - Transpersonal planets (Uranus, Neptune, Pluto)
 * - Points & asteroids (Chiron, North Node, South Node, Lilith, Part of Fortune)
 */

export interface Planet {
  key: string
  name: string
  category: 'personal' | 'social' | 'transpersonal' | 'point'
  defaultPrompt: string
}

// Planet prompts are self-contained descriptions of WHAT to generate
// Style, composition, and frame are controlled separately via collection settings
// This allows full flexibility for astronomical, mythological, or hybrid approaches

export const PLANETS: Planet[] = [
  // Personal planets
  {
    key: 'sun',
    name: 'Sun',
    category: 'personal',
    defaultPrompt: 'The Sun, radiant golden-orange star, brilliant corona of solar flares, plasma eruptions, intense warm light radiating outward, solar prominences',
  },
  {
    key: 'moon',
    name: 'Moon',
    category: 'personal',
    defaultPrompt: 'Earth\'s Moon, silver-grey sphere with visible craters and maria, soft ethereal glow, partially illuminated showing phases, subtle blue-grey surface details',
  },
  {
    key: 'mercury',
    name: 'Mercury',
    category: 'personal',
    defaultPrompt: 'Planet Mercury, small grey cratered sphere, heavily pockmarked surface, quicksilver metallic sheen',
  },
  {
    key: 'venus',
    name: 'Venus',
    category: 'personal',
    defaultPrompt: 'Planet Venus, pale yellow-white sphere, thick swirling cloud atmosphere, bright morning star appearance',
  },
  {
    key: 'mars',
    name: 'Mars',
    category: 'personal',
    defaultPrompt: 'Planet Mars, rust-red sphere, iron oxide surface, visible Olympus Mons, polar ice caps, dusty red-orange terrain',
  },

  // Social planets
  {
    key: 'jupiter',
    name: 'Jupiter',
    category: 'social',
    defaultPrompt: 'Planet Jupiter, massive gas giant, distinctive orange and cream horizontal bands, Great Red Spot storm visible, swirling atmospheric patterns',
  },
  {
    key: 'saturn',
    name: 'Saturn',
    category: 'social',
    defaultPrompt: 'Planet Saturn, pale gold sphere with iconic ring system, multiple distinct rings of ice and rock, banded atmosphere, Cassini Division visible',
  },

  // Transpersonal planets
  {
    key: 'uranus',
    name: 'Uranus',
    category: 'transpersonal',
    defaultPrompt: 'Planet Uranus, pale cyan-blue ice giant, tilted on its side, faint ring system, smooth methane atmosphere',
  },
  {
    key: 'neptune',
    name: 'Neptune',
    category: 'transpersonal',
    defaultPrompt: 'Planet Neptune, vivid deep blue sphere, Great Dark Spot, wispy white methane clouds, faint rings',
  },
  {
    key: 'pluto',
    name: 'Pluto',
    category: 'transpersonal',
    defaultPrompt: 'Dwarf planet Pluto, small tan and reddish sphere, heart-shaped Tombaugh Regio, distant frozen world',
  },

  // Points & asteroids
  {
    key: 'chiron',
    name: 'Chiron',
    category: 'point',
    defaultPrompt: 'Chiron, small irregular rocky asteroid body, icy surface with cracks, comet-like coma halo',
  },
  {
    key: 'north_node',
    name: 'North Node',
    category: 'point',
    defaultPrompt: 'North Node, glowing celestial point, ascending golden light, ethereal energy spiral, cosmic crossroads',
  },
  {
    key: 'south_node',
    name: 'South Node',
    category: 'point',
    defaultPrompt: 'South Node, glowing celestial point, descending silver-violet light, ethereal energy spiral, cosmic release',
  },
  {
    key: 'lilith',
    name: 'Black Moon Lilith',
    category: 'point',
    defaultPrompt: 'Black Moon Lilith, dark celestial void, shadowy crescent silhouette, mysterious dark energy, subtle purple-black glow',
  },
  {
    key: 'pof',
    name: 'Part of Fortune',
    category: 'point',
    defaultPrompt: 'Part of Fortune, radiant golden wheel of light, eight-pointed star formation, abundant cosmic energy',
  },
]

export const PLANET_CATEGORIES = {
  personal: 'Personal Planets',
  social: 'Social Planets',
  transpersonal: 'Transpersonal Planets',
  point: 'Points & Asteroids',
} as const

export const TOTAL_PLANETS = PLANETS.length // 15

export function getPlanetsByCategory(category: Planet['category']): Planet[] {
  return PLANETS.filter(p => p.category === category)
}

export function getPlanetByKey(key: string): Planet | undefined {
  return PLANETS.find(p => p.key === key)
}
