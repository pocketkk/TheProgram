/**
 * Newspaper Masthead Component
 *
 * The ornate newspaper header with title, date, and decorative elements.
 */

import { motion } from 'framer-motion';

interface MastheadProps {
  dateDisplay: string;
  style: 'victorian' | 'modern';
}

export function Masthead({ dateDisplay, style }: MastheadProps) {
  const isVictorian = style === 'victorian';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`
        border-b-4 pb-4 mb-6
        ${isVictorian ? 'border-amber-800' : 'border-stone-700'}
      `}
    >
      {/* Ornate top border */}
      {isVictorian && (
        <div className="flex items-center justify-center mb-2 gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700 to-amber-700" />
          <div className="text-amber-600 text-lg">✦</div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700 to-amber-700" />
        </div>
      )}

      {/* Main title */}
      <div className="text-center">
        <h1
          className={`
            font-accent tracking-wider
            ${isVictorian
              ? 'text-5xl md:text-6xl text-stone-900 drop-shadow-[0_2px_2px_rgba(217,119,6,0.3)]'
              : 'text-4xl md:text-5xl text-stone-800'
            }
          `}
        >
          THE COSMIC CHRONICLE
        </h1>

        {/* Subtitle/tagline */}
        <p
          className={`
            font-accent text-sm tracking-widest mt-1
            ${isVictorian ? 'text-amber-700' : 'text-stone-600'}
          `}
        >
          {isVictorian
            ? 'A CHRONICLE OF CELESTIAL OCCURRENCES'
            : 'Historical Events from the Stars'
          }
        </p>

        {/* Date display */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className={`h-px w-12 ${isVictorian ? 'bg-amber-600' : 'bg-stone-500'}`} />
          <p
            className={`
              font-accent text-base tracking-wide
              ${isVictorian ? 'text-stone-800' : 'text-stone-700'}
            `}
          >
            {dateDisplay}
          </p>
          <div className={`h-px w-12 ${isVictorian ? 'bg-amber-600' : 'bg-stone-500'}`} />
        </div>
      </div>

      {/* Ornate bottom border */}
      {isVictorian && (
        <div className="flex items-center justify-center mt-2 gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700 to-amber-700" />
          <div className="text-amber-600 text-lg">✦</div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700 to-amber-700" />
        </div>
      )}
    </motion.header>
  );
}
