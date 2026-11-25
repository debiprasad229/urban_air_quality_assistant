import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from '../components/common/Header';
import { apiClient, FALLBACK_PRESETS } from '../api/client';

describe('Header City Search', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searches global cities and selects a result', async () => {
    const tokyoResult = {
      id: 'geo_tokyo',
      name: 'Tokyo, Japan',
      country: 'JP',
      latitude: 35.6895,
      longitude: 139.6917,
      baseline_pm25: 0,
      description: 'Live atmospheric forecast for Tokyo, Japan',
    };
    const searchSpy = vi
      .spyOn(apiClient, 'searchLocations')
      .mockResolvedValue([tokyoResult]);
    const onSelectPreset = vi.fn();

    render(
      <Header
        presets={FALLBACK_PRESETS}
        selectedPreset={FALLBACK_PRESETS[0]}
        onSelectPreset={onSelectPreset}
        onOpenImpactModal={vi.fn()}
        totalAvoidedKg={248.5}
      />
    );

    const searchInput = screen.getByLabelText(/Search any city/i);
    fireEvent.change(searchInput, { target: { value: 'Tokyo' } });

    await waitFor(
      () => {
        expect(searchSpy).toHaveBeenCalledWith('Tokyo');
        expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    fireEvent.click(screen.getByText('Tokyo, Japan'));
    expect(onSelectPreset).toHaveBeenCalledWith(tokyoResult);
  });
});
