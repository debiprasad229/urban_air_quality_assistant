import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { apiClient, FALLBACK_PRESETS, buildPresetFallbackData } from '../api/client';

// Mock Recharts ResponsiveContainer which requires DOM sizing in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

describe('App Component Dual-Pane Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue({
      status: 'healthy',
      version: '1.0.0',
      dependencies: { gemini_api: 'configured' },
    });
    vi.spyOn(apiClient, 'getPresets').mockResolvedValue(FALLBACK_PRESETS);
    vi.spyOn(apiClient, 'getCommunityImpact').mockResolvedValue({
      total_actions_logged: 142,
      total_co2e_avoided_kg: 248.5,
      total_pm25_avoided_ug: 1845.0,
      last_updated: new Date().toISOString(),
    });
    vi.spyOn(apiClient, 'getCurrentAirQuality').mockImplementation(async (lat, lon, name) =>
      buildPresetFallbackData(lat, lon, name)
    );
    vi.spyOn(apiClient, 'calculateCADR').mockResolvedValue({
      room_volume_m3: 56.0,
      target_ach: 4.5,
      required_cadr_m3h: 252.0,
      required_cadr_cfm: 148.3,
      clearance_time_minutes_90pct: 31,
      operating_guidance: 'Run continuously during smog peaks.',
      is_existing_purifier_adequate: null,
      existing_purifier_recommendation: null,
    });
    vi.spyOn(apiClient, 'compareCommute').mockResolvedValue({
      distance_km: 8.0,
      ambient_pm25: 245.0,
      baseline_mode: 'SOLO_CAR_GASOLINE',
      best_exposure_mode: 'ELECTRIC_METRO',
      best_emission_mode: 'BICYCLE',
      avoided_exposure_ug: 12.0,
      avoided_co2e_grams: 1160,
      recommendation_summary: 'Take Electric Metro.',
      options: [],
    });
    vi.spyOn(apiClient, 'createAssistantPlan').mockImplementation(async (req) => ({
      location_name: req.location_name,
      generated_at: new Date().toISOString(),
      current_aqi: req.location_name.includes('London') ? 85 : 296,
      aqi_category: req.location_name.includes('London') ? 'Moderate' : 'Very Unhealthy',
      safety_advisory_level: req.location_name.includes('London') ? 'NORMAL' : 'SEVERE_WARNING',
      safety_advisory_message: 'Advisory test message',
      optimal_aeration_window: '13:00 - 13:20',
      avoided_exposure_estimate_ug: 25.0,
      avoided_co2e_estimate_kg: 1.16,
      impact_explanation: `Plan tailored for ${req.location_name} (${req.default_commute_mode})`,
      is_fallback_plan: false,
      disclaimer: 'Public health advisory only; not clinical medical advice.',
      daily_schedule: [
        {
          time_window: '07:30 - 08:30',
          activity: 'Morning Commute',
          setting: 'ENCLOSED_TRANSIT',
          advisory_action: `Commute guidance for ${req.location_name}`,
          mask_required: true,
          purifier_setting: 'OFF',
        },
      ],
    }));
  });

  it('renders dual-pane layout, switches cities with updated AQI, and synthesizes routine', async () => {
    render(<App />);

    expect(screen.getByText('Urban Air Quality Assistant')).toBeInTheDocument();

    // Wait for initial render and plan
    await waitFor(() => {
      expect(screen.getByText(/5-Slot Adaptive Daily Routine/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini AI Synthesized/i)).toBeInTheDocument();
      expect(screen.getByText('315')).toBeInTheDocument();
    });

    // Switch city to London and verify AQI changes from 315 to 86
    const select = screen.getByLabelText(/City Preset:/i);
    fireEvent.change(select, { target: { value: 'London, United Kingdom' } });

    await waitFor(() => {
      expect(screen.getByText('86')).toBeInTheDocument();
      expect(screen.getByText(/Commute guidance for London, United Kingdom/i)).toBeInTheDocument();
    });

    // Switch back to New Delhi -> should hit client cache without another createAssistantPlan call
    const callsBeforeSwitchBack = vi.mocked(apiClient.createAssistantPlan).mock.calls.length;
    fireEvent.change(select, { target: { value: 'New Delhi, India' } });

    await waitFor(() => {
      expect(screen.getByText('315')).toBeInTheDocument();
      expect(screen.getByText(/Commute guidance for New Delhi, India/i)).toBeInTheDocument();
    });
    expect(vi.mocked(apiClient.createAssistantPlan).mock.calls.length).toBe(callsBeforeSwitchBack);

    // Change commute mode in form and click Synthesize -> cache miss, triggers new AI call
    const modeSelect = screen.getByLabelText(/Typical Commute Mode/i);
    fireEvent.change(modeSelect, { target: { value: 'ELECTRIC_METRO' } });

    const submitBtn = screen.getByRole('button', { name: /Synthesize Low-Emission Routine/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.createAssistantPlan).toHaveBeenLastCalledWith(
        expect.objectContaining({
          location_name: 'New Delhi, India',
          default_commute_mode: 'ELECTRIC_METRO',
        })
      );
    });
  });
});
