import { motion } from 'framer-motion'
import { LayoutDashboard, Users, Calculator, Settings, HelpCircle, FileText, Star, Database, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

type NavigationItem = {
  name: string
  icon: LucideIcon
  page: string
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { name: 'Clients', icon: Users, page: 'clients' },
  { name: 'Charts', icon: Calculator, page: 'charts' },
  { name: 'Birth Chart', icon: Star, page: 'birthchart' },
  { name: 'Reports', icon: FileText, page: 'reports' },
  { name: 'Backups', icon: Database, page: 'backups' },
  { name: 'Settings', icon: Settings, page: 'settings' },
  { name: 'Help', icon: HelpCircle, page: 'help' },
]

export const Sidebar = ({ currentPage, onNavigate }: SidebarProps) => {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 glass-strong border-r border-cosmic-700/50 h-[calc(100vh-73px)] sticky top-[73px]"
    >
      <nav className="p-4 space-y-2">
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
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-cosmic-600 to-cosmic-500 text-white shadow-lg glow-purple'
                  : 'text-gray-400 hover:text-white hover:bg-cosmic-800'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto h-2 w-2 rounded-full bg-celestial-gold"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass rounded-lg p-4">
          <p className="text-xs font-medium text-gray-400 mb-2">Quick Tip</p>
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-cosmic-800 rounded text-cosmic-300">Cmd</kbd> +{' '}
            <kbd className="px-1 py-0.5 bg-cosmic-800 rounded text-cosmic-300">K</kbd> to search
          </p>
        </div>
      </div>
    </motion.aside>
  )
}
