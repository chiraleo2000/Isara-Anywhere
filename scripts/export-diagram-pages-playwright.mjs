#!/usr/bin/env node
/**
 * Export diagrams.drawio pages to PNG (Playwright + export3.html).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const masterPath = path.join(root, 'docs', 'diagrams', 'diagrams.drawio');
const outDir = path.join(root, 'docs', 'diagrams', 'export', 'pages');

const SCALE = Number(process.env.DRAWIO_SCALE || 2);
const BORDER = Number(process.env.DRAWIO_BORDER || 15);
/** Report uses first N tabs only; diagrams.drawio may have more (e.g. page 13). */
const REPORT_PAGE_LIMIT = Number(process.env.DRAWIO_REPORT_PAGES || 12);

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

async function openExportPage(page) {
  await page.goto('https://viewer.diagrams.net/export3.html', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => typeof render === 'function', { timeout: 60000 });
}

async function exportOne(page, pageXml, pageId) {
  const wrapped = `<mxfile host="app.diagrams.net" agent="IsaraAnywhere" version="21.0.0">${pageXml}</mxfile>`;
  await openExportPage(page);
  await page.evaluate(
    (arg) => {
      render(arg);
    },
    { xml: wrapped, format: 'png', scale: SCALE, border: BORDER, bg: '#ffffff', shadows: false },
  );
  await page.waitForFunction(
    (id) => {
      const nodes = document.querySelectorAll('#LoadingComplete');
      if (!nodes.length) return false;
      const last = nodes[nodes.length - 1];
      return last.getAttribute('page-id') === id && last.getAttribute('bounds');
    },
    pageId,
    { timeout: 120000 },
  );
  const boundsRaw = await page.evaluate(() => {
    const nodes = document.querySelectorAll('#LoadingComplete');
    return nodes[nodes.length - 1].getAttribute('bounds');
  });
  const bounds = JSON.parse(boundsRaw);
  const w = Math.min(Math.ceil(bounds.width + bounds.x + BORDER), 4000);
  const h = Math.min(Math.ceil(bounds.height + bounds.y + BORDER), 3000);
  await page.setViewportSize({ width: Math.max(w, 800), height: Math.max(h, 600) });
  return page.screenshot({ type: 'png', fullPage: true });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const allPages = extractPages(fs.readFileSync(masterPath, 'utf8'));
  const pages = allPages.slice(0, REPORT_PAGE_LIMIT);
  const skipped = allPages.length - pages.length;
  console.log(
    `Export ${pages.length} page(s) for report (scale=${SCALE}, drawio has ${allPages.length}, skipped ${skipped}) → ${outDir}`,
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(120000);

  const manifest = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const num = String(i + 1).padStart(2, '0');
    const file = `${num}-${slug(p.name)}.png`;
    const outPath = path.join(outDir, file);
    process.stdout.write(`  [${num}] ${p.name.replace(/&amp;/g, '&')} ... `);
    try {
      const buf = await exportOne(page, p.inner, p.id);
      fs.writeFileSync(outPath, buf);
      console.log(`${(buf.length / 1024).toFixed(0)} KB`);
      manifest.push({ index: i + 1, name: p.name, id: p.id, file, bytes: buf.length });
    } catch (e) {
      console.log('FAILED');
      console.error(`    ${e.message}`);
      manifest.push({ index: i + 1, name: p.name, id: p.id, file, error: String(e.message) });
    }
  }

  await browser.close();
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ scale: SCALE, border: BORDER, pages: manifest }, null, 2),
  );
  const ok = manifest.filter((x) => !x.error).length;
  console.log(`Done: ${ok}/${pages.length}`);
  if (ok < pages.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
