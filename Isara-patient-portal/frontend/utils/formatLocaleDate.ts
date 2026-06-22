/**
 * Safe locale date/time formatting — never returns "Invalid Date".
 */
export function parseValidDate(
  value: string | Date | number | null | undefined,
): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLocaleDateTime(
  value: string | Date | number | null | undefined,
  language: string,
  fallback = '—',
): string {
  const d = parseValidDate(value);
  if (!d) return fallback;
  return d.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLocaleDate(
  value: string | Date | number | null | undefined,
  language: string,
  fallback = '—',
): string {
  const d = parseValidDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
