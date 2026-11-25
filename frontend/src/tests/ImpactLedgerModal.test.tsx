import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImpactLedgerModal } from '../components/impact/ImpactLedgerModal';
import { apiClient } from '../api/client';

describe('ImpactLedgerModal Component', () => {
  const initialSummary = {
    total_actions_logged: 142,
    total_co2e_avoided_kg: 248.5,
    total_pm25_avoided_ug: 1845.0,
    last_updated: '2026-11-25T10:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders communal metrics and submits a new impact action', async () => {
    const updatedSummary = {
      total_actions_logged: 143,
      total_co2e_avoided_kg: 249.6,
      total_pm25_avoided_ug: 1887.5,
      last_updated: '2026-11-25T12:00:00Z',
    };
    const recordSpy = vi
      .spyOn(apiClient, 'recordImpactAction')
      .mockResolvedValue(updatedSummary);
    const onActionLogged = vi.fn();

    render(
      <ImpactLedgerModal
        isOpen={true}
        onClose={vi.fn()}
        summary={initialSummary}
        onActionLogged={onActionLogged}
      />
    );

    expect(screen.getByText('248.5 kg')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Add to Collective Impact/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(recordSpy).toHaveBeenCalledWith({
        action_type: 'TRANSIT_MODAL_SHIFT',
        avoided_co2e_kg: 1.1,
        avoided_pm25_ug: 42.5,
      });
      expect(onActionLogged).toHaveBeenCalledWith(updatedSummary);
    });
  });
});
