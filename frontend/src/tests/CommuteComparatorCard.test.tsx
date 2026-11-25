import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommuteComparatorCard } from '../components/dashboard/CommuteComparatorCard';
import { apiClient } from '../api/client';

describe('CommuteComparatorCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates comparison when mask type and baseline mode change', async () => {
    const compareSpy = vi.spyOn(apiClient, 'compareCommute').mockResolvedValue({
      distance_km: 8.0,
      ambient_pm25: 150.0,
      baseline_mode: 'SOLO_CAR_GASOLINE',
      best_exposure_mode: 'ELECTRIC_METRO',
      best_emission_mode: 'BICYCLE',
      avoided_exposure_ug: 12.4,
      avoided_co2e_grams: 1160,
      recommendation_summary: 'Electric Metro reduces inhaled PM2.5 while cutting tailpipe CO2e.',
      options: [
        {
          mode: 'ELECTRIC_METRO',
          duration_minutes: 15,
          inhaled_pm25_ug: 5.2,
          tailpipe_co2e_grams: 200,
          tailpipe_pm25_grams: 0,
          exposure_tier: 'LOW',
        },
      ],
    });

    render(<CommuteComparatorCard currentOutdoorPm25={150.0} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Electric Metro reduces inhaled PM2.5 while cutting tailpipe CO2e\./i)
      ).toBeInTheDocument();
    });

    const maskSelect = screen.getByLabelText(/Mask Type/i);
    fireEvent.change(maskSelect, { target: { value: 'N95_FFP2' } });

    const baselineSelect = screen.getByLabelText(/Baseline Mode/i);
    fireEvent.change(baselineSelect, { target: { value: 'CAR_HYBRID' } });

    await waitFor(() => {
      expect(compareSpy).toHaveBeenLastCalledWith({
        distance_km: 8.0,
        ambient_pm25_ug_m3: 150.0,
        baseline_mode: 'CAR_HYBRID',
        mask_type: 'N95_FFP2',
      });
    });
  });
});
