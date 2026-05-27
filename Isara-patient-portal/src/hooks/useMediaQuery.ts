import { useEffect, useState } from 'react';

/** Match a CSS media query (e.g. `(max-width: 1023px)` for below lg). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof globalThis.matchMedia !== 'function') return false;
    return globalThis.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = globalThis.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
