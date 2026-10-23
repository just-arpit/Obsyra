import React from 'react';
import { Severity } from '../types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, className = '', size = 'md' }: SeverityBadgeProps) {
  const configs: Record<Severity, { bg: string; text: string; border: string; dot: string; label: string }> = {
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      dot: 'bg-red-600',
      label: 'Critical',
    },
    high: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-600',
      label: 'High',
    },
    medium: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      dot: 'bg-yellow-600',
      label: 'Medium',
    },
    low: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-600',
      label: 'Low',
    },
    info: {
      bg: 'bg-neutral-100',
      text: 'text-neutral-700',
      border: 'border-neutral-200',
      dot: 'bg-neutral-500',
      label: 'Info',
    },
  };

  const c = configs[severity] || configs.info;
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-[4px] border ${c.bg} ${c.text} ${c.border} ${padding} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
}
