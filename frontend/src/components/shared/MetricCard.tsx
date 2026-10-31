import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motionTiming } from '@/lib/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  index,
  href,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  index: number;
  href?: string;
}) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: reducedMotion ? 0 : motionTiming.duration,
        delay: reducedMotion ? 0 : index * motionTiming.stagger,
      }}
    >
      <Card
        data-accent={index % 6}
        className={cn(
          'metric-card h-full',
          href && 'cursor-pointer transition-transform hover:scale-[1.01]',
        )}
        role={href ? 'link' : undefined}
        tabIndex={href ? 0 : undefined}
        onKeyDown={
          href
            ? (event) => {
                if (event.key === 'Enter') navigate(href);
              }
            : undefined
        }
        onClick={href ? () => navigate(href) : undefined}
      >
        <CardHeader>
          <CardTitle>
            <h2 className="metric-label">{label}</h2>
          </CardTitle>
          <span className="metric-icon-badge" aria-hidden="true">
            <Icon className="metric-icon" aria-hidden="true" />
          </span>
        </CardHeader>
        <CardContent>
          <p className="metric-value">{value}</p>
          <p className="metric-detail">{detail}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
