import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface SafetyAdvisoryBannerProps {
  level: string;
  aqi: number;
}

export const SafetyAdvisoryBanner: React.FC<SafetyAdvisoryBannerProps> = ({
  level,
  aqi,
}) => {
  if (level !== 'SEVERE_WARNING' && aqi < 200) return null;

  return (
    <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 shadow-lg mb-4 animate-in fade-in duration-300">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-rose-200 uppercase tracking-wide">
              Severe Smog Harm-Reduction Advisory Active
            </h3>
            <span className="text-[10px] font-black uppercase bg-rose-500 text-white px-2 py-0.5 rounded-full">
              AQI {aqi}
            </span>
          </div>

          <p className="text-xs text-rose-300/90 leading-relaxed">
            Atmospheric conditions have reached <strong>severe/hazardous particulate levels</strong>.
            Exercise strict harm-reduction protocols:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-rose-500/20 text-[11px] text-rose-200">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span><strong>N95 / FFP2 Mandatory:</strong> Zero unmasked transit</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span><strong>No Outdoor Cardio:</strong> Shift all exercise indoors</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span><strong>Windows Latched:</strong> Purifiers on continuous High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
