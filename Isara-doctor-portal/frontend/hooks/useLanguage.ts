/**
 * Language hook — re-exports from SettingsProvider so all components
 * share one language state (default Thai, synced via localStorage).
 */
export type { Language } from './useSettings';
export { useLanguage } from './useSettings';
