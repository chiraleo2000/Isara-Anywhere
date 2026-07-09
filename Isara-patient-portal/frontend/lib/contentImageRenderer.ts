/**
 * Renders medical article body text with embedded [image:url:caption] markers.
 * Used by Health Library and Health Studio Medical Content tab.
 */
export function renderContentWithImages(content: string): string {
  if (!content) return '';
  const escapeHtml = (str: string) =>
    str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const sanitizeUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch {
      /* invalid url */
    }
    return '#';
  };
  let processed = content.replace(
    /\[image:([^\]]+)\]/g,
    (_m, inner: string) => {
      const lastColon = inner.lastIndexOf(':');
      if (lastColon <= 0) return _m;
      const url = inner.slice(0, lastColon).trim();
      const desc = inner.slice(lastColon + 1).trim();
      return `<figure class="my-4"><img src="${sanitizeUrl(url)}" alt="${escapeHtml(desc)}" class="w-full max-w-2xl mx-auto rounded-lg" loading="lazy" /><figcaption class="text-center text-sm text-gray-500 mt-2">${escapeHtml(desc)}</figcaption></figure>`;
    }
  );
  const figurePattern = /(<figure[^>]*>.*?<\/figure>)/gs;
  const parts = processed.split(figurePattern);
  processed = parts
    .map((part) => (figurePattern.test(part) ? part : escapeHtml(part).replaceAll('\n', '<br />')))
    .join('');
  return processed;
}
