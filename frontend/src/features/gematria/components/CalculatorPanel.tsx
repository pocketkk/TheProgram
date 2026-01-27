/**
 * Calculator Panel Component
 *
 * Input panel for entering text and selecting gematria systems.
 */
import { useState } from 'react'
import { Search, Hash, Languages, Type } from 'lucide-react'
import type { GematriaSystem } from '@/lib/api/gematria'

interface CalculatorPanelProps {
  onCalculate: (text: string, system: GematriaSystem) => void
  isCalculating: boolean
}

export const CalculatorPanel = ({ onCalculate, isCalculating }: CalculatorPanelProps) => {
  const [text, setText] = useState('')
  const [system, setSystem] = useState<GematriaSystem>('all')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onCalculate(text.trim(), system)
    }
  }

  const systems: Array<{ id: GematriaSystem; label: string; icon: typeof Hash }> = [
    { id: 'all', label: 'All Systems', icon: Hash },
    { id: 'hebrew', label: 'Hebrew', icon: Languages },
    { id: 'english_ordinal', label: 'English Ordinal', icon: Type },
    { id: 'english_reduction', label: 'English Reduction', icon: Type },
    { id: 'transliteration', label: 'Transliteration', icon: Languages },
  ]

  return (
    <div className="glass-strong rounded-xl p-6">
      <h3 className="text-lg font-medium text-white mb-4">Gematria Calculator</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Enter text (Hebrew or English)
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a word, name, or phrase..."
            rows={3}
            className="w-full bg-cosmic-900/50 border border-cosmic-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cosmic-500 resize-none"
            dir="auto"
          />
        </div>

        {/* System Selector */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Calculation System
          </label>
          <div className="grid grid-cols-2 gap-2">
            {systems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSystem(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  system === id
                    ? 'bg-cosmic-600 text-white'
                    : 'bg-cosmic-800/50 text-gray-400 hover:text-white hover:bg-cosmic-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCalculating || !text.trim()}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCalculating ? (
            <>
              <Hash className="h-5 w-5 animate-pulse" />
              Calculating...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Calculate Gematria
            </>
          )}
        </button>
      </form>

      {/* Quick Examples */}
      <div className="mt-6 pt-4 border-t border-cosmic-700/50">
        <p className="text-xs text-gray-500 mb-2">Quick examples:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { text: 'אהבה', label: 'Love (Heb)' },
            { text: 'חי', label: 'Life (Heb)' },
            { text: 'Love', label: 'Love (Eng)' },
            { text: 'Peace', label: 'Peace' },
          ].map(({ text: example, label }) => (
            <button
              key={example}
              onClick={() => {
                setText(example)
                onCalculate(example, system)
              }}
              className="px-2 py-1 text-xs bg-cosmic-800 text-gray-400 rounded hover:bg-cosmic-700 hover:text-white transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
