/**
 * Patient portal — content image renderer unit tests.
 * Covers Health Library + Health Studio article body rendering.
 */
import { describe, it, expect } from 'vitest';
import { renderContentWithImages } from '../../../Isara-patient-portal/frontend/lib/contentImageRenderer';

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
      'Intro\n[image:https://cdn.example.com/heart.png:Heart diagram]\nOutro'
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
});
