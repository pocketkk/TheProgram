import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Moon, Stars, Zap, LogIn } from 'lucide-react'
import {
  Button,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  AnimatedCard,
  Input,
  Label,
  Badge,
  UserAvatar,
  Spinner,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui'

interface ShowcasePageProps {
  onNavigate: (page: string) => void
}

export const ShowcasePage = ({ onNavigate }: ShowcasePageProps) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen cosmic-bg relative overflow-hidden">
      <div className="starfield" />

      <div className="relative z-10 min-h-screen px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="mb-4 font-heading text-6xl font-bold md:text-8xl">
              <span className="text-gradient-celestial">The Program</span>
            </h1>
            <p className="text-xl text-gray-300 md:text-2xl">
              UI Component Library Showcase
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="success">Components Ready</Badge>
              <Badge variant="celestial">Cosmic Theme</Badge>
              <Badge variant="info">TypeScript</Badge>
            </div>

            {/* Navigation */}
            <div className="mt-6">
              <Button
                variant="celestial"
                size="lg"
                onClick={() => onNavigate('login')}
              >
                <LogIn className="h-5 w-5" />
                View Login Page
              </Button>
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-celestial-gold" />
                  Buttons
                </CardTitle>
                <CardDescription>Interactive button components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="primary" className="w-full">
                  Primary Button
                </Button>
                <Button variant="secondary" className="w-full">
                  Secondary Button
                </Button>
                <Button variant="outline" className="w-full">
                  Outline Button
                </Button>
                <Button variant="celestial" className="w-full">
                  <Sparkles className="h-4 w-4" />
                  Celestial Button
                </Button>
                <Button variant="danger" size="sm" className="w-full">
                  Danger (Small)
                </Button>
                <Button loading={loading} onClick={handleSubmit} className="w-full">
                  {loading ? 'Processing...' : 'Test Loading State'}
                </Button>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-celestial-cyan" />
                  Form Inputs
                </CardTitle>
                <CardDescription>Form input components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email" required>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" />
                </div>
                <div>
                  <Label htmlFor="error-demo">With Error</Label>
                  <Input
                    id="error-demo"
                    type="text"
                    error="This field is required"
                    placeholder="Invalid input"
                  />
                </div>
                <div>
                  <Label htmlFor="disabled">Disabled</Label>
                  <Input id="disabled" type="text" disabled placeholder="Disabled input" />
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stars className="h-5 w-5 text-celestial-pink" />
                  Badges & Avatars
                </CardTitle>
                <CardDescription>Status badges and user avatars</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="danger">Error</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">Avatars</p>
                  <div className="flex flex-wrap gap-3">
                    <UserAvatar name="John Doe" />
                    <UserAvatar name="Sarah Smith" />
                    <UserAvatar name="Mike Johnson" />
                    <UserAvatar name="Emily Brown" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">Spinners</p>
                  <div className="flex items-center gap-4">
                    <Spinner size="sm" />
                    <Spinner size="md" />
                    <Spinner size="lg" variant="celestial" />
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader>
                <CardTitle>Dialogs</CardTitle>
                <CardDescription>Modal dialogs and popups</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Open Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Welcome to The Program</DialogTitle>
                      <DialogDescription>
                        This is a beautiful cosmic-themed dialog component.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-gray-400">
                        Dialogs are great for confirmations and forms.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button variant="primary">Continue</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader>
                <CardTitle>Component Stats</CardTitle>
                <CardDescription>Library overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Components</span>
                    <span className="text-2xl font-bold text-gradient-cosmic">8+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Variants</span>
                    <span className="text-2xl font-bold text-gradient-cosmic">25+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">TypeScript</span>
                    <Badge variant="success">100%</Badge>
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard>
              <CardHeader>
                <CardTitle className="text-gradient-celestial">Ready to Build</CardTitle>
                <CardDescription>All components are production-ready</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400">
                  This UI library includes all components needed for beautiful interfaces.
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="celestial" className="w-full" onClick={() => onNavigate('login')}>
                    <Sparkles className="h-4 w-4" />
                    Try Login Page
                  </Button>
                </div>
              </CardContent>
            </AnimatedCard>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-gray-500">
              Built with React 18, TypeScript, Tailwind CSS, Framer Motion, and Radix UI
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/20 px-4 py-2 text-sm text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
              UI Component Library Ready
            </div>
          </motion.div>
        </div>

        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-celestial-purple"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}
