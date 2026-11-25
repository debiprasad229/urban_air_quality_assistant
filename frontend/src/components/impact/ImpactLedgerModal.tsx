import React, { useState } from 'react';
import { X, TreePine, Send } from 'lucide-react';
import { CommunityImpactSummary } from '../../api/types';
import { apiClient } from '../../api/client';

interface ImpactLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CommunityImpactSummary;
  onActionLogged: (updated: CommunityImpactSummary) => void;
}

export const ImpactLedgerModal: React.FC<ImpactLedgerModalProps> = ({
  isOpen,
  onClose,
  summary,
  onActionLogged,
}) => {
  const [actionType, setActionType] = useState<string>('TRANSIT_MODAL_SHIFT');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const treeDayEquiv = summary.total_co2e_avoided_kg / 0.06;

  const handleLogAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let co2Kg = 1.1;
      let pmUg = 42.5;

      if (actionType === 'AERATION_TIMED') {
        co2Kg = 0.2;
        pmUg = 65.0;
      } else if (actionType === 'PURIFIER_OPTIMIZED') {
        co2Kg = 0.12;
        pmUg = 85.0;
      }

      const updated = await apiClient.recordImpactAction({
        action_type: actionType,
        avoided_co2e_kg: co2Kg,
        avoided_pm25_ug: pmUg,
      });

      onActionLogged(updated);
      setDescription('');
    } catch (err) {
      console.error('Failed to log action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TreePine className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Community Clean Air Ledger</h2>
            <p className="text-xs text-slate-400">
              Collective avoided emissions and inhaled dose reductions
            </p>
          </div>
        </div>

        {/* Impact Cards Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Avoided CO₂e
            </span>
            <span className="text-xl font-black text-emerald-400">
              {summary.total_co2e_avoided_kg.toFixed(1)} kg
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Inhaled PM₂.₅ Avoided
            </span>
            <span className="text-xl font-black text-sky-400">
              {(summary.total_pm25_avoided_ug / 1000).toFixed(2)} mg
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Actions Logged
            </span>
            <span className="text-xl font-black text-white">
              {summary.total_actions_logged}
            </span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Tree-Day Equiv.
            </span>
            <span className="text-xl font-black text-amber-400">
              {treeDayEquiv.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Action Logging Form */}
        <form onSubmit={handleLogAction} className="space-y-3 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-200">Log Your Clean Air Action Today</h3>

          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TRANSIT_MODAL_SHIFT">Took Electric Metro Instead of Driving (-1.1 kg CO₂)</option>
            <option value="AERATION_TIMED">Executed Midday Rapid Aeration Flush (-65 µg dose)</option>
            <option value="PURIFIER_OPTIMIZED">Ran Purifier on High During Dawn Peak (-85 µg dose)</option>
          </select>

          <input
            type="text"
            placeholder="Add personal notes (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Logging...' : 'Add to Collective Impact'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
