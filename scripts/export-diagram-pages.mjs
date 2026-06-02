#!/usr/bin/env node
/**
 * Export each tab of docs/diagrams/diagrams.drawio to PNG via diagrams.net export service.
 * High scale for readable text. Output: docs/diagrams/export/pages/01-....png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const masterPath = path.join(root, 'docs', 'diagrams', 'diagrams.drawio');
const outDir = path.join(root, 'docs', 'diagrams', 'export', 'pages');

const SCALE = process.env.DRAWIO_SCALE || '3';
const BORDER = process.env.DRAWIO_BORDER || '15';
const EXPORT_URL = 'https://convert.diagrams.net/node/export';

function slug(name) {
  return name
    .replace(/&amp;/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .toLowerCase();
}

function extractPages(xml) {
  const pages = [];
  const re = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const nameM = attrs.match(/name="([^"]*)"/);
    const idM = attrs.match(/id="([^"]*)"/);
    pages.push({
      name: nameM ? nameM[1] : `Page ${pages.length + 1}`,
      id: idM ? idM[1] : `page-${pages.length}`,
      inner: m[0],
    });
  }
  return pages;
}

async function exportPage(pageXml, outPath) {
  const wrapped = `<mxfile host="app.diagrams.net" agent="IsaraAnywhere" version="21.0.0">${pageXml}</mxfile>`;
  const qs = new URLSearchParams({
    format: 'png',
    scale: SCALE,
    border: BORDER,
    bg: '#ffffff',
  });
  const url = `${EXPORT_URL}?${qs}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `xml=${encodeURIComponent(wrapped)}`,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Export failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('image')) {
    const text = await res.text();
    throw new Error(`Not an image (${ct}): ${text.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const xml = fs.readFileSync(masterPath, 'utf8');
  const pages = extractPages(xml);
  console.log(`Exporting ${pages.length} pages (scale=${SCALE}) → ${outDir}`);

  const manifest = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const num = String(i + 1).padStart(2, '0');
    const file = `${num}-${slug(p.name)}.png`;
    const outPath = path.join(outDir, file);
    process.stdout.write(`  [${num}] ${p.name} ... `);
    try {
      const bytes = await exportPage(p.inner, outPath);
      console.log(`${(bytes / 1024).toFixed(0)} KB → ${file}`);
      manifest.push({ index: i + 1, name: p.name, id: p.id, file, bytes });
    } catch (e) {
      console.log('FAILED');
      console.error(`    ${e.message}`);
      manifest.push({ index: i + 1, name: p.name, id: p.id, file, error: e.message });
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ scale: SCALE, border: BORDER, pages: manifest }, null, 2),
  );
  const ok = manifest.filter((x) => !x.error).length;
  console.log(`Done: ${ok}/${pages.length} PNG exported.`);
  if (ok < pages.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
