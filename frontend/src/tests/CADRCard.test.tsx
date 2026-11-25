import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CADRCalculatorCard } from '../components/dashboard/CADRCalculatorCard';

describe('CADRCalculatorCard Component', () => {
  it('calculates required CADR based on room dimensions', async () => {
    render(<CADRCalculatorCard />);

    // Default room 5 x 4 x 2.8 = 56 m3
    // At 4.5 ACH, required CADR = 56 * 4.5 = 252 m3/h
    await waitFor(() => {
      expect(screen.getByText(/56 m³/)).toBeInTheDocument();
      expect(screen.getByText(/252 m³\/h/)).toBeInTheDocument();
      expect(screen.getByText('SUFFICIENT')).toBeInTheDocument();
    });
  });

  it('evaluates adequacy when existing purifier CADR is entered', async () => {
    render(<CADRCalculatorCard />);

    const input = screen.getByPlaceholderText(/e.g. 350 m³\/h/i);
    // Enter an undersized purifier CADR (e.g. 100 m3/h when 252 m3/h is needed)
    fireEvent.change(input, { target: { value: '100' } });

    await waitFor(() => {
      expect(screen.getByText('UNDERSIZED')).toBeInTheDocument();
    });
  });
});
