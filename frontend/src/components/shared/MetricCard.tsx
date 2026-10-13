import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: motionTiming.duration,
        delay: index * motionTiming.stagger,
      }}
    >
      <Card
        className={`metric-card h-full ${
          href ? 'cursor-pointer transition-transform hover:scale-[1.01]' : ''
        }`}
        onClick={href ? () => navigate(href) : undefined}
      >
        <CardHeader>
          <CardTitle>
            <h2 className="metric-label">{label}</h2>
          </CardTitle>
          <Icon className="metric-icon" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="metric-value">{value}</p>
          <p className="metric-detail">{detail}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
