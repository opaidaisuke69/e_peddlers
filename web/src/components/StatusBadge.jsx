import React from 'react';
import { APP_STATUS_CONFIG } from '../utils/constants';

export default function StatusBadge({ status, className = '' }) {
  const config = APP_STATUS_CONFIG[status] || {
    label: status ? status.replace(/_/g, ' ') : 'Unknown',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}
