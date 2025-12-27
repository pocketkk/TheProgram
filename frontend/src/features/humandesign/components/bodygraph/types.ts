/**
 * Types for the Human Design Body Graph components
 */

export type GateActivationType = 'personality' | 'design' | 'both' | 'none'

export interface GateActivation {
  gate: number
  type: GateActivationType
}

export interface Position {
  x: number
  y: number
}

export interface CenterProps {
  x: number
  y: number
  defined: boolean
  gateActivations: Map<number, GateActivationType>
  onCenterClick?: () => void
  onGateClick?: (gate: number) => void
  highlightedGate?: number | null
}

export interface GateCircleProps {
  gate: number
  x: number
  y: number
  activation: GateActivationType
  size?: number
  onClick?: () => void
  isHighlighted?: boolean
}

export interface ChannelDefinition {
  id: string
  gates: [number, number]
  centers: [string, string]
}

export interface ChannelLineProps {
  startPos: Position
  endPos: Position
  isActive: boolean
  activationType: GateActivationType
  isHighlighted?: boolean
  onClick?: () => void
}

// Gate positions exported by each center for channel connections
export type GatePositionMap = Record<number, Position>
