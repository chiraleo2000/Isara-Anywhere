/**
 * ═══════════════════════════════════════════════════════════════════════
 * Settings Page Logic Tests
 * Tests: Settings form validation, privacy toggles, notification prefs
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';

// --- Types ---
interface UserSettings {
  language: 'th' | 'en';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    appointmentReminder: boolean;
    labResults: boolean;
  };
  privacy: {
    shareWithDoctors: boolean;
    shareWithResearchers: boolean;
    allowAnalytics: boolean;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
  };
}

interface SettingsValidation {
  valid: boolean;
  errors: string[];
}

// --- Functions ---

function getDefaultSettings(): UserSettings {
  return {
    language: 'th',
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      sms: false,
      appointmentReminder: true,
      labResults: true,
    },
    privacy: {
      shareWithDoctors: true,
      shareWithResearchers: false,
      allowAnalytics: false,
    },
    accessibility: {
      fontSize: 'medium',
      highContrast: false,
    },
  };
}

function validateSettings(settings: Partial<UserSettings>): SettingsValidation {
  const errors: string[] = [];

  if (settings.language && !['th', 'en'].includes(settings.language)) {
    errors.push('Invalid language selection');
  }
  if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
    errors.push('Invalid theme selection');
  }
  if (settings.accessibility?.fontSize && !['small', 'medium', 'large'].includes(settings.accessibility.fontSize)) {
    errors.push('Invalid font size');
  }

  return { valid: errors.length === 0, errors };
}

function mergeSettings(current: UserSettings, updates: Partial<UserSettings>): UserSettings {
  return {
    ...current,
    ...updates,
    notifications: { ...current.notifications, ...updates.notifications },
    privacy: { ...current.privacy, ...updates.privacy },
    accessibility: { ...current.accessibility, ...updates.accessibility },
  };
}

function getPrivacySummary(settings: UserSettings): string {
  const shared: string[] = [];
  if (settings.privacy.shareWithDoctors) shared.push('doctors');
  if (settings.privacy.shareWithResearchers) shared.push('researchers');
  if (settings.privacy.allowAnalytics) shared.push('analytics');
  return shared.length ? `Sharing with: ${shared.join(', ')}` : 'No data sharing enabled';
}

// --- Tests ---

describe('Settings — Defaults', () => {
  it('S01 — default language is Thai', () => {
    expect(getDefaultSettings().language).toBe('th');
  });

  it('S02 — default theme is light', () => {
    expect(getDefaultSettings().theme).toBe('light');
  });

  it('S03 — default notifications: email and push enabled, sms disabled', () => {
    const d = getDefaultSettings();
    expect(d.notifications.email).toBe(true);
    expect(d.notifications.push).toBe(true);
    expect(d.notifications.sms).toBe(false);
  });

  it('S04 — default privacy: share with doctors, not researchers', () => {
    const d = getDefaultSettings();
    expect(d.privacy.shareWithDoctors).toBe(true);
    expect(d.privacy.shareWithResearchers).toBe(false);
  });

  it('S05 — default font size is medium', () => {
    expect(getDefaultSettings().accessibility.fontSize).toBe('medium');
  });
});

describe('Settings — Validation', () => {
  it('S06 — valid settings pass', () => {
    const result = validateSettings({ language: 'en', theme: 'dark' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('S07 — invalid language fails', () => {
    const result = validateSettings({ language: 'fr' as any });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid language selection');
  });

  it('S08 — invalid theme fails', () => {
    const result = validateSettings({ theme: 'neon' as any });
    expect(result.valid).toBe(false);
  });

  it('S09 — invalid font size fails', () => {
    const result = validateSettings({ accessibility: { fontSize: 'huge' as any, highContrast: false } });
    expect(result.valid).toBe(false);
  });

  it('S10 — empty updates are valid', () => {
    expect(validateSettings({}).valid).toBe(true);
  });
});

describe('Settings — Merge', () => {
  it('S11 — merge updates language only', () => {
    const current = getDefaultSettings();
    const merged = mergeSettings(current, { language: 'en' });
    expect(merged.language).toBe('en');
    expect(merged.theme).toBe('light'); // unchanged
  });

  it('S12 — merge updates nested notification', () => {
    const current = getDefaultSettings();
    const merged = mergeSettings(current, { notifications: { sms: true } as any });
    expect(merged.notifications.sms).toBe(true);
    expect(merged.notifications.email).toBe(true); // unchanged
  });

  it('S13 — merge updates privacy', () => {
    const current = getDefaultSettings();
    const merged = mergeSettings(current, { privacy: { shareWithResearchers: true } as any });
    expect(merged.privacy.shareWithResearchers).toBe(true);
    expect(merged.privacy.shareWithDoctors).toBe(true); // unchanged
  });
});

describe('Settings — Privacy Summary', () => {
  it('S14 — summary with doctors sharing', () => {
    const s = getDefaultSettings();
    expect(getPrivacySummary(s)).toContain('doctors');
  });

  it('S15 — summary with all sharing', () => {
    const s = getDefaultSettings();
    s.privacy.shareWithDoctors = true;
    s.privacy.shareWithResearchers = true;
    s.privacy.allowAnalytics = true;
    const summary = getPrivacySummary(s);
    expect(summary).toContain('doctors');
    expect(summary).toContain('researchers');
    expect(summary).toContain('analytics');
  });

  it('S16 — summary with no sharing', () => {
    const s = getDefaultSettings();
    s.privacy.shareWithDoctors = false;
    expect(getPrivacySummary(s)).toBe('No data sharing enabled');
  });
});
