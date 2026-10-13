import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {children}
    </motion.div>
  );
}
