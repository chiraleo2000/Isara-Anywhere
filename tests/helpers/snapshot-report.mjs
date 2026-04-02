/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA — Snapshot Report Generator
 * ═══════════════════════════════════════════════════════════════════════
 * Generates an HTML report from all test-results/snapshots/*.png files.
 * Embeds screenshots and categorizes by test suite.
 *
 * Usage: node tests/helpers/snapshot-report.mjs
 * Output: test-results/snapshot-report.html
 * ═══════════════════════════════════════════════════════════════════════
 */
import fs from 'node:fs';
import path from 'node:path';

const SNAPSHOT_DIR = path.resolve('test-results/snapshots');
const OUTPUT_PATH = path.resolve('test-results/snapshot-report.html');

function collectScreenshots(dir, prefix = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectScreenshots(fullPath, path.join(prefix, entry.name)));
    } else if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg')) {
      results.push({
        name: entry.name,
        category: prefix || 'root',
        path: fullPath,
        relativePath: path.join(prefix, entry.name),
        size: fs.statSync(fullPath).size,
        modified: fs.statSync(fullPath).mtime,
      });
    }
  }
  return results;
}

function generateHTML(screenshots) {
  const grouped = {};
  for (const s of screenshots) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  const categoryHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, shots]) => {
      const imageCards = shots.map(s => {
        const base64 = fs.readFileSync(s.path).toString('base64');
        const sizeKB = (s.size / 1024).toFixed(1);
        return `
          <div class="card">
            <h3>${s.name}</h3>
            <img src="data:image/png;base64,${base64}" alt="${s.name}" loading="lazy" />
            <p class="meta">${sizeKB} KB — ${new Date(s.modified).toLocaleString()}</p>
          </div>`;
      }).join('\n');

      return `
        <section>
          <h2>${category} (${shots.length} screenshots)</h2>
          <div class="grid">${imageCards}</div>
        </section>`;
    }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Izara Test Snapshot Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 2rem; color: #333; }
    h1 { text-align: center; margin-bottom: 0.5rem; color: #1a5276; }
    .summary { text-align: center; color: #666; margin-bottom: 2rem; }
    section { margin-bottom: 3rem; }
    h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; margin-bottom: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
    .card { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card h3 { font-size: 0.9rem; color: #2c3e50; margin-bottom: 0.5rem; word-break: break-all; }
    .card img { width: 100%; border-radius: 4px; border: 1px solid #eee; }
    .meta { font-size: 0.75rem; color: #999; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>🏥 Izara Telemedicine — Test Snapshot Report</h1>
  <p class="summary">Generated: ${new Date().toLocaleString()} — ${screenshots.length} screenshots across ${Object.keys(grouped).length} categories</p>
  ${categoryHTML}
</body>
</html>`;
}

// Main
const screenshots = collectScreenshots(SNAPSHOT_DIR);
if (screenshots.length === 0) {
  console.log('⚠️  No screenshots found in test-results/snapshots/');
  console.log('    Run E2E tests first: npx playwright test');
} else {
  const html = generateHTML(screenshots);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, html, 'utf-8');
  console.log(`✅ Snapshot report: ${OUTPUT_PATH} (${screenshots.length} screenshots)`);
}
