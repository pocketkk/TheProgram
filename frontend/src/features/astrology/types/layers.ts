/**
 * Chart Layer System
 * Defines the visual layer architecture for the birth chart
 */

import type { BirthChart } from '@/lib/astrology/types'
// Types for layer architecture - PlanetPosition, House, Aspect imported when needed
export type { PlanetPosition, House, Aspect } from '@/lib/astrology/types'

export type LayerType =
  | 'zodiac'
  | 'houses'
  | 'planets'
  | 'aspects'
  | 'degrees'
  | 'labels'
  | 'nodes'
  | 'chiron'
  | 'asteroids'
  | 'arabicParts'
  | 'fixedStars'

export interface LayerConfig {
  id: LayerType
  name: string
  description: string
  zIndex: number
  defaultVisible: boolean
  category: 'core' | 'additional' | 'advanced'
  dependencies?: LayerType[] // layers that must be visible for this to work
}

export interface ChartLayer {
  config: LayerConfig
  visible: boolean
  opacity: number
  interactive: boolean
  render: (context: ChartRenderContext) => React.ReactNode
}

export interface ChartRenderContext {
  chart: BirthChart
  size: number
  center: number
  outerRadius: number
  innerRadius: number
  planetRadius: number
  houseRadius: number
  interactions: {
    hoveredElement: string | null
    selectedElement: string | null
    highlightedItems: string[]
  }
  helpers: {
    polarToCartesian: (angle: number, radius: number) => { x: number; y: number }
    createArcPath: (startAngle: number, endAngle: number, radius: number) => string
    getElementColor: (element: string) => string
  }
}

export const LAYER_CONFIGS: Record<LayerType, LayerConfig> = {
  zodiac: {
    id: 'zodiac',
    name: 'Zodiac Signs',
    description: '12 zodiac signs with elemental colors',
    zIndex: 1,
    defaultVisible: true,
    category: 'core',
  },
  houses: {
    id: 'houses',
    name: 'House Cusps',
    description: '12 house divisions',
    zIndex: 2,
    defaultVisible: true,
    category: 'core',
  },
  degrees: {
    id: 'degrees',
    name: 'Degree Markers',
    description: 'Degree markings around the wheel',
    zIndex: 3,
    defaultVisible: true,
    category: 'core',
  },
  aspects: {
    id: 'aspects',
    name: 'Aspect Lines',
    description: 'Planetary aspects and relationships',
    zIndex: 4,
    defaultVisible: true,
    category: 'core',
    dependencies: ['planets'],
  },
  planets: {
    id: 'planets',
    name: 'Planets',
    description: 'Sun, Moon, and 8 planets',
    zIndex: 5,
    defaultVisible: true,
    category: 'core',
  },
  labels: {
    id: 'labels',
    name: 'Labels',
    description: 'Planet names and positions',
    zIndex: 6,
    defaultVisible: true,
    category: 'core',
    dependencies: ['planets'],
  },
  nodes: {
    id: 'nodes',
    name: 'Lunar Nodes',
    description: 'North and South Node',
    zIndex: 5,
    defaultVisible: false,
    category: 'additional',
  },
  chiron: {
    id: 'chiron',
    name: 'Chiron',
    description: 'The wounded healer',
    zIndex: 5,
    defaultVisible: false,
    category: 'additional',
  },
  asteroids: {
    id: 'asteroids',
    name: 'Major Asteroids',
    description: 'Ceres, Pallas, Juno, Vesta',
    zIndex: 5,
    defaultVisible: false,
    category: 'advanced',
  },
  arabicParts: {
    id: 'arabicParts',
    name: 'Arabic Parts',
    description: 'Part of Fortune, Spirit, etc.',
    zIndex: 5,
    defaultVisible: false,
    category: 'advanced',
  },
  fixedStars: {
    id: 'fixedStars',
    name: 'Fixed Stars',
    description: 'Major fixed stars',
    zIndex: 4,
    defaultVisible: false,
    category: 'advanced',
  },
}

/**
 * Layer Manager - handles layer visibility, dependencies, and rendering order
 */
export class ChartLayerManager {
  private layers: Map<LayerType, ChartLayer>

  constructor() {
    this.layers = new Map()
    this.initializeLayers()
  }

  private initializeLayers() {
    Object.values(LAYER_CONFIGS).forEach(config => {
      this.layers.set(config.id, {
        config,
        visible: config.defaultVisible,
        opacity: 1,
        interactive: true,
        render: () => null, // Will be set by components
      })
    })
  }

  setLayerRenderer(layerId: LayerType, renderer: (context: ChartRenderContext) => React.ReactNode) {
    const layer = this.layers.get(layerId)
    if (layer) {
      layer.render = renderer
    }
  }

  setLayerVisibility(layerId: LayerType, visible: boolean) {
    const layer = this.layers.get(layerId)
    if (!layer) return

    // Check dependencies
    if (visible && layer.config.dependencies) {
      const missingDeps = layer.config.dependencies.filter(
        depId => !this.layers.get(depId)?.visible
      )
      if (missingDeps.length > 0) {
        console.warn(
          `Cannot show ${layerId} - missing dependencies: ${missingDeps.join(', ')}`
        )
        return
      }
    }

    layer.visible = visible
  }

  getVisibleLayers(): ChartLayer[] {
    return Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.config.zIndex - b.config.zIndex)
  }

  getLayer(layerId: LayerType): ChartLayer | undefined {
    return this.layers.get(layerId)
  }

  getAllLayers(): ChartLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.config.zIndex - b.config.zIndex)
  }
}
