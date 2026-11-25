import React, { useState, useEffect } from 'react';
import { Navigation, Bike, Car, Train, Bus, TrendingDown, Zap, Shield } from 'lucide-react';
import { CommuteComparisonResponse } from '../../api/types';
import { apiClient } from '../../api/client';

interface CommuteComparatorCardProps {
  currentOutdoorPm25: number;
}

export const CommuteComparatorCard: React.FC<CommuteComparatorCardProps> = ({
  currentOutdoorPm25,
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(8.0);
  const [maskType, setMaskType] = useState<string>('NONE');
  const [baselineMode, setBaselineMode] = useState<string>('SOLO_CAR_GASOLINE');
  const [result, setResult] = useState<CommuteComparisonResponse | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const fetchComparison = async () => {
      try {
        const res = await apiClient.compareCommute({
          distance_km: distanceKm,
          ambient_pm25_ug_m3: currentOutdoorPm25,
          baseline_mode: baselineMode,
          mask_type: maskType,
        });
        if (!isCancelled) setResult(res);
      } catch (err) {
        console.error('Failed to compare commute options:', err);
      }
    };

    fetchComparison();
    return () => {
      isCancelled = true;
    };
  }, [distanceKm, currentOutdoorPm25, baselineMode, maskType]);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'SOLO_CAR_GASOLINE':
        return <Car className="w-4 h-4 text-amber-400" />;
      case 'CAR_EV':
        return <Zap className="w-4 h-4 text-sky-400" />;
      case 'ELECTRIC_METRO':
        return <Train className="w-4 h-4 text-emerald-400" />;
      case 'BUS_DIESEL':
        return <Bus className="w-4 h-4 text-sky-400" />;
      case 'BICYCLE':
      case 'WALK':
        return <Bike className="w-4 h-4 text-rose-400" />;
      default:
        return <Navigation className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatModeName = (mode: string) => {
    switch (mode) {
      case 'SOLO_CAR_GASOLINE':
        return 'Solo Gasoline Car';
      case 'CAR_HYBRID':
        return 'Hybrid Car';
      case 'CAR_EV':
        return 'Electric Car (EV)';
      case 'ELECTRIC_METRO':
        return 'Electric Metro / Subway';
      case 'BUS_DIESEL':
        return 'Public Transit Bus';
      case 'BICYCLE':
        return 'Active Bicycle';
      case 'WALK':
        return 'Walking';
      default:
        return mode;
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Transit Inhaled Dose vs. Emissions</h3>
            <p className="text-xs text-slate-400">
              EPA Exposure Factors (Minute Ventilation) vs. UK DEFRA Carbon Factors
            </p>
          </div>
        </div>

        {/* Distance Slider */}
        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-400">Distance:</span>
          <span className="text-xs font-bold text-emerald-400">{distanceKm} km</span>
          <input
            type="range"
            aria-label="Commute Distance"
            min="1"
            max="30"
            step="1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* Baseline Mode & Mask Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="baseline-mode-select" className="text-[11px] text-slate-400 block mb-1">
            Baseline Mode (Compare Against)
          </label>
          <select
            id="baseline-mode-select"
            aria-label="Baseline Mode"
            value={baselineMode}
            onChange={(e) => setBaselineMode(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="SOLO_CAR_GASOLINE">Solo Gasoline Car</option>
            <option value="CAR_HYBRID">Hybrid Car</option>
            <option value="BUS_DIESEL">Public Transit Bus</option>
          </select>
        </div>

        <div>
          <label htmlFor="mask-type-select" className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Respiratory Mask Protection</span>
          </label>
          <select
            id="mask-type-select"
            aria-label="Mask Type"
            value={maskType}
            onChange={(e) => setMaskType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="NONE">No Mask (0% filtration)</option>
            <option value="SURGICAL">Surgical Mask (20% filtration)</option>
            <option value="N95_FFP2">Fitted N95 / FFP2 (95% filtration)</option>
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {result?.options.map((opt) => {
          const isRecommended = opt.mode === result.best_exposure_mode;
          const isExtreme = opt.exposure_tier === 'EXTREME';

          return (
            <div
              key={opt.mode}
              className={`p-3.5 rounded-xl border transition-all ${
                isRecommended
                  ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : isExtreme
                  ? 'bg-rose-950/10 border-rose-500/20'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-slate-800">{getModeIcon(opt.mode)}</div>
                  <span className="text-xs font-bold text-white">{formatModeName(opt.mode)}</span>
                </div>
                {isRecommended && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Recommended
                  </span>
                )}
                {isExtreme && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                    High Inhaled Dose
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Travel Time</span>
                  <span className="font-bold text-slate-200">{opt.duration_minutes} min</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Inhaled Dose</span>
                  <span
                    className={`font-black ${
                      isExtreme ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {opt.inhaled_pm25_ug} µg
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Emitted CO₂</span>
                  <span className="font-bold text-slate-200">{opt.tailpipe_co2e_grams} g</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Avoided Impact & Recommendation Summary */}
      {result && (result.avoided_co2e_grams > 0 || result.recommendation_summary) && (
        <div className="mt-3 space-y-1.5 text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl">
          {result.avoided_co2e_grams > 0 && (
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Choosing <strong>{formatModeName(result.best_exposure_mode)}</strong> over{' '}
                <strong>{formatModeName(result.baseline_mode)}</strong> saves{' '}
                <strong>{(result.avoided_co2e_grams / 1000).toFixed(2)} kg CO₂e</strong> while reducing inhaled PM₂.₅ by{' '}
                <strong>{result.avoided_exposure_ug.toFixed(1)} µg</strong>!
              </span>
            </div>
          )}
          {result.recommendation_summary && (
            <p className="text-[11px] text-emerald-200/80 pl-6">
              {result.recommendation_summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
