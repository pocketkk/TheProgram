/**
 * ChartSettings Component
 *
 * UI for selecting ayanamsa system, house system, zodiac type, and hybrid chart options.
 * These settings affect how charts are calculated.
 */
import { motion } from 'framer-motion'
import { Settings, Globe, Home, Star, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  useChartStore,
  type ZodiacSystem,
  type AyanamsaSystem,
  type HouseSystem,
} from '../stores/chartStore'

// Ayanamsa options with descriptions
const AYANAMSA_OPTIONS: { value: AyanamsaSystem; label: string; description: string }[] = [
  { value: 'lahiri', label: 'Lahiri', description: 'Most common in India (Chitrapaksha)' },
  { value: 'raman', label: 'Raman', description: 'B.V. Raman system' },
  { value: 'krishnamurti', label: 'KP (Krishnamurti)', description: 'KP astrology system' },
  { value: 'yukteshwar', label: 'Yukteshwar', description: 'Sri Yukteshwar system' },
  { value: 'fagan_bradley', label: 'Fagan-Bradley', description: 'Western sidereal' },
  { value: 'true_chitrapaksha', label: 'True Chitrapaksha', description: 'True Spica-based' },
  { value: 'true_revati', label: 'True Revati', description: 'True Revati-based' },
  { value: 'true_pushya', label: 'True Pushya', description: 'True Pushya-based' },
]

// House system options with descriptions
const HOUSE_SYSTEM_OPTIONS: { value: HouseSystem; label: string; description: string }[] = [
  { value: 'placidus', label: 'Placidus', description: 'Most common Western system' },
  { value: 'whole_sign', label: 'Whole Sign', description: 'Traditional Vedic system' },
  { value: 'equal', label: 'Equal', description: 'Equal 30° houses from ASC' },
  { value: 'koch', label: 'Koch', description: 'Popular in Europe' },
  { value: 'campanus', label: 'Campanus', description: 'Prime vertical based' },
  { value: 'regiomontanus', label: 'Regiomontanus', description: 'Equator-based' },
  { value: 'porphyry', label: 'Porphyry', description: 'Trisection of quadrants' },
  { value: 'morinus', label: 'Morinus', description: 'Equator-based (no ASC)' },
]

// Zodiac system options
const ZODIAC_OPTIONS: { value: ZodiacSystem; label: string; description: string }[] = [
  { value: 'western', label: 'Tropical (Western)', description: 'Seasons-based, starts at spring equinox' },
  { value: 'vedic', label: 'Sidereal (Vedic)', description: 'Star-based, requires ayanamsa' },
]

interface ChartSettingsProps {
  /** Whether to show as a compact inline version */
  compact?: boolean
  /** Callback when settings change */
  onSettingsChange?: () => void
}

export function ChartSettings({ compact = false, onSettingsChange }: ChartSettingsProps) {
  const {
    zodiacSystem,
    ayanamsa,
    houseSystem,
    includeNakshatras,
    includeWesternAspects,
    includeMinorAspects,
    setZodiacSystem,
    setAyanamsa,
    setHouseSystem,
    setIncludeNakshatras,
    setIncludeWesternAspects,
    setIncludeMinorAspects,
  } = useChartStore()

  const handleZodiacChange = (value: ZodiacSystem) => {
    setZodiacSystem(value)
    // Default house system based on zodiac
    if (value === 'vedic' && houseSystem === 'placidus') {
      setHouseSystem('whole_sign')
    } else if (value === 'western' && houseSystem === 'whole_sign') {
      setHouseSystem('placidus')
    }
    onSettingsChange?.()
  }

  const handleAyanamsaChange = (value: AyanamsaSystem) => {
    setAyanamsa(value)
    onSettingsChange?.()
  }

  const handleHouseSystemChange = (value: HouseSystem) => {
    setHouseSystem(value)
    onSettingsChange?.()
  }

  const handleIncludeNakshatrasChange = (value: boolean) => {
    setIncludeNakshatras(value)
    onSettingsChange?.()
  }

  const handleIncludeWesternAspectsChange = (value: boolean) => {
    setIncludeWesternAspects(value)
    onSettingsChange?.()
  }

  const handleIncludeMinorAspectsChange = (value: boolean) => {
    setIncludeMinorAspects(value)
    onSettingsChange?.()
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {/* Zodiac System */}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-celestial-gold" />
          <select
            value={zodiacSystem}
            onChange={(e) => handleZodiacChange(e.target.value as ZodiacSystem)}
            className="bg-cosmic-800 border border-cosmic-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-celestial-gold"
            data-testid="birthchart-settings-select-zodiac"
            aria-label="Select zodiac system"
          >
            {ZODIAC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ayanamsa (only for Vedic) */}
        {zodiacSystem === 'vedic' && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-celestial-pink" />
            <select
              value={ayanamsa}
              onChange={(e) => handleAyanamsaChange(e.target.value as AyanamsaSystem)}
              className="bg-cosmic-800 border border-cosmic-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-celestial-pink"
              data-testid="birthchart-settings-select-ayanamsa"
              aria-label="Select ayanamsa"
            >
              {AYANAMSA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* House System */}
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-celestial-purple" />
          <select
            value={houseSystem}
            onChange={(e) => handleHouseSystemChange(e.target.value as HouseSystem)}
            className="bg-cosmic-800 border border-cosmic-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-celestial-purple"
            data-testid="birthchart-settings-select-house-system"
            aria-label="Select house system"
          >
            {HOUSE_SYSTEM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-celestial-gold" />
          Chart Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Zodiac System */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <Globe className="h-4 w-4 text-celestial-gold" />
            Zodiac System
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ZODIAC_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleZodiacChange(opt.value)}
                className={`
                  p-3 rounded-lg text-left transition-all
                  ${zodiacSystem === opt.value
                    ? 'bg-gradient-to-r from-celestial-gold/20 to-transparent border-l-2 border-celestial-gold'
                    : 'bg-cosmic-800/50 hover:bg-cosmic-700/50 border-l-2 border-transparent'
                  }
                `}
                data-testid={`birthchart-settings-btn-zodiac-${opt.value}`}
              >
                <p className={`font-medium ${zodiacSystem === opt.value ? 'text-white' : 'text-gray-300'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Ayanamsa (only shown for Vedic) */}
        {zodiacSystem === 'vedic' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Star className="h-4 w-4 text-celestial-pink" />
              Ayanamsa System
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AYANAMSA_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAyanamsaChange(opt.value)}
                  className={`
                    p-3 rounded-lg text-left transition-all
                    ${ayanamsa === opt.value
                      ? 'bg-gradient-to-r from-celestial-pink/20 to-transparent border-l-2 border-celestial-pink'
                      : 'bg-cosmic-800/50 hover:bg-cosmic-700/50 border-l-2 border-transparent'
                    }
                  `}
                  data-testid={`birthchart-settings-btn-ayanamsa-${opt.value}`}
                >
                  <p className={`font-medium ${ayanamsa === opt.value ? 'text-white' : 'text-gray-300'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* House System */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <Home className="h-4 w-4 text-celestial-purple" />
            House System
          </label>
          <div className="grid grid-cols-2 gap-2">
            {HOUSE_SYSTEM_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleHouseSystemChange(opt.value)}
                className={`
                  p-3 rounded-lg text-left transition-all
                  ${houseSystem === opt.value
                    ? 'bg-gradient-to-r from-celestial-purple/20 to-transparent border-l-2 border-celestial-purple'
                    : 'bg-cosmic-800/50 hover:bg-cosmic-700/50 border-l-2 border-transparent'
                  }
                `}
                data-testid={`birthchart-settings-btn-house-${opt.value}`}
              >
                <p className={`font-medium ${houseSystem === opt.value ? 'text-white' : 'text-gray-300'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Hybrid Chart Options */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <Layers className="h-4 w-4 text-celestial-gold" />
            Hybrid Chart Options
          </label>
          <div className="space-y-2">
            {/* Include Nakshatras (for Western charts) */}
            {zodiacSystem === 'western' && (
              <motion.button
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onClick={() => handleIncludeNakshatrasChange(!includeNakshatras)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all flex items-center justify-between
                  ${includeNakshatras
                    ? 'bg-gradient-to-r from-celestial-pink/20 to-transparent border-l-2 border-celestial-pink'
                    : 'bg-cosmic-800/50 hover:bg-cosmic-700/50 border-l-2 border-transparent'
                  }
                `}
                data-testid="birthchart-settings-toggle-nakshatras"
              >
                <div>
                  <p className={`font-medium ${includeNakshatras ? 'text-white' : 'text-gray-300'}`}>
                    Include Nakshatras
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Add Vedic lunar mansions to Western charts</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${includeNakshatras ? 'bg-celestial-pink' : 'bg-cosmic-600'}`}>
                  <div className={`w-4 h-4 mt-1 rounded-full bg-white transition-transform ${includeNakshatras ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </motion.button>
            )}

            {/* Include Western Aspects (for Vedic charts) */}
            {zodiacSystem === 'vedic' && (
              <motion.button
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onClick={() => handleIncludeWesternAspectsChange(!includeWesternAspects)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all flex items-center justify-between
                  ${includeWesternAspects
                    ? 'bg-gradient-to-r from-celestial-gold/20 to-transparent border-l-2 border-celestial-gold'
                    : 'bg-cosmic-800/50 hover:bg-cosmic-700/50 border-l-2 border-transparent'
                  }
                `}
                data-testid="birthchart-settings-toggle-western-aspects"
              >
                <div>
                  <p className={`font-medium ${includeWesternAspects ? 'text-white' : 'text-gray-300'}`}>
                    Include Western Aspects
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Add Western-style aspects to Vedic charts</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${includeWesternAspects ? 'bg-celestial-gold' : 'bg-cosmic-600'}`}>
                  <div className={`w-4 h-4 mt-1 rounded-full bg-white transition-transform ${includeWesternAspects ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </motion.button>
            )}

            {/* Include Minor Aspects (always visible) */}
            <motion.button
              onClick={() => handleIncludeMinorAspectsChange(!includeMinorAspects)}
              className={`
                w-full p-3 rounded-lg text-left transition-all flex items-center justify-between
                ${includeMinorAspects
                  ? 'bg-gradient-to-r from-celestial-purple/20 to-transparent border-l-2 border-celestial-purple'
                  : 'bg-cosmic-800/50 hover:bg-cosmic-700/50 border-l-2 border-transparent'
                }
              `}
              data-testid="birthchart-settings-toggle-minor-aspects"
            >
              <div>
                <p className={`font-medium ${includeMinorAspects ? 'text-white' : 'text-gray-300'}`}>
                  Include Minor Aspects
                </p>
                <p className="text-xs text-gray-500 mt-1">Semi-sextile, quincunx, quintile, etc.</p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors ${includeMinorAspects ? 'bg-celestial-purple' : 'bg-cosmic-600'}`}>
                <div className={`w-4 h-4 mt-1 rounded-full bg-white transition-transform ${includeMinorAspects ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </motion.button>
          </div>
        </div>

        {/* Current Settings Summary */}
        <div className="pt-4 border-t border-cosmic-700">
          <p className="text-xs text-gray-500">Current Settings</p>
          <p className="text-sm text-gray-300 mt-1">
            {ZODIAC_OPTIONS.find(o => o.value === zodiacSystem)?.label}
            {zodiacSystem === 'vedic' && (
              <span className="text-celestial-pink"> ({AYANAMSA_OPTIONS.find(o => o.value === ayanamsa)?.label})</span>
            )}
            <span className="text-gray-500"> • </span>
            {HOUSE_SYSTEM_OPTIONS.find(o => o.value === houseSystem)?.label}
            {includeNakshatras && <span className="text-celestial-pink"> • Nakshatras</span>}
            {includeWesternAspects && <span className="text-celestial-gold"> • Western Aspects</span>}
            {includeMinorAspects && <span className="text-celestial-purple"> • Minor Aspects</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChartSettings
