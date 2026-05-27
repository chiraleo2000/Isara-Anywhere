#!/usr/bin/env node
/**
 * Generate PDF from Thai User Guide markdown
 * Uses Playwright to render HTML and print to PDF with Thai font support
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Read markdown
const md = readFileSync(resolve(ROOT, 'docs/USER_GUIDE_TH.md'), 'utf8');

// Convert markdown to HTML (simple but functional)
function mdToHtml(markdown) {
  let html = markdown;
  
  // Escape HTML entities first (except in code blocks)
  // Skip - we want to preserve markdown formatting
  
  // Code blocks (``` ... ```)
  html = html.replaceAll(/```([^`]*?)```/gs, (_, code) => {
    return `<pre><code>${code.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</code></pre>`;
  });
  
  // Images
  html = html.replaceAll(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    // Resolve image path relative to docs/
    const imgPath = resolve(ROOT, 'docs', src).replaceAll('\\', '/');
    return `<img src="file:///${imgPath}" alt="${alt}" style="max-width:100%;height:auto;border:1px solid #ddd;border-radius:4px;margin:8px 0;">`;
  });
  
  // Links
  html = html.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Headers
  html = html.replaceAll(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replaceAll(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replaceAll(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replaceAll(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Horizontal rules
  html = html.replaceAll(/^---$/gm, '<hr>');
  
  // Bold and italic
  html = html.replaceAll(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replaceAll(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Inline code
  html = html.replaceAll(/`([^`]+)`/g, '<code>$1</code>');
  
  // Tables
  html = html.replaceAll(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, header, separator, rows) => {
    const headerCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const bodyRows = rows.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });
  
  // Blockquotes
  html = html.replaceAll(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replaceAll('</blockquote>\n<blockquote>', '<br>');
  
  // Unordered lists
  html = html.replaceAll(/^- (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replaceAll(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>');
  
  // Ordered lists
  html = html.replaceAll(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Paragraphs (lines that aren't already HTML)
  const lines = html.split('\n');
  const result = [];
  for (const line of lines) {
    if (line.trim() === '') {
      result.push('');
    } else if (line.trim().startsWith('<') || line.trim() === '') {
      result.push(line);
    } else {
      result.push(`<p>${line}</p>`);
    }
  }
  
  return result.join('\n');
}

const bodyHtml = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
  @page {
    margin: 2cm;
    size: A4;
  }
  body {
    font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #333;
    max-width: 100%;
  }
  h1 { font-size: 22pt; color: #1a5276; border-bottom: 3px solid #2e86c1; padding-bottom: 8px; page-break-after: avoid; }
  h2 { font-size: 16pt; color: #1a5276; border-bottom: 2px solid #85c1e9; padding-bottom: 6px; margin-top: 28px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: #2874a6; margin-top: 20px; page-break-after: avoid; }
  h4 { font-size: 11pt; color: #2e86c1; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; page-break-inside: avoid; }
  th { background: #2e86c1; color: white; padding: 8px 12px; text-align: left; font-size: 10pt; }
  td { border: 1px solid #ddd; padding: 6px 12px; font-size: 10pt; }
  tr:nth-child(even) { background: #f8f9fa; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 10pt; font-family: 'Consolas', monospace; }
  pre { background: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 6px; overflow-x: auto; page-break-inside: avoid; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { border-left: 4px solid #2e86c1; margin: 12px 0; padding: 8px 16px; background: #ebf5fb; font-size: 10pt; }
  img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 8px 0; page-break-inside: avoid; }
  hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }
  a { color: #2e86c1; text-decoration: none; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

// Write temp HTML
const tmpHtml = resolve(ROOT, 'docs/USER_GUIDE_TH.html');
writeFileSync(tmpHtml, fullHtml, 'utf8');
console.log('HTML generated:', tmpHtml);

// Generate PDF using Playwright
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file:///${tmpHtml.replaceAll('\\', '/')}`, { waitUntil: 'networkidle' });

const pdfPath = resolve(ROOT, 'docs/USER_GUIDE_TH.pdf');
await page.pdf({
  path: pdfPath,
  format: 'A4',
  margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div style="font-size:8pt;text-align:center;width:100%;color:#999;">IZARA Telemedicine — คู่มือการใช้งาน</div>',
  footerTemplate: '<div style="font-size:8pt;text-align:center;width:100%;color:#999;">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});

await browser.close();
console.log('PDF generated:', pdfPath);
