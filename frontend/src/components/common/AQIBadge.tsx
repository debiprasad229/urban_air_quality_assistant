import React from 'react';

interface AQIBadgeProps {
  aqi: number;
  pm25: number;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AQIBadge: React.FC<AQIBadgeProps> = ({
  aqi,
  pm25,
  size = 'md',
}) => {
  let bgClass = 'bg-emerald-600 text-white';
  let borderClass = 'border-emerald-500';
  let categoryLabel = 'Good';

  if (aqi <= 50) {
    bgClass = 'bg-emerald-500 text-white';
    borderClass = 'border-emerald-400';
    categoryLabel = 'Good';
  } else if (aqi <= 100) {
    bgClass = 'bg-amber-400 text-slate-950 font-bold';
    borderClass = 'border-amber-500';
    categoryLabel = 'Moderate';
  } else if (aqi <= 150) {
    bgClass = 'bg-orange-500 text-slate-950 font-bold';
    borderClass = 'border-orange-600';
    categoryLabel = 'Sensitive Groups';
  } else if (aqi <= 200) {
    bgClass = 'bg-red-600 text-white';
    borderClass = 'border-red-500';
    categoryLabel = 'Unhealthy';
  } else if (aqi <= 300) {
    bgClass = 'bg-purple-600 text-white';
    borderClass = 'border-purple-500';
    categoryLabel = 'Very Unhealthy';
  } else {
    bgClass = 'bg-rose-950 text-rose-100';
    borderClass = 'border-rose-800';
    categoryLabel = 'Hazardous';
  }

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border shadow-sm transition-all ${bgClass} ${borderClass} ${
        isSmall ? 'px-2.5 py-1 text-xs' : isLarge ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-sm'
      }`}
    >
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={`${isLarge ? 'text-3xl' : isSmall ? 'text-sm' : 'text-xl'} font-black tracking-tight`}>
            {aqi}
          </span>
          <span className="text-[10px] uppercase tracking-wider opacity-85 font-semibold">
            US AQI
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] opacity-90">
          <span className="font-semibold uppercase tracking-wider">{categoryLabel}</span>
          <span>•</span>
          <span>{pm25.toFixed(1)} µg/m³ PM₂.₅</span>
        </div>
      </div>
    </div>
  );
};
