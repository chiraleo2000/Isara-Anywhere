import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  readonly message?: string;
  readonly size?: 'small' | 'large';
}

export function LoadingSpinner(props: Readonly<LoadingSpinnerProps>) {
  const { message, size = 'large' } = props;

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color="#1e40af" />
      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
