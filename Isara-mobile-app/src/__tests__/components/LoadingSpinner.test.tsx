import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders activity indicator', () => {
    const { root } = render(<LoadingSpinner />);
    // Verify the component renders without crashing
    expect(root).toBeTruthy();
  });

  it('shows message when provided', () => {
    render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeTruthy();
  });

  it('does not show message when not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByText('Loading data...')).toBeNull();
  });
});
