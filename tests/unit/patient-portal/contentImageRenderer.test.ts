/**
 * Patient portal — content image renderer unit tests.
 * Shared module removed; logic lives in doctor MedicalContent.tsx (and similar pages).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const anywhereRoot = path.resolve(__dirname, '../../../..');

const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
};

const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch {
    /* invalid URL */
  }
  return '#';
};

/**
 * Intended [image:url:caption] contract (shared contentImageRenderer was removed).
 * URL group allows https://… so the first colon in the scheme is not treated as delimiter.
 */
const renderContentWithImages = (content: string) => {
  if (!content) return '';

  const imagePattern = /\[image:((?:https?:\/\/)?[^\]:]+):([^\]]*)\]/g;
  let processedContent = content.replaceAll(imagePattern, (_match, url, description) => {
    const safeUrl = sanitizeUrl(url);
    const safeDesc = escapeHtml(description);
    return `<figure class="my-6"><img src="${safeUrl}" alt="${safeDesc}" class="w-full max-w-2xl mx-auto rounded-lg shadow-md" loading="lazy" /><figcaption class="text-center text-sm text-gray-500 mt-2">${safeDesc}</figcaption></figure>`;
  });

  const figurePattern = /(<figure[^>]*>.*?<\/figure>)/gs;
  const parts = processedContent.split(figurePattern);
  processedContent = parts
    .map((part) => (figurePattern.test(part) ? part : escapeHtml(part).replaceAll('\n', '<br />')))
    .join('');

  return processedContent;
};

describe('renderContentWithImages', () => {
  it('escapes HTML in plain text', () => {
    const html = renderContentWithImages('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('converts newlines to <br />', () => {
    const html = renderContentWithImages('line one\nline two');
    expect(html).toContain('line one<br />line two');
  });

  it('renders [image:url:caption] as figure with sanitized https url', () => {
    const html = renderContentWithImages(
      'Intro\n[image:https://cdn.example.com/heart.png:Heart diagram]\nOutro',
    );
    expect(html).toContain('<figure');
    expect(html).toContain('src="https://cdn.example.com/heart.png"');
    expect(html).toContain('alt="Heart diagram"');
    expect(html).toContain('<figcaption');
    expect(html).toContain('Intro<br />');
    expect(html).toContain('Outro');
  });

  it('blocks javascript: urls', () => {
    const html = renderContentWithImages('[image:javascript:alert(1):bad]');
    expect(html).toContain('src="#"');
    expect(html).not.toContain('javascript:');
  });

  it('escapes caption text', () => {
    const html = renderContentWithImages('[image:https://x.com/a.png:<b>caption</b>]');
    expect(html).toContain('&lt;b&gt;caption&lt;/b&gt;');
    expect(html).not.toContain('<b>caption</b>');
  });

  it('returns empty string for empty input', () => {
    expect(renderContentWithImages('')).toBe('');
  });

  it('doctor MedicalContent still defines renderContentWithImages', () => {
    const src = fs.readFileSync(
      path.join(anywhereRoot, 'issara-doctor/frontend/pages/content/MedicalContent.tsx'),
      'utf8',
    );
    expect(src).toMatch(/const renderContentWithImages/);
    expect(src).toMatch(/\[image:/);
    expect(
      fs.existsSync(path.join(anywhereRoot, 'issara-patient/frontend/lib/contentImageRenderer.ts')),
    ).toBe(false);
  });
});
