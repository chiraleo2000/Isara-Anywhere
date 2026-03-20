import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppointmentCard } from '../../components/cards/AppointmentCard';
import type { Appointment } from '../../types';

const mockAppointment: Appointment = {
  id: 'apt-1',
  patientId: 'p-1',
  doctorId: 'd-1',
  date: '2025-06-15T00:00:00.000Z',
  time: '10:00',
  status: 'confirmed',
  reason: 'Annual checkup',
  patientName: 'John Doe',
  doctorName: 'Dr. Smith',
  specialty: 'General Practice',
};

describe('AppointmentCard', () => {
  it('renders doctor name', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('Dr. Smith')).toBeTruthy();
  });

  it('renders specialty', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('General Practice')).toBeTruthy();
  });

  it('renders status badge', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('Confirmed')).toBeTruthy();
  });

  it('renders time', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('renders reason', () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText('Annual checkup')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<AppointmentCard appointment={mockAppointment} onPress={onPress} />);
    fireEvent.press(screen.getByText('Dr. Smith'));
    expect(onPress).toHaveBeenCalledWith(mockAppointment);
  });

  it('shows fallback when doctorName is missing', () => {
    const apt: Appointment = { ...mockAppointment, doctorName: '' };
    render(<AppointmentCard appointment={apt} />);
    expect(screen.getByText('Pending Assignment')).toBeTruthy();
  });
});
