import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusBadge } from '../../components/common/StatusBadge';

describe('StatusBadge', () => {
  it('renders status text capitalized', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('renders confirmed status', () => {
    render(<StatusBadge status="confirmed" />);
    expect(screen.getByText('Confirmed')).toBeTruthy();
  });

  it('renders completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('renders cancelled status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="pending" label="waiting" />);
    expect(screen.getByText('Waiting')).toBeTruthy();
  });

  it('replaces dashes and underscores in display', () => {
    render(<StatusBadge status="no-show" />);
    expect(screen.getByText('No show')).toBeTruthy();
  });

  it('renders in-progress variant', () => {
    render(<StatusBadge status="in-progress" />);
    expect(screen.getByText('In progress')).toBeTruthy();
  });
});
