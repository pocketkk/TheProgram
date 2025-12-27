/**
 * Page Flip Animation Component
 *
 * Wraps content with 3D page-flip animation using Framer Motion.
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface PageFlipProps {
  direction: 'next' | 'prev';
  pageKey: string | number;
  children: React.ReactNode;
}

const pageFlipVariants: Variants = {
  enter: (direction: number) => ({
    rotateY: direction > 0 ? -90 : 90,
    opacity: 0,
    transformOrigin: direction > 0 ? 'left center' : 'right center',
    scale: 0.95,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
      opacity: { duration: 0.3 },
    },
  },
  exit: (direction: number) => ({
    rotateY: direction > 0 ? 90 : -90,
    opacity: 0,
    scale: 0.95,
    transformOrigin: direction > 0 ? 'right center' : 'left center',
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  }),
};

export function PageFlip({ direction, pageKey, children }: PageFlipProps) {
  // Convert direction to number for animation variant
  const directionNumber = direction === 'next' ? 1 : -1;

  return (
    <AnimatePresence mode="wait" custom={directionNumber}>
      <motion.div
        key={pageKey}
        custom={directionNumber}
        variants={pageFlipVariants}
        initial="enter"
        animate="center"
        exit="exit"
        style={{
          perspective: 2000,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
