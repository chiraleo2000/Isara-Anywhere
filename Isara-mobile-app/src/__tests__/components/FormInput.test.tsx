import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FormInput } from '../../components/forms/FormInput';

describe('FormInput', () => {
  it('renders label text', () => {
    render(<FormInput label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('shows required asterisk when required', () => {
    render(<FormInput label="Email" required />);
    expect(screen.getByText(' *')).toBeTruthy();
  });

  it('shows error message when provided', () => {
    render(<FormInput label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeTruthy();
  });

  it('does not show error when not provided', () => {
    render(<FormInput label="Email" />);
    expect(screen.queryByText('Invalid email')).toBeNull();
  });

  it('calls onChangeText when text is entered', () => {
    const onChangeText = jest.fn();
    render(<FormInput label="Email" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByDisplayValue(''), 'test@email.com');
    expect(onChangeText).toHaveBeenCalledWith('test@email.com');
  });

  it('displays placeholder text', () => {
    render(<FormInput label="Email" placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
  });
});
