import {
  AssistantPlanResponse,
  CADRRequest,
  CADRResponse,
  CommuteComparisonRequest,
  CommuteComparisonResponse,
  CommunityImpactSummary,
  CurrentAirQualityResponse,
  LocationPreset,
} from './types';

export const FALLBACK_PRESETS: LocationPreset[] = [
  {
    id: 'delhi',
    name: 'New Delhi, India',
    country: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
    baseline_pm25: 245.0,
    description:
      'Severe post-harvest biomass burning + vehicular stagnation under shallow winter inversion.',
  },
  {
    id: 'lahore',
    name: 'Lahore, Pakistan',
    country: 'PK',
    latitude: 31.5204,
    longitude: 74.3587,
    baseline_pm25: 280.0,
    description: 'Dense Indus basin smog with recurring hazardous particulate entrapment.',
  },
  {
    id: 'salt_lake_city',
    name: 'Salt Lake City, USA',
    country: 'US',
    latitude: 40.7608,
    longitude: -111.891,
    baseline_pm25: 48.0,
    description: 'Topographic bowl inversion trapping winter woodsmoke and vehicle exhaust.',
  },
  {
    id: 'london',
    name: 'London, United Kingdom',
    country: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    baseline_pm25: 28.0,
    description: 'Maritime winter boundary layer with localized diesel and domestic heating spikes.',
  },
  {
    id: 'bhubaneswar',
    name: 'Bhubaneswar, India',
    country: 'IN',
    latitude: 20.2961,
    longitude: 85.8245,
    baseline_pm25: 115.0,
    description:
      'Rapidly developing tropical urban center with road dust, vehicular spikes, and winter nocturnal cooling.',
  },
];

export const FALLBACK_IMPACT_SUMMARY: CommunityImpactSummary = {
  total_actions_logged: 142,
  total_co2e_avoided_kg: 248.5,
  total_pm25_avoided_ug: 1845.0,
  last_updated: new Date().toISOString(),
};

function approximateAqiFromPm25(pm: number): { aqi: number; category: string } {
  if (pm <= 9.0) return { aqi: Math.round((pm / 9.0) * 50), category: 'Good' };
  if (pm <= 35.4) return { aqi: Math.round(51 + ((pm - 9.1) / 26.3) * 49), category: 'Moderate' };
  if (pm <= 55.4) {
    return {
      aqi: Math.round(101 + ((pm - 35.5) / 19.9) * 49),
      category: 'Unhealthy for Sensitive Groups',
    };
  }
  if (pm <= 125.4) {
    return { aqi: Math.round(151 + ((pm - 55.5) / 69.9) * 49), category: 'Unhealthy' };
  }
  if (pm <= 225.4) {
    return { aqi: Math.round(201 + ((pm - 125.5) / 99.9) * 99), category: 'Very Unhealthy' };
  }
  return {
    aqi: Math.min(500, Math.round(301 + ((pm - 225.5) / 274.9) * 199)),
    category: 'Hazardous',
  };
}

/** Build a representative offline diurnal forecast when the backend is unavailable. */
export function buildPresetFallbackData(
  lat: number,
  lon: number,
  name?: string
): CurrentAirQualityResponse {
  const matched =
    FALLBACK_PRESETS.find(
      (p) =>
        (name && p.name === name) ||
        (Math.abs(p.latitude - lat) < 0.5 && Math.abs(p.longitude - lon) < 0.5)
    ) || FALLBACK_PRESETS[0];

  const basePm = matched.baseline_pm25;
  const { aqi, category } = approximateAqiFromPm25(basePm);
  const advisoryLevel = aqi >= 200 ? 'SEVERE_WARNING' : aqi >= 100 ? 'CAUTION' : 'NORMAL';
  const aerationOk = basePm * 0.65 < 150;

  return {
    location_name: name || matched.name,
    latitude: lat,
    longitude: lon,
    timestamp: new Date().toISOString(),
    pm25_ug_m3: basePm,
    calculated_aqi: aqi,
    aqi_category: category,
    severity_code: advisoryLevel,
    standard_label: 'US_EPA_NOWCAST',
    data_provenance: 'DEMO_PRESET',
    safety_advisory_level: advisoryLevel,
    health_summary: matched.description,
    aeration_recommended: aerationOk,
    aeration_window_text: aerationOk
      ? '13:00 - 13:20 (15 min rapid flush)'
      : 'Keep windows sealed today',
    aeration_rationale: aerationOk
      ? 'Midday solar mixing lowers particulate concentration enough for a brief 15-minute cross-ventilation flush.'
      : 'Particulate levels remain too high for natural ventilation; rely on mechanical HEPA filtration.',
    hourly_forecast: Array.from({ length: 24 }).map((_, i) => {
      const isPeak = (i >= 6 && i <= 9) || (i >= 18 && i <= 22);
      const isAeration = i >= 12 && i <= 15;
      const mult = isPeak ? 1.25 : isAeration ? 0.6 : 0.95;
      const pm = Math.round(basePm * mult * 10) / 10;
      const ptAqi = approximateAqiFromPm25(pm);
      return {
        time: `${String(i).padStart(2, '0')}:00`,
        pm25_ug_m3: pm,
        pm10_ug_m3: Math.round(pm * 1.5 * 10) / 10,
        calculated_aqi: ptAqi.aqi,
        aqi_category: ptAqi.category,
        is_inversion_peak: isPeak,
        is_aeration_window: isAeration && pm < 150,
      };
    }),
  };
}

export const FALLBACK_DELHI_DATA: CurrentAirQualityResponse = buildPresetFallbackData(
  28.6139,
  77.209,
  'New Delhi, India'
);

/** Compute fallback CADR metrics when the backend is offline. */
export function buildFallbackCADR(req: CADRRequest): CADRResponse {
  const volume = Math.round(req.room_length_m * req.room_width_m * req.ceiling_height_m * 10) / 10;
  const cadrM3h = Math.round(volume * 4.5 * 10) / 10;
  const cadrCfm = Math.round((cadrM3h / 1.6990108) * 10) / 10;
  const effectiveAch =
    req.current_purifier_cadr_m3h && req.current_purifier_cadr_m3h > 0
      ? req.current_purifier_cadr_m3h / volume
      : 4.5;
  const mins = Math.round((2.302585 / effectiveAch) * 60);
  const isAdequate =
    req.current_purifier_cadr_m3h !== undefined && req.current_purifier_cadr_m3h !== null
      ? req.current_purifier_cadr_m3h >= cadrM3h
      : null;

  return {
    room_volume_m3: volume,
    target_ach: 4.5,
    required_cadr_m3h: cadrM3h,
    required_cadr_cfm: cadrCfm,
    clearance_time_minutes_90pct: mins,
    operating_guidance: 'Run purifier continuously during inversion peaks.',
    is_existing_purifier_adequate: isAdequate,
    existing_purifier_recommendation:
      isAdequate === null
        ? null
        : isAdequate
        ? 'Sufficient capacity for 4.5 ACH smog clearance.'
        : `Undersized: requires at least ${cadrM3h} m³/h for 4.5 ACH.`,
  };
}

/** Compute fallback commute comparison metrics when the backend is offline. */
export function buildFallbackCommute(req: CommuteComparisonRequest): CommuteComparisonResponse {
  const scale = req.distance_km / 8.0;
  const pmScale = req.ambient_pm25_ug_m3 / 150.0;
  return {
    distance_km: req.distance_km,
    ambient_pm25: req.ambient_pm25_ug_m3,
    baseline_mode: req.baseline_mode || 'SOLO_CAR_GASOLINE',
    best_exposure_mode: 'ELECTRIC_METRO',
    best_emission_mode: 'BICYCLE',
    avoided_exposure_ug: Math.round(10.0 * scale * pmScale * 10) / 10,
    avoided_co2e_grams: Math.round(1160 * scale),
    recommendation_summary: 'Electric Metro minimizes inhaled PM2.5 while cutting >80% of CO2e.',
    options: [
      {
        mode: 'SOLO_CAR_GASOLINE',
        duration_minutes: Math.round(19 * scale),
        inhaled_pm25_ug: Math.round(16.0 * scale * pmScale * 10) / 10,
        tailpipe_co2e_grams: Math.round(1360 * scale),
        tailpipe_pm25_grams: Math.round(0.12 * scale * 100) / 100,
        exposure_tier: 'MODERATE',
      },
      {
        mode: 'ELECTRIC_METRO',
        duration_minutes: Math.round(15 * scale),
        inhaled_pm25_ug: Math.round(8.4 * scale * pmScale * 10) / 10,
        tailpipe_co2e_grams: Math.round(200 * scale),
        tailpipe_pm25_grams: 0,
        exposure_tier: 'LOW',
      },
      {
        mode: 'BUS_DIESEL',
        duration_minutes: Math.round(27 * scale),
        inhaled_pm25_ug: Math.round(28.0 * scale * pmScale * 10) / 10,
        tailpipe_co2e_grams: Math.round(656 * scale),
        tailpipe_pm25_grams: Math.round(0.03 * scale * 100) / 100,
        exposure_tier: 'MODERATE',
      },
      {
        mode: 'BICYCLE',
        duration_minutes: Math.round(32 * scale),
        inhaled_pm25_ug: Math.round(96.0 * scale * pmScale * 10) / 10,
        tailpipe_co2e_grams: 0,
        tailpipe_pm25_grams: 0,
        exposure_tier: 'EXTREME',
      },
    ],
  };
}

/** Build a deterministic 5-slot offline safety routine when the assistant endpoint is unreachable. */
export function buildFallbackRoutinePlan(
  cityName: string,
  commuteDistanceKm: number,
  aqSnapshot: CurrentAirQualityResponse
): AssistantPlanResponse {
  const isSevere = aqSnapshot.calculated_aqi >= 200;
  return {
    location_name: cityName,
    generated_at: new Date().toISOString(),
    current_aqi: aqSnapshot.calculated_aqi,
    aqi_category: aqSnapshot.aqi_category,
    safety_advisory_level: aqSnapshot.safety_advisory_level,
    safety_advisory_message: aqSnapshot.health_summary,
    optimal_aeration_window: aqSnapshot.aeration_window_text,
    avoided_exposure_estimate_ug: 25.0,
    avoided_co2e_estimate_kg: 1.1,
    impact_explanation: `Shifting your ${commuteDistanceKm} km commute to enclosed electric transit cuts exposure and carbon emissions.`,
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
  };
}
