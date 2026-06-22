import { useEffect } from 'react';

/**
 * Keyboard Shortcuts Hook
 * Provides keyboard shortcuts for common doctor portal actions
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

/**
 * Predefined keyboard shortcuts for doctor portal
 */
export const getDoctorPortalShortcuts = (callbacks: {
  onNewPatient?: () => void;
  onSearchPatient?: () => void;
  onNewEMR?: () => void;
  onNewPrescription?: () => void;
  onLabOrder?: () => void;
  onImagingOrder?: () => void;
  onViewQueue?: () => void;
  onViewCalendar?: () => void;
  onAIStudio?: () => void;
  onHelp?: () => void;
}): KeyboardShortcut[] => {
  return [
    {
      key: 'n',
      ctrl: true,
      description: 'New Patient',
      action: () => callbacks.onNewPatient?.(),
    },
    {
      key: 'f',
      ctrl: true,
      description: 'Search Patient',
      action: () => callbacks.onSearchPatient?.(),
    },
    {
      key: 'e',
      ctrl: true,
      description: 'New EMR',
      action: () => callbacks.onNewEMR?.(),
    },
    {
      key: 'p',
      ctrl: true,
      description: 'New Prescription',
      action: () => callbacks.onNewPrescription?.(),
    },
    {
      key: 'l',
      ctrl: true,
      shift: true,
      description: 'Lab Order',
      action: () => callbacks.onLabOrder?.(),
    },
    {
      key: 'i',
      ctrl: true,
      shift: true,
      description: 'Imaging Order',
      action: () => callbacks.onImagingOrder?.(),
    },
    {
      key: 'q',
      ctrl: true,
      description: 'View Queue',
      action: () => callbacks.onViewQueue?.(),
    },
    {
      key: 'c',
      ctrl: true,
      description: 'View Calendar',
      action: () => callbacks.onViewCalendar?.(),
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      description: 'AI Studio',
      action: () => callbacks.onAIStudio?.(),
    },
    {
      key: 'h',
      ctrl: true,
      description: 'Help',
      action: () => callbacks.onHelp?.(),
    },
  ];
};
