import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

/**
 * Settings Dropdown Component
 * Allows users to switch theme and language
 */

// Icons
const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const SettingsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, language, setTheme, setLanguage, t } = useSettings();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Settings Button - Made more visible and test-friendly */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="settings-button"
        className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors relative shadow-sm border border-gray-200 dark:border-gray-600"
        aria-label="Settings"
        title={t('settings.settings')}
      >
        <SettingsIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          data-testid="settings-dropdown"
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-800/50 dark:to-teal-800/50 border-b border-gray-200 dark:border-gray-600">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('settings.settings')}</p>
          </div>

          {/* Theme Section */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <p className="px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              {t('settings.theme')}
            </p>
            <button
              onClick={() => setTheme('light')}
              data-testid="theme-light"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                theme === 'light' 
                  ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <SunIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{t('settings.lightMode')}</span>
              </div>
              {theme === 'light' && <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            </button>
            <button
              onClick={() => setTheme('dark')}
              data-testid="theme-dark"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 mt-1 ${
                theme === 'dark' 
                  ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <MoonIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{t('settings.darkMode')}</span>
              </div>
              {theme === 'dark' && <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            </button>
          </div>

          {/* Language Section */}
          <div className="p-3">
            <p className="px-2 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              {t('settings.language')}
            </p>
            <button
              onClick={() => setLanguage('th')}
              data-testid="lang-thai"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                language === 'th' 
                  ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🇹🇭</span>
                <span className="text-sm font-medium">{t('settings.thai')}</span>
              </div>
              {language === 'th' && <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            </button>
            <button
              onClick={() => setLanguage('en')}
              data-testid="lang-english"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 mt-1 ${
                language === 'en' 
                  ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🇺🇸</span>
                <span className="text-sm font-medium">{t('settings.english')}</span>
              </div>
              {language === 'en' && <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDropdown;
