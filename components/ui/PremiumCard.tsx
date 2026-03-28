'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export default function PremiumCard({
  children,
  className,
  featured = false,
  hoverable = true,
  onClick,
}: PremiumCardProps) {
  const cardClasses = cn(
    'rounded-[16px] backdrop-blur-2xl bg-[rgba(15,48,63,0.2)] shadow-card transition-all duration-300',
    featured
      ? 'border border-gold/40 shadow-glow'
      : 'border border-gold/20',
    !featured && 'hover:border-gold/40 hover:shadow-card-hover',
    className
  );

  if (hoverable) {
    return (
      <motion.div
        className={cardClasses}
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, bounce: 0.2 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={cardClasses} onClick={onClick}>{children}</div>;
}
