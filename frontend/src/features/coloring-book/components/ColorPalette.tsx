/**
 * Color Palette Component
 *
 * Color selection with palettes, recent colors, and custom picker
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus } from 'lucide-react'
import { useColoringBookStore } from '../stores/useColoringBookStore'
import { COLOR_PALETTES } from '../types'

interface ColorPaletteProps {
  className?: string
}

export const ColorPalette = ({ className }: ColorPaletteProps) => {
  const {
    toolSettings,
    recentColors,
    currentPalette,
    setColor,
    setPalette,
  } = useColoringBookStore()

  const [showPaletteSelector, setShowPaletteSelector] = useState(false)
  const [customColor, setCustomColor] = useState(toolSettings.color)

  const handleColorClick = (color: string) => {
    setColor(color)
    setCustomColor(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    setColor(color)
  }

  return (
    <div className={`glass-strong rounded-xl p-3 ${className}`}>
      {/* Current Color Display */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-lg shadow-inner border-2 border-cosmic-600"
            style={{ backgroundColor: toolSettings.color }}
          />
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Pick custom color"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400">Current Color</p>
          <p className="text-sm font-mono text-white">{toolSettings.color.toUpperCase()}</p>
        </div>
      </div>

      {/* Palette Selector */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowPaletteSelector(!showPaletteSelector)}
          className="w-full flex items-center justify-between px-3 py-2 bg-cosmic-800/50 rounded-lg text-sm text-gray-300 hover:bg-cosmic-700/50 transition-colors"
        >
          <span>{currentPalette.name}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showPaletteSelector ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showPaletteSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-cosmic-900 rounded-lg shadow-xl border border-cosmic-700 z-20 overflow-hidden"
            >
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() => {
                    setPalette(palette)
                    setShowPaletteSelector(false)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                    ${currentPalette.id === palette.id
                      ? 'bg-cosmic-700 text-white'
                      : 'text-gray-400 hover:bg-cosmic-800 hover:text-white'
                    }
                  `}
                >
                  <div className="flex gap-0.5">
                    {palette.colors.slice(0, 5).map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span>{palette.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current Palette Colors */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-2">Palette Colors</p>
        <div className="grid grid-cols-6 gap-1">
          {currentPalette.colors.map((color, index) => (
            <motion.button
              key={`${color}-${index}`}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleColorClick(color)}
              className={`
                w-8 h-8 rounded-md shadow-sm transition-all
                ${toolSettings.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-cosmic-900' : ''}
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Recent Colors</p>
          <div className="flex flex-wrap gap-1">
            {recentColors.slice(0, 8).map((color, index) => (
              <motion.button
                key={`recent-${color}-${index}`}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleColorClick(color)}
                className={`
                  w-6 h-6 rounded-md shadow-sm transition-all
                  ${toolSettings.color === color ? 'ring-2 ring-white' : ''}
                `}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Colors Row */}
      <div className="mt-3 pt-3 border-t border-cosmic-700">
        <div className="flex gap-1 justify-center">
          {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((color) => (
            <motion.button
              key={`quick-${color}`}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleColorClick(color)}
              className={`
                w-6 h-6 rounded-full shadow-sm transition-all border border-cosmic-600
                ${toolSettings.color === color ? 'ring-2 ring-cosmic-400' : ''}
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
