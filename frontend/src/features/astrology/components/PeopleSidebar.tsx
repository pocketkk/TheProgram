import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePeopleStore } from '../stores/peopleStore'
import { PersonCard } from './PersonCard'
import { RELATIONSHIP_LABELS, RELATIONSHIP_TYPES, type RelationshipType } from '@/lib/api/birthData'
import { Button } from '@/components/ui/Button'

interface PeopleSidebarProps {
  onAddPerson: () => void
}

export function PeopleSidebar({ onAddPerson }: PeopleSidebarProps) {
  const {
    sidebarOpen,
    toggleSidebar,
    filterByRelationship,
    setFilterByRelationship,
    loadPeople,
    selectPerson,
    selectedPersonId,
    getFilteredPeople,
    isLoading,
    error,
  } = usePeopleStore()

  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filteredPeople = getFilteredPeople()

  // Load people on mount
  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  return (
    <motion.aside
      className={cn(
        'glass-strong border-r border-cosmic-700/50 flex flex-col h-full',
        'sticky top-0 transition-all duration-300'
      )}
      initial={false}
      animate={{
        width: sidebarOpen ? '16rem' : '3rem',
      }}
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-3 border-b border-cosmic-700/50">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-celestial-gold" />
            <h2 className="font-semibold text-white">People</h2>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hover:bg-cosmic-800/50"
          noAnimation
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            key="sidebar-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Add Person Button */}
            <div className="p-3 border-b border-cosmic-700/50">
              <Button
                variant="primary"
                size="sm"
                onClick={onAddPerson}
                className="w-full"
              >
                <Plus className="w-4 h-4" />
                Add Person
              </Button>
            </div>

            {/* Filter Dropdown */}
            <div className="p-3 border-b border-cosmic-700/50 relative">
              <button
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
                  'bg-cosmic-900/50 hover:bg-cosmic-800/50 transition-colors',
                  'text-sm text-cosmic-200'
                )}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span>
                    {filterByRelationship === 'all'
                      ? 'All People'
                      : RELATIONSHIP_LABELS[filterByRelationship]}
                  </span>
                </div>
                <ChevronRight
                  className={cn(
                    'w-4 h-4 transition-transform',
                    filterDropdownOpen && 'rotate-90'
                  )}
                />
              </button>

              {/* Filter dropdown menu */}
              <AnimatePresence>
                {filterDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'absolute top-full left-3 right-3 mt-1 z-10',
                      'glass-strong rounded-lg border border-cosmic-700/50',
                      'shadow-xl max-h-64 overflow-y-auto'
                    )}
                  >
                    {/* All option */}
                    <button
                      onClick={() => {
                        setFilterByRelationship('all')
                        setFilterDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-cosmic-800/50',
                        'transition-colors first:rounded-t-lg',
                        filterByRelationship === 'all' &&
                          'bg-cosmic-700/50 text-celestial-gold'
                      )}
                    >
                      All People
                    </button>

                    {/* Relationship type options */}
                    {RELATIONSHIP_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setFilterByRelationship(type)
                          setFilterDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-cosmic-800/50',
                          'transition-colors last:rounded-b-lg',
                          filterByRelationship === type &&
                            'bg-cosmic-700/50 text-celestial-gold'
                        )}
                      >
                        {RELATIONSHIP_LABELS[type]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* People List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="spinner h-8 w-8 border-2 border-celestial-gold" />
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {!isLoading && !error && filteredPeople.length === 0 && (
                <div className="text-center py-8 text-cosmic-400 text-sm">
                  {filterByRelationship === 'all' ? (
                    <>
                      <p className="mb-2">No people added yet</p>
                      <p className="text-xs">Click "Add Person" to start</p>
                    </>
                  ) : (
                    <>
                      <p className="mb-2">
                        No {RELATIONSHIP_LABELS[filterByRelationship].toLowerCase()}s
                        found
                      </p>
                      <button
                        onClick={() => setFilterByRelationship('all')}
                        className="text-celestial-gold hover:underline text-xs"
                      >
                        Show all people
                      </button>
                    </>
                  )}
                </div>
              )}

              {!isLoading &&
                !error &&
                filteredPeople.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    isSelected={person.id === selectedPersonId}
                    onClick={() => selectPerson(person.id)}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state - show icon only */}
      {!sidebarOpen && (
        <div className="flex flex-col items-center gap-4 p-2">
          <button
            onClick={onAddPerson}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg',
              'bg-cosmic-800/50 hover:bg-cosmic-700/50 transition-colors',
              'text-celestial-gold'
            )}
            title="Add Person"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}
    </motion.aside>
  )
}
