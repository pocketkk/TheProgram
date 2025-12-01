/**
 * Page Controls Component
 *
 * Pagination controls with prev/next buttons and page display.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  style: 'victorian' | 'modern';
}

export function PageControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  style,
}: PageControlsProps) {
  const isVictorian = style === 'victorian';
  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPages;

  const buttonBaseClass = `
    flex items-center gap-2 px-4 py-2 rounded-lg
    font-accent tracking-wide transition-all duration-200
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  const buttonActiveClass = isVictorian
    ? `
      bg-gradient-to-br from-amber-700 to-amber-800
      text-amber-50 shadow-lg shadow-amber-900/30
      hover:shadow-xl hover:shadow-amber-900/40
      disabled:hover:shadow-lg
    `
    : `
      bg-stone-700 text-white shadow-md
      hover:bg-stone-800 hover:shadow-lg
      disabled:hover:bg-stone-700
    `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={`
        flex items-center justify-between pt-4 border-t-2
        ${isVictorian ? 'border-amber-700' : 'border-stone-600'}
      `}
    >
      {/* Previous button */}
      <button
        onClick={onPrev}
        disabled={isPrevDisabled}
        className={`${buttonBaseClass} ${buttonActiveClass}`}
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Previous</span>
      </button>

      {/* Page indicator */}
      <div
        className={`
          font-accent tracking-wide
          ${isVictorian ? 'text-stone-900' : 'text-stone-800'}
        `}
      >
        <span className="font-bold">{currentPage}</span>
        <span className="mx-2 text-stone-600">/</span>
        <span>{totalPages}</span>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={isNextDisabled}
        className={`${buttonBaseClass} ${buttonActiveClass}`}
      >
        <span className="text-sm">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
