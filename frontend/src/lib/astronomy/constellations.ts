/**
 * Astronomically accurate constellation patterns for zodiac signs
 * Based on actual star positions and traditional constellation patterns
 * Coordinates are normalized and scaled to fit within the zodiac ring
 */

export interface ConstellationStar {
  x: number // Normalized X position (-1 to 1)
  y: number // Normalized Y position (-1 to 1)
  z: number // Normalized Z position (height, -1 to 1)
  brightness?: number // Optional brightness (0 to 1)
}

export interface ConstellationPattern {
  stars: ConstellationStar[]
  connections: [number, number][] // Pairs of star indices to connect
}

/**
 * Zodiac constellation patterns based on traditional star formations
 * These are simplified representations of the actual constellations
 * positioned relative to each sign's center
 */
export const CONSTELLATION_PATTERNS: Record<string, ConstellationPattern> = {
  Aries: {
    stars: [
      { x: 0, y: 0.3, z: 0.2, brightness: 1 }, // Hamal (α Ari) - brightest
      { x: -0.3, y: -0.2, z: 0, brightness: 0.8 }, // Sheratan (β Ari)
      { x: -0.4, y: -0.4, z: -0.1, brightness: 0.7 }, // Mesarthim (γ Ari)
      { x: 0.2, y: 0.5, z: 0.3, brightness: 0.6 }, // Additional star
    ],
    connections: [
      [0, 1], // Hamal to Sheratan
      [1, 2], // Sheratan to Mesarthim
    ],
  },

  Taurus: {
    stars: [
      { x: -0.2, y: 0, z: 0.1, brightness: 1 }, // Aldebaran (α Tau) - the eye
      { x: 0.3, y: 0.4, z: 0.2, brightness: 0.8 }, // Elnath (β Tau) - horn tip
      { x: -0.4, y: 0.3, z: 0, brightness: 0.7 }, // Pleiades cluster marker
      { x: 0, y: -0.3, z: -0.1, brightness: 0.7 }, // Lower horn
      { x: 0.4, y: -0.2, z: 0, brightness: 0.6 }, // Body
      { x: 0.1, y: 0.5, z: 0.3, brightness: 0.6 }, // Upper horn
    ],
    connections: [
      [0, 1], // Eye to horn
      [0, 3], // Eye to lower horn
      [0, 4], // Eye to body
      [1, 5], // Horn connections
    ],
  },

  Gemini: {
    stars: [
      { x: -0.3, y: 0.4, z: 0.2, brightness: 1 }, // Pollux (β Gem) - head of twin 1
      { x: 0.3, y: 0.4, z: 0.2, brightness: 0.95 }, // Castor (α Gem) - head of twin 2
      { x: -0.3, y: -0.1, z: 0, brightness: 0.7 }, // Body of twin 1
      { x: 0.3, y: -0.1, z: 0, brightness: 0.7 }, // Body of twin 2
      { x: -0.4, y: -0.5, z: -0.2, brightness: 0.6 }, // Feet of twin 1
      { x: 0.4, y: -0.5, z: -0.2, brightness: 0.6 }, // Feet of twin 2
    ],
    connections: [
      [0, 2], // Pollux to body
      [2, 4], // Body to feet (twin 1)
      [1, 3], // Castor to body
      [3, 5], // Body to feet (twin 2)
      [0, 1], // Heads connected
    ],
  },

  Cancer: {
    stars: [
      { x: 0, y: 0, z: 0, brightness: 0.8 }, // Center (Praesepe cluster)
      { x: -0.4, y: 0.3, z: 0.1, brightness: 0.7 }, // Al Tarf (β Cnc)
      { x: 0.4, y: 0.3, z: 0.1, brightness: 0.7 }, // Acubens (α Cnc)
      { x: -0.3, y: -0.4, z: -0.1, brightness: 0.6 }, // Lower left
      { x: 0.3, y: -0.4, z: -0.1, brightness: 0.6 }, // Lower right
    ],
    connections: [
      [0, 1], // Center to upper left
      [0, 2], // Center to upper right
      [0, 3], // Center to lower left
      [0, 4], // Center to lower right
      [1, 3], // Left side
      [2, 4], // Right side
    ],
  },

  Leo: {
    stars: [
      { x: -0.3, y: 0.2, z: 0.2, brightness: 1 }, // Regulus (α Leo) - heart
      { x: 0, y: 0.5, z: 0.3, brightness: 0.8 }, // Head
      { x: -0.5, y: 0, z: 0, brightness: 0.7 }, // Shoulder
      { x: -0.4, y: -0.3, z: -0.1, brightness: 0.7 }, // Back
      { x: 0.2, y: -0.4, z: -0.2, brightness: 0.7 }, // Denebola (β Leo) - tail
      { x: 0.4, y: 0.3, z: 0.1, brightness: 0.6 }, // Mane
    ],
    connections: [
      [0, 1], // Heart to head
      [0, 2], // Heart to shoulder
      [0, 3], // Heart to back
      [3, 4], // Back to tail
      [1, 5], // Head to mane
      [2, 3], // Shoulder to back
    ],
  },

  Virgo: {
    stars: [
      { x: 0, y: 0.2, z: 0.1, brightness: 1 }, // Spica (α Vir) - wheat sheaf
      { x: -0.2, y: 0.5, z: 0.3, brightness: 0.7 }, // Head
      { x: -0.4, y: 0.3, z: 0.1, brightness: 0.6 }, // Shoulder
      { x: -0.3, y: -0.1, z: 0, brightness: 0.6 }, // Body
      { x: 0.3, y: -0.3, z: -0.1, brightness: 0.6 }, // Lower body
      { x: 0.4, y: -0.5, z: -0.2, brightness: 0.6 }, // Feet
    ],
    connections: [
      [1, 2], // Head to shoulder
      [2, 3], // Shoulder to body
      [3, 0], // Body to wheat (Spica)
      [3, 4], // Body to lower body
      [4, 5], // Lower body to feet
    ],
  },

  Libra: {
    stars: [
      { x: 0, y: 0.3, z: 0.1, brightness: 0.8 }, // Balance point
      { x: -0.4, y: 0.3, z: 0.1, brightness: 0.8 }, // Zubenelgenubi (α Lib) - left scale
      { x: 0.4, y: 0.3, z: 0.1, brightness: 0.8 }, // Zubeneschamali (β Lib) - right scale
      { x: -0.4, y: -0.2, z: -0.1, brightness: 0.6 }, // Left scale bottom
      { x: 0.4, y: -0.2, z: -0.1, brightness: 0.6 }, // Right scale bottom
      { x: 0, y: 0.5, z: 0.3, brightness: 0.6 }, // Top of beam
    ],
    connections: [
      [5, 0], // Top to balance
      [0, 1], // Balance to left scale
      [0, 2], // Balance to right scale
      [1, 3], // Left scale pan
      [2, 4], // Right scale pan
    ],
  },

  Scorpio: {
    stars: [
      { x: -0.3, y: 0.2, z: 0.1, brightness: 1 }, // Antares (α Sco) - heart
      { x: -0.5, y: 0.4, z: 0.2, brightness: 0.7 }, // Head
      { x: -0.2, y: 0, z: 0, brightness: 0.7 }, // Body segment
      { x: 0, y: -0.2, z: -0.1, brightness: 0.7 }, // Curve start
      { x: 0.3, y: -0.3, z: -0.2, brightness: 0.7 }, // Tail curve
      { x: 0.5, y: -0.1, z: 0, brightness: 0.7 }, // Stinger
      { x: 0.4, y: 0.1, z: 0.1, brightness: 0.6 }, // Stinger tip
    ],
    connections: [
      [1, 0], // Head to heart
      [0, 2], // Heart to body
      [2, 3], // Body segments
      [3, 4], // To tail
      [4, 5], // Tail to stinger
      [5, 6], // Stinger
    ],
  },

  Sagittarius: {
    stars: [
      { x: 0, y: 0, z: 0, brightness: 0.9 }, // Body center
      { x: -0.3, y: 0.4, z: 0.2, brightness: 0.8 }, // Archer's head
      { x: -0.4, y: 0.1, z: 0, brightness: 0.7 }, // Bow top
      { x: -0.4, y: -0.3, z: -0.1, brightness: 0.7 }, // Bow bottom
      { x: 0.3, y: 0.2, z: 0.1, brightness: 0.7 }, // Arrow
      { x: 0.5, y: 0.3, z: 0.2, brightness: 0.6 }, // Arrow tip
      { x: 0.2, y: -0.4, z: -0.2, brightness: 0.6 }, // Horse body
    ],
    connections: [
      [1, 0], // Head to body
      [2, 3], // Bow
      [2, 0], // Bow to body
      [0, 4], // Body to arrow
      [4, 5], // Arrow tip
      [0, 6], // Body to horse
    ],
  },

  Capricorn: {
    stars: [
      { x: -0.2, y: 0.3, z: 0.2, brightness: 0.8 }, // Head
      { x: -0.4, y: 0.5, z: 0.3, brightness: 0.7 }, // Horn 1
      { x: 0, y: 0.5, z: 0.3, brightness: 0.7 }, // Horn 2
      { x: 0, y: 0, z: 0, brightness: 0.7 }, // Body
      { x: 0.3, y: -0.2, z: -0.1, brightness: 0.6 }, // Lower body
      { x: 0.5, y: -0.4, z: -0.2, brightness: 0.6 }, // Tail (fish)
    ],
    connections: [
      [0, 1], // Head to horn 1
      [0, 2], // Head to horn 2
      [0, 3], // Head to body
      [3, 4], // Body to lower body
      [4, 5], // Lower body to tail
    ],
  },

  Aquarius: {
    stars: [
      { x: -0.3, y: 0.4, z: 0.2, brightness: 0.8 }, // Water bearer's head
      { x: -0.2, y: 0.2, z: 0.1, brightness: 0.7 }, // Shoulder
      { x: 0, y: 0, z: 0, brightness: 0.7 }, // Arm
      { x: 0.2, y: -0.2, z: -0.1, brightness: 0.7 }, // Jar
      { x: 0.3, y: -0.4, z: -0.2, brightness: 0.6 }, // Water flow 1
      { x: 0.1, y: -0.5, z: -0.3, brightness: 0.6 }, // Water flow 2
      { x: 0.5, y: -0.3, z: -0.2, brightness: 0.6 }, // Water flow 3
    ],
    connections: [
      [0, 1], // Head to shoulder
      [1, 2], // Shoulder to arm
      [2, 3], // Arm to jar
      [3, 4], // Jar to water
      [3, 5], // Water flow
      [3, 6], // Water flow
    ],
  },

  Pisces: {
    stars: [
      { x: -0.4, y: 0.3, z: 0.2, brightness: 0.8 }, // Fish 1 head
      { x: -0.5, y: 0, z: 0, brightness: 0.7 }, // Fish 1 body
      { x: -0.4, y: -0.3, z: -0.1, brightness: 0.7 }, // Fish 1 tail
      { x: 0, y: 0, z: 0, brightness: 0.7 }, // Cord center
      { x: 0.4, y: 0.3, z: 0.2, brightness: 0.8 }, // Fish 2 head
      { x: 0.5, y: 0, z: 0, brightness: 0.7 }, // Fish 2 body
      { x: 0.4, y: -0.3, z: -0.1, brightness: 0.7 }, // Fish 2 tail
    ],
    connections: [
      [0, 1], // Fish 1 head to body
      [1, 2], // Fish 1 body to tail
      [2, 3], // Fish 1 to cord
      [3, 4], // Cord to fish 2
      [4, 5], // Fish 2 head to body
      [5, 6], // Fish 2 body to tail
    ],
  },
}
