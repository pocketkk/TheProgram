/**
 * Yogas Panel Component
 *
 * Displays detected planetary yogas in a categorized, expandable format.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Star, TrendingUp, Crown, Moon, Sun, AlertTriangle } from 'lucide-react'
import type { YogasResponse, YogaInfo, YogaCategory } from '@/lib/api/yogas'

interface YogasPanelProps {
  yogasData: YogasResponse | null
  isLoading: boolean
}

const CATEGORY_CONFIG: Record<YogaCategory, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  raja: {
    label: 'Raja Yogas',
    icon: <Crown className="w-4 h-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  dhana: {
    label: 'Dhana Yogas',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  pancha_mahapurusha: {
    label: 'Pancha Mahapurusha',
    icon: <Star className="w-4 h-4" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  chandra: {
    label: 'Chandra Yogas',
    icon: <Moon className="w-4 h-4" />,
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
  },
  surya: {
    label: 'Surya Yogas',
    icon: <Sun className="w-4 h-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  other: {
    label: 'Other Yogas',
    icon: <Star className="w-4 h-4" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  negative: {
    label: 'Challenging Yogas',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
}

const STRENGTH_COLORS = {
  strong: 'bg-green-500',
  moderate: 'bg-yellow-500',
  weak: 'bg-gray-500',
}

const YogaCard: React.FC<{ yoga: YogaInfo; isExpanded: boolean; onToggle: () => void }> = ({
  yoga,
  isExpanded,
  onToggle,
}) => {
  const config = CATEGORY_CONFIG[yoga.category as YogaCategory] || CATEGORY_CONFIG.other

  return (
    <div
      className={`rounded-lg border border-slate-700/50 overflow-hidden ${config.bgColor}`}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors text-left"
      >
        <div className={`${STRENGTH_COLORS[yoga.strength]} w-2 h-2 rounded-full`} />
        <span className={`flex-1 font-medium text-sm ${config.color}`}>
          {yoga.name}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 text-xs">
              {/* Planets involved */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Planets:</span>
                <div className="flex gap-1 flex-wrap">
                  {yoga.planets_involved.map((planet) => (
                    <span
                      key={planet}
                      className="px-2 py-0.5 bg-slate-700 rounded text-slate-300 capitalize"
                    >
                      {planet}
                    </span>
                  ))}
                </div>
              </div>

              {/* Houses involved */}
              {yoga.houses_involved.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Houses:</span>
                  <span className="text-slate-300">
                    {yoga.houses_involved.join(', ')}
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-slate-400 leading-relaxed">
                {yoga.description}
              </p>

              {/* Effects */}
              <div className="pt-1 border-t border-slate-700/50">
                <p className="text-slate-300 leading-relaxed">
                  <span className="text-slate-500">Effects: </span>
                  {yoga.effects}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const CategorySection: React.FC<{
  category: YogaCategory
  yogas: YogaInfo[]
  expandedYogas: Set<string>
  onToggleYoga: (name: string) => void
}> = ({ category, yogas, expandedYogas, onToggleYoga }) => {
  const config = CATEGORY_CONFIG[category]
  const [isExpanded, setIsExpanded] = useState(true)

  if (yogas.length === 0) return null

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 py-1 hover:bg-white/5 rounded transition-colors"
      >
        <span className={config.color}>{config.icon}</span>
        <span className={`font-medium text-sm ${config.color}`}>
          {config.label}
        </span>
        <span className="text-slate-500 text-xs">({yogas.length})</span>
        <div className="flex-1" />
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {yogas.map((yoga) => (
              <YogaCard
                key={yoga.name}
                yoga={yoga}
                isExpanded={expandedYogas.has(yoga.name)}
                onToggle={() => onToggleYoga(yoga.name)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const YogasPanel: React.FC<YogasPanelProps> = ({ yogasData, isLoading }) => {
  const [expandedYogas, setExpandedYogas] = useState<Set<string>>(new Set())

  const toggleYoga = (name: string) => {
    setExpandedYogas((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-cosmic-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!yogasData) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p>No yogas data available</p>
      </div>
    )
  }

  const { yogas, summary } = yogasData

  // Order categories
  const categoryOrder: YogaCategory[] = [
    'raja',
    'pancha_mahapurusha',
    'dhana',
    'chandra',
    'surya',
    'other',
    'negative',
  ]

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
        <h3 className="text-sm font-medium text-white">Summary</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {summary.overall_assessment}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {summary.raja_yoga_count > 0 && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
              {summary.raja_yoga_count} Raja
            </span>
          )}
          {summary.dhana_yoga_count > 0 && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
              {summary.dhana_yoga_count} Dhana
            </span>
          )}
          {summary.pancha_mahapurusha_count > 0 && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
              {summary.pancha_mahapurusha_count} Mahapurusha
            </span>
          )}
          {summary.negative_yoga_count > 0 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
              {summary.negative_yoga_count} Challenging
            </span>
          )}
        </div>
      </div>

      {/* Yoga Categories */}
      {categoryOrder.map((category) => (
        <CategorySection
          key={category}
          category={category}
          yogas={yogas[category] || []}
          expandedYogas={expandedYogas}
          onToggleYoga={toggleYoga}
        />
      ))}

      {/* No yogas found */}
      {yogasData.total_count === 0 && (
        <div className="text-center text-slate-500 py-4">
          <p>No significant yogas detected</p>
        </div>
      )}
    </div>
  )
}
