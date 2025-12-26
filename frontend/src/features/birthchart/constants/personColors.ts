/**
 * Color constants for people/contacts in birth chart module
 */
import type { RelationshipType } from '@/lib/api/birthData'

/**
 * Preset colors for assigning to people
 */
export const PERSON_COLORS = [
  { name: 'Cosmic Purple', value: '#7C3AED' },
  { name: 'Celestial Gold', value: '#F59E0B' },
  { name: 'Nebula Pink', value: '#EC4899' },
  { name: 'Ocean Blue', value: '#3B82F6' },
  { name: 'Aurora Green', value: '#10B981' },
  { name: 'Sunset Orange', value: '#F97316' },
  { name: 'Starlight Silver', value: '#94A3B8' },
  { name: 'Mars Red', value: '#EF4444' },
] as const

/**
 * Default colors for each relationship type
 */
export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  family: '#F59E0B',    // Gold
  friend: '#3B82F6',    // Blue
  partner: '#EC4899',   // Pink
  client: '#10B981',    // Green
  celebrity: '#7C3AED', // Purple
  historical: '#94A3B8', // Silver
  other: '#6B7280',     // Gray
}

/**
 * Get the color for a person, falling back to relationship type default
 */
export function getPersonColor(color: string | null, relationshipType: RelationshipType | null): string {
  if (color) return color
  if (relationshipType) return RELATIONSHIP_COLORS[relationshipType]
  return PERSON_COLORS[0].value // Default to purple
}

/**
 * Get a glow style for a person's color
 */
export function getPersonGlowStyle(color: string): React.CSSProperties {
  return {
    boxShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
  }
}

/**
 * Get a border style for a person's color
 */
export function getPersonBorderStyle(color: string): React.CSSProperties {
  return {
    borderColor: color,
    borderWidth: '2px',
    borderStyle: 'solid',
  }
}
