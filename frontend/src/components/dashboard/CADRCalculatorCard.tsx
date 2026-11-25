import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw } from 'lucide-react';
import { CADRResponse } from '../../api/types';
import { apiClient } from '../../api/client';

export const CADRCalculatorCard: React.FC = () => {
  const [length, setLength] = useState<number>(5);
  const [width, setWidth] = useState<number>(4);
  const [height, setHeight] = useState<number>(2.8);
  const [existingCadr, setExistingCadr] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<CADRResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    const calculate = async () => {
      setLoading(true);
      try {
        const res = await apiClient.calculateCADR({
          room_length_m: length,
          room_width_m: width,
          ceiling_height_m: height,
          current_purifier_cadr_m3h: existingCadr || null,
        });
        if (!isCancelled) setResult(res);
      } catch (err) {
        console.error('CADR calculation failed:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void calculate();
    }, 150);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [length, width, height, existingCadr]);

  const verdictLabel =
    result?.is_existing_purifier_adequate === false
      ? 'UNDERSIZED'
      : 'SUFFICIENT';

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Indoor CADR Room Sizer</h3>
            <p className="text-xs text-slate-400">ANSI/AHAM AC-1 (4.5 Air Changes / Hour)</p>
          </div>
        </div>
        {loading && <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />}
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Length */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Length</span>
            <span className="font-bold text-white">{length.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            aria-label="Room Length in meters"
            min="2"
            max="12"
            step="0.5"
            value={length}
            onChange={(e) => setLength(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* Width */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Width</span>
            <span className="font-bold text-white">{width.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            aria-label="Room Width in meters"
            min="2"
            max="12"
            step="0.5"
            value={width}
            onChange={(e) => setWidth(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* Height */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Ceiling Height</span>
            <span className="font-bold text-white">{height.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            aria-label="Ceiling Height in meters"
            min="2.0"
            max="4.0"
            step="0.1"
            value={height}
            onChange={(e) => setHeight(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>
      </div>

      {/* Existing Purifier Optional Input */}
      <div className="mb-4">
        <label htmlFor="existing-cadr-input" className="text-xs text-slate-400 flex items-center justify-between mb-1">
          <span>Test Existing Purifier Clean Air Delivery Rate (Optional):</span>
          <span className="text-slate-500 font-mono text-[11px]">m³/h</span>
        </label>
        <input
          id="existing-cadr-input"
          type="number"
          placeholder="e.g. 350 m³/h (leave empty if sizing a new unit)"
          value={existingCadr || ''}
          onChange={(e) => setExistingCadr(e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Result Metrics */}
      {result && (
        <div className="space-y-3 pt-3 border-t border-slate-700/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Room Volume
              </span>
              <span className="text-base font-black text-white">{result.room_volume_m3} m³</span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Target (4.5 ACH)
              </span>
              <span className="text-base font-black text-sky-400">
                {result.required_cadr_m3h} m³/h
              </span>
              <span className="text-[10px] text-slate-500 block">({result.required_cadr_cfm} CFM)</span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                90% Clearance
              </span>
              <span className="text-base font-black text-emerald-400">
                {result.clearance_time_minutes_90pct} min
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Purifier Status
              </span>
              <span
                className={`text-xs font-bold uppercase ${
                  verdictLabel === 'SUFFICIENT' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {verdictLabel}
              </span>
            </div>
          </div>

          {result.existing_purifier_recommendation && (
            <p className="text-[11px] text-slate-400">{result.existing_purifier_recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
};
