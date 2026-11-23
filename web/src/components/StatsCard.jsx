import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'green', trend }) {
  const colorMap = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-teal-50 text-teal-700 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  const badgeStyle = colorMap[color] || colorMap.green;

  return (
    <div className="bg-white rounded-2xl p-6 border border-emerald-100/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1 font-serif">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${badgeStyle}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs text-slate-600 font-medium">
          {trend}
        </div>
      )}
    </div>
  );
}
