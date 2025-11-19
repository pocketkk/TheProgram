import { motion } from 'framer-motion'
import { Calculator, TrendingUp, Clock, Plus, Sparkles, Database, type LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  AnimatedCard,
  Button,
  Badge,
} from '@/components/ui'

export const DashboardPage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  // Calculate stats - hardcoded for single user app
  const totalCharts = 0
  const totalBirthData = 0

  type DashboardStat = {
    name: string
    value: string
    change: string
    icon: LucideIcon
    color: string
  }

  const stats: DashboardStat[] = [
    {
      name: 'Charts Calculated',
      value: totalCharts.toString(),
      change: totalCharts > 0 ? `${totalCharts} total` : 'No charts yet',
      icon: Calculator,
      color: 'text-celestial-gold',
    },
    {
      name: 'Birth Data Records',
      value: totalBirthData.toString(),
      change: totalBirthData > 0 ? `${totalBirthData} records` : 'No data yet',
      icon: TrendingUp,
      color: 'text-celestial-pink',
    },
    {
      name: 'Recent Activity',
      value: '0',
      change: 'Last 24 hours',
      icon: Clock,
      color: 'text-celestial-purple',
    },
  ]

  const recentCharts = [
    { name: 'My Natal Chart', type: 'Natal', date: '2 hours ago' },
    { name: 'Transit Chart', type: 'Transit', date: '5 hours ago' },
    { name: 'Synastry Reading', type: 'Synastry', date: 'Yesterday' },
    { name: 'Solar Return', type: 'Natal', date: '2 days ago' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-heading font-bold text-gradient-celestial mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your astrological practice today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="celestial" onClick={() => onNavigate('birthchart')}>
            <Plus className="h-4 w-4" />
            New Chart
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <AnimatedCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn('rounded-lg bg-cosmic-800 p-3', stat.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary">{stat.change}</Badge>
                  </div>
                  <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-400">{stat.name}</p>
                </CardContent>
              </AnimatedCard>
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Charts</CardTitle>
                  <CardDescription>Latest chart calculations</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('charts')}
                >
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCharts.map((chart, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg glass hover:bg-cosmic-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cosmic-600 to-cosmic-500 flex items-center justify-center text-white font-semibold">
                        {chart.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {chart.name}
                        </p>
                        <p className="text-xs text-gray-500">{chart.type} Chart</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{chart.date}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="primary"
                className="w-full justify-start"
                onClick={() => onNavigate('charts')}
              >
                <Calculator className="h-5 w-5" />
                Calculate New Chart
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate('backups')}
              >
                <Database className="h-5 w-5" />
                Backup & Restore
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate('settings')}
              >
                <Sparkles className="h-5 w-5" />
                Calculation Preferences
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-cosmic-600">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-gradient-to-br from-celestial-gold to-celestial-pink p-3">
                <Sparkles className="h-6 w-6 text-cosmic-950" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-lg mb-1">
                  Getting Started with The Program
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Calculate your first chart to begin exploring astrological insights and cosmic patterns.
                </p>
                <div className="flex gap-3">
                  <Button variant="celestial" size="sm" onClick={() => onNavigate('birthchart')}>
                    New Chart
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('help')}>
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Helper function for className
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
