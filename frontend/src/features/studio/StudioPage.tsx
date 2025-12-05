/**
 * Studio Page - Multi-generator hub with tab navigation
 *
 * Features:
 * - Tarot Deck Generator (existing)
 * - Planet Image Generator (new)
 * - Extensible for future generators (Signs, Houses, Aspects)
 */
import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { TarotGeneratorPage } from '@/features/tarot-generator'
import { PlanetGeneratorPage } from '@/features/planet-generator'
import { cn } from '@/lib/utils'

type StudioTab = 'tarot' | 'planets'

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  testId?: string
}

function TabButton({ active, onClick, children, testId }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-6 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2',
        active
          ? 'bg-cosmic-800/50 text-white border-celestial-purple'
          : 'text-gray-400 hover:text-white border-transparent hover:bg-cosmic-800/30'
      )}
      data-testid={testId}
    >
      {children}
    </button>
  )
}

export function StudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('tarot')

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <Wand2 className="h-8 w-8 text-celestial-purple" />
          <div>
            <h1 className="text-3xl font-heading font-bold text-gradient-celestial">
              Studio
            </h1>
            <p className="text-gray-400 text-sm">
              Generate custom imagery with AI
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-b border-cosmic-light/20">
          <div className="flex gap-1">
            <TabButton
              active={activeTab === 'tarot'}
              onClick={() => setActiveTab('tarot')}
              testId="studio-tab-tarot"
            >
              Tarot Decks
            </TabButton>
            <TabButton
              active={activeTab === 'planets'}
              onClick={() => setActiveTab('planets')}
              testId="studio-tab-planets"
            >
              Planets
            </TabButton>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'tarot' && <TarotGeneratorPage embedded />}
        {activeTab === 'planets' && <PlanetGeneratorPage />}
      </div>
    </div>
  )
}
