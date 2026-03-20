import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EmptyState } from '../../components/common/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeTruthy();
  });

  it('renders default icon when not specified', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('📋')).toBeTruthy();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="Empty" icon="🔍" />);
    expect(screen.getByText('🔍')).toBeTruthy();
  });

  it('renders message when provided', () => {
    render(<EmptyState title="Empty" message="Try again later" />);
    expect(screen.getByText('Try again later')).toBeTruthy();
  });

  it('does not render message when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Try again later')).toBeNull();
  });
});
