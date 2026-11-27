import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { BackendHealthBanner } from './components/common/BackendHealthBanner';
import { AQIBadge } from './components/common/AQIBadge';
import { DiurnalInversionChart } from './components/dashboard/DiurnalInversionChart';
import { AerationWindowCard } from './components/dashboard/AerationWindowCard';
import { CADRCalculatorCard } from './components/dashboard/CADRCalculatorCard';
import { CommuteComparatorCard } from './components/dashboard/CommuteComparatorCard';
import { SafetyAdvisoryBanner } from './components/assistant/SafetyAdvisoryBanner';
import { PlanRequestForm } from './components/assistant/PlanRequestForm';
import { TimelineSchedule } from './components/assistant/TimelineSchedule';
import { ImpactLedgerModal } from './components/impact/ImpactLedgerModal';
import { useAirQualityDashboard } from './hooks/useAirQualityDashboard';

export const App: React.FC = () => {
  const {
    presets,
    selectedPreset,
    setSelectedPreset,
    airQuality,
    plan,
    planLoading,
    planError,
    impactSummary,
    setImpactSummary,
    backendHealth,
    checkHealth,
    handleFormSubmit,
  } = useAirQualityDashboard();

  const [isImpactModalOpen, setIsImpactModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-2 rounded-lg"
      >
        Skip to main content
      </a>

      <Header
        presets={presets}
        selectedPreset={selectedPreset}
        onSelectPreset={setSelectedPreset}
        onOpenImpactModal={() => setIsImpactModalOpen(true)}
        totalAvoidedKg={impactSummary.total_co2e_avoided_kg}
      />

      <BackendHealthBanner status={backendHealth} onRetry={checkHealth} />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* City Summary Top Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {airQuality.data_provenance}
              </span>
              <span className="text-xs text-slate-400">
                Lat: {airQuality.latitude.toFixed(2)}°, Lon: {airQuality.longitude.toFixed(2)}°
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {airQuality.location_name}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              {airQuality.health_summary || selectedPreset.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <AQIBadge aqi={airQuality.calculated_aqi} pm25={airQuality.pm25_ug_m3} size="lg" />
          </div>
        </div>

        {/* Dual-Pane Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Pane: Atmospheric Diagnostics & Calculators */}
          <div className="lg:col-span-7 space-y-6">
            <DiurnalInversionChart data={airQuality.hourly_forecast} />
            <AerationWindowCard
              recommended={airQuality.aeration_recommended}
              windowText={airQuality.aeration_window_text}
              rationale={airQuality.aeration_rationale}
              currentAqi={airQuality.calculated_aqi}
            />
            <CADRCalculatorCard />
            <CommuteComparatorCard currentOutdoorPm25={airQuality.pm25_ug_m3} />
          </div>

          {/* Right Pane: AI Assistant & Daily Decision Support */}
          <div className="lg:col-span-5 space-y-6">
            <SafetyAdvisoryBanner
              level={airQuality.safety_advisory_level}
              aqi={airQuality.calculated_aqi}
            />
            <PlanRequestForm onSubmit={handleFormSubmit} isLoading={planLoading} />

            {planError && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                {planError}
              </div>
            )}

            {plan && (
              <TimelineSchedule
                slots={plan.daily_schedule}
                isFallback={plan.is_fallback_plan}
                impactExplanation={plan.impact_explanation}
                optimalAerationWindow={plan.optimal_aeration_window}
              />
            )}

            {plan && (
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-500 leading-normal">
                <strong>Safety Disclaimer:</strong> {plan.disclaimer}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          Urban Air Quality Assistant • 100% Free-Tier Architecture • US EPA NowCast & ANSI/AHAM AC-1 Standards
        </div>
      </footer>

      <ImpactLedgerModal
        isOpen={isImpactModalOpen}
        onClose={() => setIsImpactModalOpen(false)}
        summary={impactSummary}
        onActionLogged={setImpactSummary}
      />
    </div>
  );
};

export default App;
