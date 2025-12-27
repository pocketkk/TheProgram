import { motion } from 'framer-motion';

interface ChartGlowEffectProps {
  children: React.ReactNode;
  color: string | null;
  enabled: boolean; // false for primary chart
}

export function ChartGlowEffect({ children, color, enabled }: ChartGlowEffectProps) {
  if (!enabled || !color) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="relative"
      animate={{
        boxShadow: [
          `0 0 20px ${color}30, 0 0 40px ${color}15`,
          `0 0 25px ${color}40, 0 0 50px ${color}20`,
          `0 0 20px ${color}30, 0 0 40px ${color}15`,
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{ borderRadius: '50%' }}
    >
      {children}
    </motion.div>
  );
}
