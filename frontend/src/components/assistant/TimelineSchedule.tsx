import React from 'react';
import {
  Clock,
  Home,
  Sun,
  Shield,
  Fan,
  Navigation,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { RoutineSlot } from '../../api/types';

interface TimelineScheduleProps {
  slots: RoutineSlot[];
  isFallback?: boolean;
  impactExplanation?: string;
  optimalAerationWindow?: string;
}

export const TimelineSchedule: React.FC<TimelineScheduleProps> = ({
  slots,
  isFallback = false,
  impactExplanation,
  optimalAerationWindow,
}) => {
  const getSettingIcon = (setting: string) => {
    switch (setting) {
      case 'INDOOR':
        return <Home className="w-4 h-4 text-sky-400" />;
      case 'ENCLOSED_TRANSIT':
        return <Navigation className="w-4 h-4 text-emerald-400" />;
      case 'OUTDOOR':
        return <Sun className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          5-Slot Adaptive Daily Routine
        </h3>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
            isFallback
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          {isFallback ? 'Deterministic Planner' : 'Gemini AI Synthesized'}
        </span>
      </div>

      {impactExplanation && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p>{impactExplanation}</p>
            {optimalAerationWindow && (
              <p className="text-[11px] text-emerald-300/80 mt-1">
                <strong>Aeration Window:</strong> {optimalAerationWindow}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {slots.map((slot, index) => (
          <div
            key={index}
            className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 transition-all hover:border-slate-600 shadow-sm"
          >
            {/* Header: Time & Activity */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold bg-slate-900 text-slate-200 px-2 py-1 rounded-md border border-slate-800">
                  {slot.time_window}
                </span>
                <span className="text-xs font-bold text-white">{slot.activity}</span>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  slot.mask_required
                    ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                    : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                }`}
              >
                {slot.mask_required ? 'N95 Mandatory' : 'Mask Optional'}
              </span>
            </div>

            {/* Guidance Content */}
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {slot.advisory_action}
            </p>

            {/* Practical Protocols Footnote */}
            <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-700/50 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1">
                {getSettingIcon(slot.setting)}
                <span className="font-medium text-slate-300">{slot.setting}</span>
              </div>

              <div className="flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  Mask: <strong className="text-slate-200">{slot.mask_required ? 'N95/FFP2' : 'NONE'}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Fan className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Purifier: <strong className="text-slate-200">{slot.purifier_setting}</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
