export interface LocationPreset {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  baseline_pm25: number;
  description: string;
}

export interface HourlyForecastPoint {
  time: string;
  pm25_ug_m3: number;
  pm10_ug_m3: number | null;
  calculated_aqi: number;
  aqi_category: string;
  is_inversion_peak: boolean;
  is_aeration_window: boolean;
}

export interface CurrentAirQualityResponse {
  location_name: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  pm25_ug_m3: number;
  calculated_aqi: number;
  aqi_category: string;
  severity_code: string;
  standard_label: string;
  data_provenance: string;
  safety_advisory_level: string;
  health_summary: string;
  aeration_recommended: boolean;
  aeration_window_text: string;
  aeration_rationale: string;
  hourly_forecast: HourlyForecastPoint[];
}

export interface CADRRequest {
  room_length_m: number;
  room_width_m: number;
  ceiling_height_m: number;
  current_purifier_cadr_m3h?: number | null;
}

export interface CADRResponse {
  room_volume_m3: number;
  target_ach: number;
  required_cadr_m3h: number;
  required_cadr_cfm: number;
  clearance_time_minutes_90pct: number;
  operating_guidance: string;
  is_existing_purifier_adequate: boolean | null;
  existing_purifier_recommendation: string | null;
}

export interface CommuteComparisonRequest {
  distance_km: number;
  ambient_pm25_ug_m3: number;
  baseline_mode?: string;
  mask_type?: string;
}

export interface CommuteOption {
  mode: string;
  duration_minutes: number;
  inhaled_pm25_ug: number;
  tailpipe_co2e_grams: number;
  tailpipe_pm25_grams: number;
  exposure_tier: string;
}

export interface CommuteComparisonResponse {
  distance_km: number;
  ambient_pm25: number;
  baseline_mode: string;
  options: CommuteOption[];
  best_exposure_mode: string;
  best_emission_mode: string;
  avoided_exposure_ug: number;
  avoided_co2e_grams: number;
  recommendation_summary: string;
}

export interface RoutineSlot {
  time_window: string;
  activity: string;
  setting: string;
  advisory_action: string;
  mask_required: boolean;
  purifier_setting: string;
}

export interface AssistantPlanRequest {
  latitude: number;
  longitude: number;
  location_name: string;
  commute_distance_km: number;
  default_commute_mode: string;
  vulnerability_category: string;
  user_notes: string;
}

export interface AssistantPlanResponse {
  location_name: string;
  generated_at: string;
  current_aqi: number;
  aqi_category: string;
  safety_advisory_level: string;
  safety_advisory_message: string;
  optimal_aeration_window: string;
  daily_schedule: RoutineSlot[];
  avoided_exposure_estimate_ug: number;
  avoided_co2e_estimate_kg: number;
  impact_explanation: string;
  is_fallback_plan: boolean;
  disclaimer: string;
}

export interface ImpactAction {
  action_type: string;
  avoided_co2e_kg: number;
  avoided_pm25_ug: number;
}

export interface CommunityImpactSummary {
  total_actions_logged: number;
  total_co2e_avoided_kg: number;
  total_pm25_avoided_ug: number;
  last_updated: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  dependencies: Record<string, string>;
}
