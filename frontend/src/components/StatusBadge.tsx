import React from 'react';
import { VerificationStatus } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<
    VerificationStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    resolved: {
      label: 'Resolved',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    },
    still_present: {
      label: 'Still Present',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
    },
    new: {
      label: 'New Finding',
      bg: 'bg-brand-orange/10',
      text: 'text-brand-orange',
      border: 'border-brand-orange/30',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-brand-orange" />,
    },
    inconclusive: {
      label: 'Inconclusive',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />,
    },
  };

  const c = configs[status] || configs.new;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${c.bg} ${c.text} ${c.border} ${className}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
};
