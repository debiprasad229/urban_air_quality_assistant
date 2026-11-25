import React from 'react';
import { Wind, Clock, ShieldCheck } from 'lucide-react';

interface AerationWindowCardProps {
  recommended: boolean;
  windowText?: string;
  rationale?: string;
  currentAqi: number;
}

export const AerationWindowCard: React.FC<AerationWindowCardProps> = ({
  recommended,
  windowText,
  rationale,
  currentAqi,
}) => {
  return (
    <div
      className={`border rounded-2xl p-5 shadow-sm transition-all ${
        recommended
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
          : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <div
            className={`p-2 rounded-xl ${
              recommended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Window Aeration Guidance</h3>
            <p className="text-xs text-slate-400">Indoor CO₂ & VOC Flush Protocol</p>
          </div>
        </div>

        <span
          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            recommended
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {recommended ? 'AERATION SAFE WINDOW' : 'KEEP WINDOWS SEALED'}
        </span>
      </div>

      {recommended ? (
        <div className="space-y-3">
          <div className="flex items-start space-x-2 text-xs text-emerald-300 bg-emerald-900/30 p-3 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
            <div>
              <span className="font-bold block mb-0.5">
                {windowText || 'Solar convective mixing active (15-min flush)'}
              </span>
              <span>
                {rationale ||
                  'Open opposing windows for a 15-minute rapid flush to purge accumulated indoor CO₂ and VOCs.'}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <p>• Post-flush recovery: Seal windows and run your air purifier on Turbo for 20 minutes.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start space-x-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <div>
              <span>
                {rationale ||
                  `No safe outdoor aeration window available today due to elevated particulate smog (AQI ${currentAqi}).`}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            <p>• Infiltration defense: Keep windows latched; run air purifiers continuously on auto/medium.</p>
          </div>
        </div>
      )}
    </div>
  );
};
