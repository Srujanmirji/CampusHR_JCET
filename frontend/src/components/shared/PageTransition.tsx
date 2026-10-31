import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function PageTransition({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {children}
    </motion.div>
  );
}
