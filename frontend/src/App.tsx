import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/common/Header';
import { BackendHealthBanner } from './components/common/BackendHealthBanner';
import { AQIBadge } from './components/common/AQIBadge';
import { DiurnalInversionChart } from './components/dashboard/DiurnalInversionChart';
import { AerationWindowCard } from './components/dashboard/AerationWindowCard';
import { CADRCalculatorCard } from './components/dashboard/CADRCalculatorCard';
import { CommuteComparatorCard } from './components/dashboard/CommuteComparatorCard';
import { SafetyAdvisoryBanner } from './components/assistant/SafetyAdvisoryBanner';
import { PlanRequestForm, PlanFormInput } from './components/assistant/PlanRequestForm';
import { TimelineSchedule } from './components/assistant/TimelineSchedule';
import { ImpactLedgerModal } from './components/impact/ImpactLedgerModal';
import {
  LocationPreset,
  CurrentAirQualityResponse,
  AssistantPlanResponse,
  CommunityImpactSummary,
} from './api/types';
import { apiClient, FALLBACK_PRESETS, FALLBACK_DELHI_DATA } from './api/client';

export const App: React.FC = () => {
  const [presets, setPresets] = useState<LocationPreset[]>(FALLBACK_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<LocationPreset>(FALLBACK_PRESETS[0]);
  const [airQuality, setAirQuality] = useState<CurrentAirQualityResponse>(FALLBACK_DELHI_DATA);
  const [plan, setPlan] = useState<AssistantPlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [lastFormInput, setLastFormInput] = useState<PlanFormInput>({
    commute_distance_km: 8.0,
    default_commute_mode: 'SOLO_CAR_GASOLINE',
    vulnerability_category: 'GENERAL',
    user_notes: '',
  });
  const [impactSummary, setImpactSummary] = useState<CommunityImpactSummary>({
    total_actions_logged: 142,
    total_co2e_avoided_kg: 248.5,
    total_pm25_avoided_ug: 1845.0,
    last_updated: new Date().toISOString(),
  });
  const [isImpactModalOpen, setIsImpactModalOpen] = useState<boolean>(false);
  const [backendHealth, setBackendHealth] = useState<'checking' | 'healthy' | 'waking' | 'offline'>('checking');

  // Verify Backend Health on Mount
  const checkHealth = async () => {
    setBackendHealth('checking');
    try {
      await apiClient.getHealth();
      setBackendHealth('healthy');
    } catch {
      setBackendHealth('waking');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Load Presets & Impact Summary
  useEffect(() => {
    const initData = async () => {
      try {
        const loadedPresets = await apiClient.getPresets();
        if (loadedPresets && loadedPresets.length > 0) {
          setPresets(loadedPresets);
          setSelectedPreset((prev) => loadedPresets.find((p) => p.name === prev.name) || loadedPresets[0]);
        }
      } catch (err) {
        console.warn('Using default presets:', err);
      }

      try {
        const impact = await apiClient.getCommunityImpact();
        setImpactSummary(impact);
      } catch (err) {
        console.warn('Using default impact summary:', err);
      }
    };

    initData();
  }, []);

  const generatePlanForPreset = useCallback(
    async (preset: LocationPreset, formInput: PlanFormInput, aqSnapshot: CurrentAirQualityResponse) => {
      setPlanLoading(true);
      setPlanError(null);
      try {
        const generated = await apiClient.createAssistantPlan({
          latitude: preset.latitude,
          longitude: preset.longitude,
          location_name: preset.name,
          commute_distance_km: formInput.commute_distance_km,
          default_commute_mode: formInput.default_commute_mode,
          vulnerability_category: formInput.vulnerability_category,
          user_notes: formInput.user_notes,
        });
        setPlan(generated);
      } catch (err) {
        console.warn('Assistant API unavailable, using fallback schedule generator:', err);
        setPlanError('Live assistant endpoint unreachable — showing offline safety schedule.');
        const isSevere = aqSnapshot.calculated_aqi >= 200;
        setPlan({
          location_name: preset.name,
          generated_at: new Date().toISOString(),
          current_aqi: aqSnapshot.calculated_aqi,
          aqi_category: aqSnapshot.aqi_category,
          safety_advisory_level: aqSnapshot.safety_advisory_level,
          safety_advisory_message: aqSnapshot.health_summary,
          optimal_aeration_window: aqSnapshot.aeration_window_text,
          avoided_exposure_estimate_ug: 25.0,
          avoided_co2e_estimate_kg: 1.1,
          impact_explanation: `Shifting your ${formInput.commute_distance_km} km commute to enclosed electric transit cuts exposure and carbon emissions.`,
          is_fallback_plan: true,
          disclaimer:
            'Public health advisory only; not clinical medical advice. Consult healthcare professionals for personal medical management.',
          daily_schedule: [
            {
              time_window: '07:30 - 08:30',
              activity: 'Morning Commute',
              setting: isSevere ? 'ENCLOSED_TRANSIT' : 'OUTDOOR',
              advisory_action: isSevere
                ? 'Morning inversion concentrates PM₂.₅. Use enclosed metro/transit and wear a fitted N95.'
                : 'Moderate morning traffic particulates. Enclosed transit recommended.',
              mask_required: isSevere,
              purifier_setting: 'OFF',
            },
            {
              time_window: '09:00 - 12:30',
              activity: 'Indoor Work / Study',
              setting: 'INDOOR',
              advisory_action: 'Keep windows closed and run indoor HEPA filtration on Medium.',
              mask_required: false,
              purifier_setting: 'MEDIUM',
            },
            {
              time_window: '13:00 - 14:00',
              activity: 'Midday Aeration & Lunch',
              setting: 'INDOOR',
              advisory_action: aqSnapshot.aeration_recommended
                ? 'Solar boundary layer lift active. Perform a 15-minute cross-ventilation flush, then seal and run Turbo.'
                : 'Keep windows sealed due to hazardous outdoor PM₂.₅.',
              mask_required: false,
              purifier_setting: aqSnapshot.aeration_recommended ? 'TURBO' : 'HIGH',
            },
            {
              time_window: '17:30 - 18:30',
              activity: 'Evening Return Commute',
              setting: isSevere ? 'ENCLOSED_TRANSIT' : 'OUTDOOR',
              advisory_action: 'Evening radiative cooling triggers pollution spike. Prioritize rail/metro transit.',
              mask_required: isSevere,
              purifier_setting: 'OFF',
            },
            {
              time_window: '20:00 - 22:30',
              activity: 'Evening Domestic Care & Sleep Prep',
              setting: 'INDOOR',
              advisory_action: 'Close bedroom doors and run purifier on High/Auto for clean nocturnal recovery.',
              mask_required: false,
              purifier_setting: 'HIGH',
            },
          ],
        });
      } finally {
        setPlanLoading(false);
      }
    },
    []
  );

  // Update Air Quality and Routine in parallel when selectedPreset changes
  useEffect(() => {
    let isCancelled = false;
    const fetchCityState = async () => {
      const aqPromise = apiClient
        .getCurrentAirQuality(
          selectedPreset.latitude,
          selectedPreset.longitude,
          selectedPreset.name
        )
        .then((data) => {
          if (!isCancelled) setAirQuality(data);
          return data;
        })
        .catch((err) => {
          console.error('Failed to load air quality:', err);
          return airQuality;
        });

      const aqSnapshot = await aqPromise;
      if (!isCancelled) {
        await generatePlanForPreset(selectedPreset, lastFormInput, aqSnapshot);
      }
    };

    void fetchCityState();
    return () => {
      isCancelled = true;
    };
  }, [selectedPreset.name]);

  const handleFormSubmit = async (formInput: PlanFormInput) => {
    setLastFormInput(formInput);
    await generatePlanForPreset(selectedPreset, formInput, airQuality);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        presets={presets}
        selectedPreset={selectedPreset}
        onSelectPreset={(p) => {
          setSelectedPreset(p);
        }}
        onOpenImpactModal={() => setIsImpactModalOpen(true)}
        totalAvoidedKg={impactSummary.total_co2e_avoided_kg}
      />

      {/* Backend Health Banner */}
      <BackendHealthBanner status={backendHealth} onRetry={checkHealth} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <AQIBadge
              aqi={airQuality.calculated_aqi}
              pm25={airQuality.pm25_ug_m3}
              size="lg"
            />
          </div>
        </div>

        {/* Dual-Pane Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Pane (Atmospheric Diagnostics & Calculators): 7 Cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* Diurnal Inversion Chart */}
            <DiurnalInversionChart data={airQuality.hourly_forecast} />

            {/* Aeration Guidance Card */}
            <AerationWindowCard
              recommended={airQuality.aeration_recommended}
              windowText={airQuality.aeration_window_text}
              rationale={airQuality.aeration_rationale}
              currentAqi={airQuality.calculated_aqi}
            />

            {/* Interactive CADR Room Sizer */}
            <CADRCalculatorCard />

            {/* Commute Comparator Card */}
            <CommuteComparatorCard currentOutdoorPm25={airQuality.pm25_ug_m3} />
          </div>

          {/* Right Pane (AI Assistant & Daily Decision Support): 5 Cols */}
          <div className="lg:col-span-5 space-y-6">
            {/* Severe Smog Safety Advisory Banner */}
            <SafetyAdvisoryBanner
              level={airQuality.safety_advisory_level}
              aqi={airQuality.calculated_aqi}
            />

            {/* Customization Form */}
            <PlanRequestForm onSubmit={handleFormSubmit} isLoading={planLoading} />

            {planError && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                {planError}
              </div>
            )}

            {/* 5-Slot Routine Timeline */}
            {plan && (
              <TimelineSchedule
                slots={plan.daily_schedule}
                isFallback={plan.is_fallback_plan}
                impactExplanation={plan.impact_explanation}
                optimalAerationWindow={plan.optimal_aeration_window}
              />
            )}

            {/* Non-medical Disclaimer */}
            {plan && (
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] text-slate-500 leading-normal">
                <strong>Safety Disclaimer:</strong> {plan.disclaimer}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          Urban Air Quality Assistant • 100% Free-Tier Architecture • US EPA NowCast & ANSI/AHAM AC-1 Standards
        </div>
      </footer>

      {/* Communal Impact Modal */}
      <ImpactLedgerModal
        isOpen={isImpactModalOpen}
        onClose={() => setIsImpactModalOpen(false)}
        summary={impactSummary}
        onActionLogged={(updated) => setImpactSummary(updated)}
      />
    </div>
  );
};

export default App;
