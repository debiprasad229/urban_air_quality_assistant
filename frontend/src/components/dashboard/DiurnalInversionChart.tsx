import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Sun, AlertTriangle, Info } from 'lucide-react';
import { HourlyForecastPoint } from '../../api/types';

interface DiurnalInversionChartProps {
  data: HourlyForecastPoint[];
}

export const DiurnalInversionChart: React.FC<DiurnalInversionChartProps> = ({
  data,
}) => {
  const chartData = data.map((d, index) => ({
    ...d,
    index,
    displayTime: d.time.includes('T')
      ? d.time.split('T')[1].slice(0, 5)
      : d.time.slice(0, 5),
  }));

  const aerationTimes = chartData.filter((d) => d.is_aeration_window).map((d) => d.displayTime);
  const aerationStart = aerationTimes.length > 0 ? aerationTimes[0] : '12:00';
  const aerationEnd = aerationTimes.length > 0 ? aerationTimes[aerationTimes.length - 1] : '15:00';

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Diurnal Inversion & Hourly PM₂.₅ Dynamics
          </h2>
          <p className="text-xs text-slate-400">
            Thermal boundary layer compression traps pollution overnight; midday solar heating dilutes smog.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500"></span>
            <span>Inversion Peak</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500"></span>
            <span>Solar Aeration Window</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />

            <XAxis
              dataKey="displayTime"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
            />

            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              unit=" µg"
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as HourlyForecastPoint & { displayTime: string };
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
                      <div className="font-bold text-white flex items-center justify-between gap-4">
                        <span>{pt.displayTime}</span>
                        <span className="text-emerald-400 font-semibold">{pt.calculated_aqi} AQI</span>
                      </div>
                      <div className="text-slate-300">
                        PM₂.₅: <span className="font-bold text-white">{pt.pm25_ug_m3} µg/m³</span>
                      </div>
                      <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                        {pt.is_aeration_window ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <Sun className="w-3.5 h-3.5" /> Optimal Aeration Window
                          </span>
                        ) : pt.is_inversion_peak ? (
                          <span className="text-rose-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Severe Inversion Layer
                          </span>
                        ) : (
                          <span>{pt.aqi_category}</span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Aeration Window Zone */}
            {aerationTimes.length > 0 && (
              <ReferenceArea
                x1={aerationStart}
                x2={aerationEnd}
                fill="#10b981"
                fillOpacity={0.12}
                stroke="#10b981"
                strokeOpacity={0.3}
                strokeDasharray="3 3"
              />
            )}

            {/* WHO 24-hr guideline reference line (15 µg/m³) */}
            <ReferenceLine
              y={15}
              stroke="#10b981"
              strokeDasharray="4 4"
              label={{ value: 'WHO Target (15)', fill: '#10b981', fontSize: 10, position: 'insideTopLeft' }}
            />

            <Area
              type="monotone"
              dataKey="pm25_ug_m3"
              stroke="#f43f5e"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#pm25Gradient)"
              activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Atmospheric Insight Strip */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Atmospheric Physics Tip:</strong> Boundary layer height expands from ~150m at dawn to ~1200m at 14:00, creating natural dilution for 15-minute cross-ventilation flushes.
          </span>
        </div>
      </div>
    </div>
  );
};
