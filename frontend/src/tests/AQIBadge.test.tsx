import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AQIBadge } from '../components/common/AQIBadge';

describe('AQIBadge Component', () => {
  it('renders Good category with green styling', () => {
    render(<AQIBadge aqi={35} pm25={8.4} />);
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText(/8.4 µg\/m³/)).toBeInTheDocument();
  });

  it('renders Moderate category with amber contrast styling', () => {
    render(<AQIBadge aqi={75} pm25={23.5} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders Hazardous category when AQI > 300', () => {
    render(<AQIBadge aqi={385} pm25={340.2} />);
    expect(screen.getByText('385')).toBeInTheDocument();
    expect(screen.getByText('Hazardous')).toBeInTheDocument();
    expect(screen.getByText(/340.2 µg\/m³/)).toBeInTheDocument();
  });
});
