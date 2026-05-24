/** Normalize allergy values from PHR DB, registration text, or legacy object rows. */
export function normalizeAllergiesList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const label = rec.allergen ?? rec.name ?? rec.label ?? rec.substance;
        if (typeof label === 'string' && label.trim()) return [label.trim()];
      }
      return [];
    });
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        return normalizeAllergiesList(JSON.parse(s));
      } catch {
        /* plain text */
      }
    }
    return s.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

/** Normalize language tags from consultants API / PostgreSQL jsonb. */
export function normalizeLanguagesList(raw: unknown): string[] {
  if (raw == null) return ['Thai'];
  if (Array.isArray(raw)) {
    const list = raw
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
    return list.length ? list : ['Thai'];
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return ['Thai'];
    if (s.startsWith('[')) {
      try {
        return normalizeLanguagesList(JSON.parse(s));
      } catch {
        /* plain text */
      }
    }
    const list = s.split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
    return list.length ? list : ['Thai'];
  }
  return ['Thai'];
}

export function normalizeRating(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
