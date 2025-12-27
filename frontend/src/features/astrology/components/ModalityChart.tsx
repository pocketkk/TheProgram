/**
 * Modality Chart
 * Displays planet distribution across Cardinal, Fixed, Mutable modalities in a bar chart
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { BirthChart } from '@/lib/astrology/types'
import { barChartVariants, withReducedMotion } from '../animations'

interface ModalityChartProps {
  chart: BirthChart
}

const MODALITY_COLORS = {
  Cardinal: '#FF6B6B', // Red - Initiating
  Fixed: '#4169E1', // Blue - Sustaining
  Mutable: '#4ECDC4', // Cyan - Adapting
}

export function ModalityChart({ chart }: ModalityChartProps) {
  const modalityData = useMemo(() => {
    // Count planets by modality
    const counts: Record<string, number> = {
      Cardinal: 0,
      Fixed: 0,
      Mutable: 0,
    }

    if (!chart?.planets) {
      return Object.entries(counts).map(([modality, count]) => ({
        modality,
        count,
        percentage: 0,
        color: MODALITY_COLORS[modality as keyof typeof MODALITY_COLORS],
      }))
    }

    chart.planets.forEach(planet => {
      counts[planet.modality] = (counts[planet.modality] || 0) + 1
    })

    const total = chart.planets.length || 1

    // Create data array
    return Object.entries(counts).map(([modality, count]) => ({
      modality,
      count,
      percentage: (count / total) * 100,
      color: MODALITY_COLORS[modality as keyof typeof MODALITY_COLORS],
    }))
  }, [chart?.planets])

  const maxCount = Math.max(...modalityData.map(d => d.count), 1) // Ensure minimum of 1 to prevent division by zero

  return (
    <div className="bg-gradient-to-br from-cosmic-900/80 to-cosmic-800/80 rounded-lg p-3 border border-cosmic-700/50">
      <h3 className="text-xs font-semibold text-cosmic-300 mb-2">Modality Balance</h3>

      <div className="space-y-2">
        {modalityData.map((data, index) => (
          <motion.div
            key={data.modality}
            custom={index}
            variants={withReducedMotion(barChartVariants)}
            initial="initial"
            animate="animate"
          >
            {/* Label and count */}
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: data.color }}
                />
                <span className="text-xs font-medium text-white">{data.modality}</span>
              </div>
              <span className="text-xs text-cosmic-300">
                {data.count}
              </span>
            </div>

            {/* Bar */}
            <div className="relative h-6 bg-cosmic-950/50 rounded-lg overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{
                  backgroundColor: data.color,
                  boxShadow: `0 0 10px ${data.color}40`,
                }}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${(data.count / maxCount) * 100}%`, opacity: 1 }}
                transition={{
                  delay: index * 0.15 + 0.3,
                  duration: 0.6,
                  ease: [0.34, 1.56, 0.64, 1], // Bounce easing
                }}
              />

              {/* Count label inside bar */}
              {data.count > 0 && (
                <motion.div
                  className="absolute inset-0 flex items-center px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  <span className="text-xs font-bold text-white drop-shadow-lg">
                    {data.count} planet{data.count !== 1 ? 's' : ''}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
