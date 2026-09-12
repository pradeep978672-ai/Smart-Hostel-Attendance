import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
}) => {
  const colorMap = {
    blue: 'from-sky-500/20 to-blue-600/5 border-sky-500/30 text-sky-400',
    green: 'from-emerald-500/20 to-teal-600/5 border-emerald-500/30 text-emerald-400',
    red: 'from-rose-500/20 to-pink-600/5 border-rose-500/30 text-rose-400',
    purple: 'from-purple-500/20 to-indigo-600/5 border-purple-500/30 text-purple-400',
    amber: 'from-amber-500/20 to-orange-600/5 border-amber-500/30 text-amber-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 bg-gradient-to-br backdrop-blur-xl ${colorMap[color]} shadow-lg transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-3xl font-extrabold tracking-tight text-white">{value}</h3>
        {trend && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-900/50 border border-slate-700 text-slate-300">
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
