import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppHeader } from '../../components/common/AppHeader';

describe('AppHeader', () => {
  it('renders title text', () => {
    render(<AppHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<AppHeader title="Dashboard" subtitle="Welcome back" />);
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    render(<AppHeader title="Dashboard" />);
    expect(screen.queryByText('Welcome back')).toBeNull();
  });

  it('renders back button when onBack is provided', () => {
    const onBack = jest.fn();
    render(<AppHeader title="Settings" onBack={onBack} />);
    expect(screen.getByText('←')).toBeTruthy();
  });

  it('does not render back button when onBack is not provided', () => {
    render(<AppHeader title="Home" />);
    expect(screen.queryByText('←')).toBeNull();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    render(<AppHeader title="Settings" onBack={onBack} />);
    fireEvent.press(screen.getByText('←'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders right action when provided', () => {
    render(<AppHeader title="Patients" rightAction={<Text>Save</Text>} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('renders all props together', () => {
    const onBack = jest.fn();
    render(
      <AppHeader
        title="Patient Detail"
        subtitle="John Doe"
        onBack={onBack}
        rightAction={<Text>Edit</Text>}
      />
    );
    expect(screen.getByText('Patient Detail')).toBeTruthy();
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('←')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
  });
});
