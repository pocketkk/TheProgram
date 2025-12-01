/**
 * Section Tabs Component
 *
 * Tab navigation for newspaper sections with smooth transitions.
 */

import { motion } from 'framer-motion';

interface SectionTabsProps {
  sections: string[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  style: 'victorian' | 'modern';
}

export function SectionTabs({
  sections,
  activeSection,
  onSectionChange,
  style,
}: SectionTabsProps) {
  const isVictorian = style === 'victorian';

  return (
    <div
      className={`
        flex gap-1 mb-6 border-b-2
        ${isVictorian ? 'border-amber-700' : 'border-stone-600'}
      `}
    >
      {sections.map((section) => {
        const isActive = section === activeSection;

        return (
          <button
            key={section}
            onClick={() => onSectionChange(section)}
            className={`
              relative px-4 py-2 font-accent text-sm tracking-wide
              transition-all duration-200
              ${isActive
                ? isVictorian
                  ? 'text-stone-900 font-bold'
                  : 'text-stone-900 font-bold'
                : isVictorian
                  ? 'text-stone-600 hover:text-stone-800'
                  : 'text-stone-600 hover:text-stone-800'
              }
            `}
          >
            {section}

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className={`
                  absolute bottom-0 left-0 right-0 h-1
                  ${isVictorian
                    ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600'
                    : 'bg-stone-700'
                  }
                `}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
