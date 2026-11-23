import React from 'react';

export function SkeletonLine({ className = 'h-4 w-full' }) {
  return <div className={`bg-slate-200/80 animate-pulse rounded-md ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
      <SkeletonLine className="h-3 w-1/3" />
      <SkeletonLine className="h-8 w-1/2" />
      <SkeletonLine className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 overflow-hidden">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center py-2 border-b border-slate-100 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLine key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
