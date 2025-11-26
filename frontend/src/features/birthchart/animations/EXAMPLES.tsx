/**
 * Animation System Examples
 *
 * Complete working examples demonstrating how to use the animation system.
 * Copy these examples and adapt them to your components.
 *
 * @module examples
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  pageVariants,
  wheelVariants,
  planetEntranceVariants,
  selectionRingVariants,
  tooltipVariants,
  cardVariants,
  listItemVariants,
  staggerContainerVariants,
  tabContentVariants,
  panelVariants,
  retrogradeVariants,
  aspectLineVariants,
  ChartLoadingState,
  ChartLoadingStateMinimal,
} from './index'

// ============================================================================
// EXAMPLE 1: Basic Page with Animation
// ============================================================================

export function ExampleBasicPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen p-8"
    >
      <h1>My Animated Page</h1>
      <p>This page fades in smoothly on load</p>
    </motion.div>
  )
}

// ============================================================================
// EXAMPLE 2: Chart Wheel with Planets
// ============================================================================

interface Planet {
  name: string
  longitude: number
  symbol: string
  color: string
  isRetrograde: boolean
}

export function ExampleChartWheel({ planets }: { planets: Planet[] }) {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)

  const size = 600
  const center = size / 2
  const planetRadius = (size / 2) * 0.85

  // Convert longitude to SVG coordinates
  const polarToCartesian = (angle: number, radius: number) => {
    const adjustedAngle = (180 - angle) * (Math.PI / 180)
    return {
      x: center + radius * Math.cos(adjustedAngle),
      y: center - radius * Math.sin(adjustedAngle),
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.svg
        width={size}
        height={size}
        variants={wheelVariants}
        initial="initial"
        animate="animate"
      >
        {/* Background circle */}
        <circle cx={center} cy={center} r={size / 2 - 20} fill="#1a1a2e" />

        {/* Planets with entrance animation */}
        {planets.map((planet, index) => {
          const pos = polarToCartesian(planet.longitude, planetRadius)
          const isSelected = selectedPlanet === planet.name

          return (
            <motion.g
              key={planet.name}
              custom={index}
              variants={planetEntranceVariants}
              initial="initial"
              animate="animate"
              onMouseEnter={() => setHoveredPlanet(planet.name)}
              onMouseLeave={() => setHoveredPlanet(null)}
              onClick={() => setSelectedPlanet(planet.name)}
              className="cursor-pointer"
            >
              {/* Selection ring */}
              <AnimatePresence>
                {isSelected && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={18}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    variants={selectionRingVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  />
                )}
              </AnimatePresence>

              {/* Planet circle */}
              <circle cx={pos.x} cy={pos.y} r={12} fill={planet.color} />

              {/* Planet symbol */}
              <text
                x={pos.x}
                y={pos.y}
                fontSize={16}
                fill="#000"
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="bold"
              >
                {planet.symbol}
              </text>

              {/* Retrograde indicator */}
              {planet.isRetrograde && (
                <motion.text
                  x={pos.x + 15}
                  y={pos.y - 10}
                  fontSize={10}
                  fill="#ff6b6b"
                  fontWeight="bold"
                  variants={retrogradeVariants}
                  initial="initial"
                  animate="animate"
                >
                  ℞
                </motion.text>
              )}
            </motion.g>
          )
        })}
      </motion.svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredPlanet && (
          <motion.div
            variants={tooltipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute top-0 left-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm"
            style={{ pointerEvents: 'none' }}
          >
            {hoveredPlanet}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// EXAMPLE 3: Animated Card List
// ============================================================================

interface CardData {
  id: string
  title: string
  description: string
}

export function ExampleCardList({ cards }: { cards: CardData[] }) {
  return (
    <div className="space-y-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          custom={index}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="bg-white rounded-lg p-4 shadow-lg"
        >
          <h3 className="font-bold">{card.title}</h3>
          <p className="text-gray-600">{card.description}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Staggered List Items
// ============================================================================

export function ExampleStaggeredList({ items }: { items: string[] }) {
  return (
    <motion.ul
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-2"
    >
      {items.map((item, index) => (
        <motion.li
          key={index}
          custom={index}
          variants={listItemVariants}
          className="bg-gray-100 p-3 rounded"
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  )
}

// ============================================================================
// EXAMPLE 5: Tab Navigation with Transitions
// ============================================================================

type Tab = 'planets' | 'houses' | 'aspects'

export function ExampleTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('planets')

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('planets')}
          className={`px-4 py-2 rounded ${
            activeTab === 'planets' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Planets
        </button>
        <button
          onClick={() => setActiveTab('houses')}
          className={`px-4 py-2 rounded ${
            activeTab === 'houses' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Houses
        </button>
        <button
          onClick={() => setActiveTab('aspects')}
          className={`px-4 py-2 rounded ${
            activeTab === 'aspects' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Aspects
        </button>
      </div>

      {/* Tab content with animation */}
      <AnimatePresence mode="wait">
        {activeTab === 'planets' && (
          <motion.div
            key="planets"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2>Planets Content</h2>
            <p>This content animates when switching tabs</p>
          </motion.div>
        )}

        {activeTab === 'houses' && (
          <motion.div
            key="houses"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2>Houses Content</h2>
            <p>Smooth transition between tabs</p>
          </motion.div>
        )}

        {activeTab === 'aspects' && (
          <motion.div
            key="aspects"
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <h2>Aspects Content</h2>
            <p>No flash of unstyled content!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// EXAMPLE 6: Collapsible Panel
// ============================================================================

export function ExampleCollapsiblePanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left font-bold bg-gray-100 hover:bg-gray-200"
      >
        {isOpen ? 'Hide' : 'Show'} Advanced Options
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={panelVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                Option 1
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                Option 2
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                Option 3
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// EXAMPLE 7: Aspect Lines (SVG Path Animation)
// ============================================================================

interface Aspect {
  planet1: string
  planet2: string
  type: string
  color: string
}

export function ExampleAspectLines({ aspects }: { aspects: Aspect[] }) {
  const size = 600
  const center = size / 2

  // Mock positions
  const getPlanetPosition = (_name: string) => ({
    x: center + Math.random() * 200 - 100,
    y: center + Math.random() * 200 - 100,
  })

  return (
    <svg width={size} height={size}>
      {aspects.map((aspect, index) => {
        const pos1 = getPlanetPosition(aspect.planet1)
        const pos2 = getPlanetPosition(aspect.planet2)

        return (
          <motion.line
            key={`${aspect.planet1}-${aspect.planet2}`}
            x1={pos1.x}
            y1={pos1.y}
            x2={pos2.x}
            y2={pos2.y}
            stroke={aspect.color}
            strokeWidth={2}
            strokeOpacity={0.3}
            variants={aspectLineVariants}
            custom={index * 0.05} // Stagger by 50ms
            initial="initial"
            animate="animate"
          />
        )
      })}
    </svg>
  )
}

// ============================================================================
// EXAMPLE 8: Loading States
// ============================================================================

export function ExampleLoadingStates() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const startLoading = () => {
    setIsLoading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsLoading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="space-y-8">
      {/* Full loading state */}
      <div>
        <h3 className="font-bold mb-2">Full Chart Loading</h3>
        <button
          onClick={startLoading}
          disabled={isLoading}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Simulate Loading
        </button>

        {isLoading ? (
          <ChartLoadingState
            size={400}
            message="Calculating planetary positions..."
            progress={progress}
          />
        ) : (
          <div className="w-[400px] h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
            <p>Chart would appear here</p>
          </div>
        )}
      </div>

      {/* Minimal loading state */}
      <div>
        <h3 className="font-bold mb-2">Inline Loading Indicator</h3>
        <button
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <ChartLoadingStateMinimal size={20} />
              <span>Loading...</span>
            </>
          ) : (
            'Click to Load'
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 9: Complete Integration Example
// ============================================================================

export function ExampleCompleteChart() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)

  // Simulate loading
  useState(() => {
    setTimeout(() => setIsLoading(false), 2000)
  })

  const mockPlanets: Planet[] = [
    { name: 'Sun', longitude: 0, symbol: '☉', color: '#FFD700', isRetrograde: false },
    { name: 'Moon', longitude: 45, symbol: '☽', color: '#C0C0C0', isRetrograde: false },
    { name: 'Mercury', longitude: 90, symbol: '☿', color: '#87CEEB', isRetrograde: true },
    { name: 'Venus', longitude: 135, symbol: '♀', color: '#FF69B4', isRetrograde: false },
    { name: 'Mars', longitude: 180, symbol: '♂', color: '#FF4500', isRetrograde: false },
  ]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="p-8"
    >
      <h1 className="text-3xl font-bold mb-8">Birth Chart Example</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* Chart wheel */}
        <div>
          {isLoading ? (
            <ChartLoadingState size={500} />
          ) : (
            <ExampleChartWheel planets={mockPlanets} />
          )}
        </div>

        {/* Planet info */}
        <div>
          <h2 className="text-xl font-bold mb-4">Planet Information</h2>

          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {mockPlanets.map((planet, index) => (
              <motion.div
                key={planet.name}
                custom={index}
                variants={cardVariants}
                onClick={() => setSelectedPlanet(planet.name)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedPlanet === planet.name
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: planet.color, fontSize: 24 }}>
                    {planet.symbol}
                  </span>
                  <div>
                    <div className="font-bold">{planet.name}</div>
                    <div className="text-sm text-gray-600">
                      {Math.floor(planet.longitude)}° {planet.isRetrograde ? '℞' : ''}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Usage Notes
// ============================================================================

/*
 * To use these examples:
 *
 * 1. Copy the relevant example to your component
 * 2. Import required animations from './index'
 * 3. Adapt the structure to your needs
 * 4. Test performance with Chrome DevTools
 *
 * Remember:
 * - Always use AnimatePresence for conditional rendering
 * - Use custom prop for staggered animations
 * - Wrap pages with motion.div for smooth transitions
 * - Test on mobile devices, not just desktop
 * - Respect prefers-reduced-motion
 */
