import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DoctorCard } from '../../components/cards/DoctorCard';
import type { Doctor } from '../../types';

const mockDoctor: Doctor = {
  id: 'doc-1',
  name: 'Dr. Suthee',
  email: 'suthee@hospital.com',
  specialty: 'Cardiology',
  hospitalName: 'Bangkok Hospital',
  isAvailable: true,
};

describe('DoctorCard', () => {
  it('renders doctor name', () => {
    render(<DoctorCard doctor={mockDoctor} />);
    expect(screen.getByText('Dr. Suthee')).toBeTruthy();
  });

  it('renders avatar initial', () => {
    render(<DoctorCard doctor={mockDoctor} />);
    expect(screen.getByText('D')).toBeTruthy();
  });

  it('renders specialty when provided', () => {
    render(<DoctorCard doctor={mockDoctor} />);
    expect(screen.getByText('Cardiology')).toBeTruthy();
  });

  it('does not render specialty when not provided', () => {
    const doc: Doctor = { ...mockDoctor, specialty: undefined };
    render(<DoctorCard doctor={doc} />);
    expect(screen.queryByText('Cardiology')).toBeNull();
  });

  it('calls onPress with doctor when tapped', () => {
    const onPress = jest.fn();
    render(<DoctorCard doctor={mockDoctor} onPress={onPress} />);
    fireEvent.press(screen.getByText('Dr. Suthee'));
    expect(onPress).toHaveBeenCalledWith(mockDoctor);
  });

  it('is disabled when no onPress handler provided', () => {
    const { toJSON } = render(<DoctorCard doctor={mockDoctor} />);
    // When no onPress is provided, the component passes disabled={true}
    // We verify by checking the serialized tree contains disabled state
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"disabled":true');
  });
});
