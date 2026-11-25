import React, { useState } from 'react';
import { Sparkles, User, Heart } from 'lucide-react';

export interface PlanFormInput {
  commute_distance_km: number;
  default_commute_mode: string;
  vulnerability_category: string;
  user_notes: string;
}

interface PlanRequestFormProps {
  onSubmit: (input: PlanFormInput) => void;
  isLoading: boolean;
}

export const PlanRequestForm: React.FC<PlanRequestFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(8.0);
  const [commuteMode, setCommuteMode] = useState<string>('SOLO_CAR_GASOLINE');
  const [vulnerability, setVulnerability] = useState<string>('GENERAL');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      commute_distance_km: distanceKm,
      default_commute_mode: commuteMode,
      vulnerability_category: vulnerability,
      user_notes: notes,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Customize Your Daily Smog Plan</h3>
        </div>
        <span className="text-[11px] text-slate-400">Adaptive AI Schedule</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Commute Distance */}
        <div>
          <label htmlFor="plan-commute-distance" className="text-xs text-slate-400 block mb-1">
            One-Way Commute Distance: <strong className="text-white">{distanceKm} km</strong>
          </label>
          <input
            id="plan-commute-distance"
            type="range"
            min="1"
            max="30"
            step="1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Primary Commute Mode */}
        <div>
          <label htmlFor="plan-commute-mode" className="text-xs text-slate-400 block mb-1">Typical Commute Mode</label>
          <select
            id="plan-commute-mode"
            value={commuteMode}
            onChange={(e) => setCommuteMode(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="SOLO_CAR_GASOLINE">Private Solo Car</option>
            <option value="CAR_EV">Electric Car (EV)</option>
            <option value="ELECTRIC_METRO">Electric Metro / Subway</option>
            <option value="BUS_DIESEL">Public Bus</option>
            <option value="BICYCLE">Active Bicycle</option>
            <option value="WALK">Walking</option>
          </select>
        </div>
      </div>

      {/* Vulnerability Segment */}
      <div>
        <span className="text-xs text-slate-400 block mb-1.5">Household Vulnerability Group</span>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Household Vulnerability Group">
          <button
            type="button"
            aria-pressed={vulnerability === 'GENERAL'}
            onClick={() => setVulnerability('GENERAL')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
              vulnerability === 'GENERAL'
                ? 'bg-slate-700 border-emerald-500 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> General Population
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Healthy adults, standard thresholds</div>
          </button>

          <button
            type="button"
            aria-pressed={vulnerability === 'SENSITIVE'}
            onClick={() => setVulnerability('SENSITIVE')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
              vulnerability === 'SENSITIVE'
                ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-amber-400" /> Sensitive / Vulnerable
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Children, elderly, respiratory/asthma</div>
          </button>
        </div>
      </div>

      {/* Optional Lifestyle Notes */}
      <div>
        <label htmlFor="plan-lifestyle-notes" className="text-xs text-slate-400 block mb-1">
          Lifestyle Notes / Habit Constraints (Optional)
        </label>
        <input
          id="plan-lifestyle-notes"
          type="text"
          placeholder="e.g. 'I walk my dog at 07:00' or 'School drop-off at 08:15'"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
      >
        <Sparkles className="w-4 h-4" />
        <span>{isLoading ? 'Generating Science-Grounded Plan...' : 'Synthesize Low-Emission Routine'}</span>
      </button>
    </form>
  );
};
