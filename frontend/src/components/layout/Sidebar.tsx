import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calculator,
  Settings,
  HelpCircle,
  Star,
  BookOpen,
  CalendarDays,
  Activity,
  Sparkles,
  Hexagon,
  Hash,
  User,
  Palette,
  Wand2,
  Grid3X3,
  Paintbrush,
  ChevronLeft,
  ChevronRight,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

type NavigationItem = {
  name: string
  icon: LucideIcon
  page: string
  section?: 'main' | 'exploration' | 'system'
}

const navigation: NavigationItem[] = [
  // Main section
  { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard', section: 'main' },
  { name: 'Astrology', icon: Star, page: 'astrology', section: 'main' },
  { name: 'Vedic', icon: Grid3X3, page: 'vedic', section: 'main' },
  { name: 'Cosmic Visualizer', icon: Calculator, page: 'charts', section: 'main' },
  // Exploration section (Phase 2)
  { name: 'Journal', icon: BookOpen, page: 'journal', section: 'exploration' },
  // Chronicle hidden for v1 launch - feature needs polish
  // { name: 'Chronicle', icon: CalendarDays, page: 'chronicle', section: 'exploration' },
  // Analysis section (Phase 3)
  { name: 'Transits', icon: Activity, page: 'transits', section: 'exploration' },
  { name: 'Tarot', icon: Sparkles, page: 'tarot', section: 'exploration' },
  { name: 'I-Ching', icon: Hexagon, page: 'iching', section: 'exploration' },
  { name: 'Numerology', icon: Hash, page: 'numerology', section: 'exploration' },
  // Phase 4: Human Design
  { name: 'Human Design', icon: User, page: 'humandesign', section: 'exploration' },
  // Phase 5: Image Generation
  { name: 'Themes', icon: Palette, page: 'themes', section: 'exploration' },
  { name: 'Studio', icon: Wand2, page: 'studio', section: 'exploration' },
  // Phase 6: Art Therapy
  { name: 'Coloring Book', icon: Paintbrush, page: 'coloringbook', section: 'exploration' },
  // System section
  { name: 'Settings', icon: Settings, page: 'settings', section: 'system' },
  // Help page hidden for v1 launch - placeholder only
  // { name: 'Help', icon: HelpCircle, page: 'help', section: 'system' },
]

export const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed))
  }, [isCollapsed])

  const toggleCollapse = () => setIsCollapsed(!isCollapsed)

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isCollapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="glass-strong border-r border-cosmic-700/50 h-[calc(100vh-73px)] sticky top-[73px] flex flex-col"
    >
      {/* Collapse toggle button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-6 z-10 p-1.5 rounded-full bg-cosmic-700 border border-cosmic-600 text-gray-400 hover:text-white hover:bg-cosmic-600 transition-colors shadow-lg"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <nav className={cn('flex-1 space-y-2 overflow-y-auto', isCollapsed ? 'p-2' : 'p-4')}>
        {navigation.map((item, index) => {
          const isActive = currentPage === item.page
          const Icon = item.icon

          return (
            <motion.button
              key={item.name}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onNavigate(item.page)}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                'w-full flex items-center rounded-lg text-sm font-medium transition-all',
                isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg glow-purple'
                  : 'text-gray-400 hover:text-white hover:bg-cosmic-800'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto h-2 w-2 rounded-full bg-celestial-gold flex-shrink-0"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom section - only show when expanded */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-4"
          >
            <div className="glass rounded-lg p-4">
              <p className="text-xs font-medium text-gray-400 mb-2">Quick Tip</p>
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1 py-0.5 bg-cosmic-800 rounded text-cosmic-300">Cmd</kbd> +{' '}
                <kbd className="px-1 py-0.5 bg-cosmic-800 rounded text-cosmic-300">K</kbd> to search
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
