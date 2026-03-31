/**
 * TabBarIcon — Shared navigation icon component
 * Uses Ionicons from @expo/vector-icons
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface TabBarIconProps {
  name: IoniconsName;
  color: string;
  size?: number;
}

export function TabBarIcon({ name, color, size = 24 }: Readonly<TabBarIconProps>) {
  return <Ionicons name={name} size={size} color={color} />;
}
