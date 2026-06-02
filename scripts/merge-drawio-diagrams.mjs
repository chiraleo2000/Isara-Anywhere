#!/usr/bin/env node
/**
 * WARNING: This script OVERWRITES docs/diagrams/diagrams.drawio.
 * Do NOT run if you maintain the drawio file manually.
 * Report generation (npm run diagrams:report) does NOT call this script.
 *
 * Why duplicates existed: an earlier merge APPENDED tabs 11–19 from standalone files
 * without removing legacy tabs 1–10, so names like "System Architecture" appeared twice.
 *
 * Canonical layout (12 pages, v1.7.48):
 *   1–2   System Overview + Full Platform (standalone files)
 *   3–8   Complete E2E flows (standalone Complete file)
 *   9–12  Unique legacy topics kept from old master (PHR, Living Will, ERD, E2E)
 *   (no Testing & Quality Gates tab)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const diagramsDir = path.join(root, 'docs', 'diagrams');

const systemPath = path.join(diagramsDir, 'Isara_Anywhere_System_Diagram.drawio');
const fullPath = path.join(diagramsDir, 'Isara_Anywhere_Full_Diagram.drawio');
const completePath = path.join(diagramsDir, 'Isara_Anywhere_Complete_Diagram.drawio');
const masterPath = path.join(diagramsDir, 'diagrams.drawio');

/** Legacy tab ids to keep (unique topics not in Complete deck). */
const LEGACY_KEEP_IDS = new Set(['1713', '1714', '1716', '1718']);

function escapeAmpersandsInXml(text) {
  return text.replace(/&(?!amp;|lt;|gt;|quot;|#\w+;)/g, '&amp;');
}

function stripXmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function extractMxGraphModel(text) {
  const cleaned = stripXmlComments(text);
  const m = cleaned.match(/<mxGraphModel[\s\S]*?<\/mxGraphModel>/);
  if (!m) throw new Error('No mxGraphModel found');
  return m[0];
}

function extractDiagramBlocks(text) {
  const cleaned = escapeAmpersandsInXml(stripXmlComments(text));
  if (!cleaned.includes('<mxfile')) {
    const model = extractMxGraphModel(cleaned);
    return [{ name: 'Diagram', id: 'merged-0', model }];
  }
  const blocks = [];
  const re = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g;
  let match;
  while ((match = re.exec(cleaned)) !== null) {
    const attrs = match[1];
    const nameM = attrs.match(/name="([^"]*)"/);
    const idM = attrs.match(/id="([^"]*)"/);
    const modelM = match[2].match(/<mxGraphModel[\s\S]*?<\/mxGraphModel>/);
    if (!modelM) continue;
    blocks.push({
      name: nameM ? nameM[1] : 'Diagram',
      id: idM ? idM[1] : `merged-${blocks.length}`,
      model: modelM[0],
    });
  }
  return blocks;
}

function wrapSingleFile(text, defaultName, defaultId) {
  const model = extractMxGraphModel(text);
  const body = escapeAmpersandsInXml(model);
  return `<mxfile host="app.diagrams.net" agent="IsaraAnywhere" version="21.0.0">\n  <diagram name="${defaultName}" id="${defaultId}">\n    ${body}\n  </diagram>\n</mxfile>\n`;
}

function wrapMultiFile(blocks) {
  const parts = blocks.map(
    (b) => `  <diagram name="${b.name}" id="${b.id}">\n    ${b.model}\n  </diagram>`,
  );
  return `<mxfile host="app.diagrams.net" agent="IsaraAnywhere" version="21.0.0">\n${parts.join('\n')}\n</mxfile>\n`;
}

function patchVersionLabels(text) {
  return text
    .replace(/v1\.7\.33/g, 'v1.7.48')
    .replace(/v1\.6\.0/g, 'v1.7.48')
    .replace(/Gemini 2\.5 Flash Lite/g, 'Gemini 3.1 Flash Lite')
    .replace(/Gemini 2\.5/g, 'Gemini 3.1')
    .replace(/2\.5 Flash Lite/g, '3.1 Flash Lite');
}

function testingPageModel() {
  return `<mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="tg_title" value="ISARA ANYWHERE — Testing &amp; Quality Gates v1.7.48" style="text;html=1;fillColor=#1a1a2e;fontColor=#fff;fontSize=18;fontStyle=1;rounded=1;align=center;" vertex="1" parent="1">
          <mxGeometry x="30" y="20" width="1200" height="46" as="geometry" />
        </mxCell>
        <mxCell id="tg_sub" value="2736 unit tests · 85 cloud headed Playwright · 36 defect-regression · sonar:lint 0 errors · 212 UI screenshots" style="text;html=1;fillColor=none;strokeColor=none;fontSize=11;align=center;fontColor=#444;" vertex="1" parent="1">
          <mxGeometry x="30" y="68" width="1200" height="22" as="geometry" />
        </mxCell>
        <mxCell id="tg_lane1" value="UNIT (Vitest)" style="swimlane;startSize=28;fillColor=#e3f2fd;strokeColor=#1565c0;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="30" y="110" width="380" height="320" as="geometry" />
        </mxCell>
        <mxCell id="tg_u1" value="151 test files PASS&#xa;2736 tests PASS&#xa;clinicalComponentStructure.regression&#xa;defectRegisterCoverage.regression" style="rounded=1;fillColor=#bbdefb;strokeColor=#1565c0;fontSize=10;align=left;spacingLeft=6;" vertex="1" parent="1">
          <mxGeometry x="50" y="150" width="340" height="70" as="geometry" />
        </mxCell>
        <mxCell id="tg_u2" value="npm run test:quality:gate&#xa;npm run test:unit:report" style="rounded=1;fillColor=#bbdefb;strokeColor=#1565c0;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="50" y="230" width="340" height="50" as="geometry" />
        </mxCell>
        <mxCell id="tg_lane2" value="UI CLOUD (Playwright headed)" style="swimlane;startSize=28;fillColor=#e8f5e9;strokeColor=#388e3c;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="430" y="110" width="400" height="320" as="geometry" />
        </mxCell>
        <mxCell id="tg_p1" value="test:cloud:full — 85/85 PASS (7.7m)&#xa;Groups A–P · docs/screenshots/ (212 PNG)" style="rounded=1;fillColor=#c8e6c9;strokeColor=#388e3c;fontSize=10;align=left;spacingLeft=6;" vertex="1" parent="1">
          <mxGeometry x="450" y="150" width="360" height="55" as="geometry" />
        </mxCell>
        <mxCell id="tg_p2" value="Defect-regression — 36/36 PASS&#xa;group-defect/ screenshots (DN*, DA*, DM*, DG*)" style="rounded=1;fillColor=#c8e6c9;strokeColor=#388e3c;fontSize=10;align=left;spacingLeft=6;" vertex="1" parent="1">
          <mxGeometry x="450" y="215" width="360" height="55" as="geometry" />
        </mxCell>
        <mxCell id="tg_lane3" value="DEFECT FIXES (v1.7.48)" style="swimlane;startSize=28;fillColor=#fff3e0;strokeColor=#e65100;fontSize=12;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="850" y="110" width="380" height="320" as="geometry" />
        </mxCell>
        <mxCell id="tg_d1" value="EmrEditorChrome · PrescribingModalChrome&#xa;LiveTranscriptionView · ValidationAction&#xa;notificationRouting · read-all API&#xa;Gemini server proxy · Izara lobby M2" style="rounded=1;fillColor=#ffe0b2;strokeColor=#e65100;fontSize=10;align=left;spacingLeft=6;" vertex="1" parent="1">
          <mxGeometry x="870" y="150" width="340" height="80" as="geometry" />
        </mxCell>
        <mxCell id="tg_d2" value="23/23 defects Verified&#xa;reports/defect-fix/v1.7.48-final.txt" style="rounded=1;fillColor=#ffe0b2;strokeColor=#e65100;fontSize=10;" vertex="1" parent="1">
          <mxGeometry x="870" y="240" width="340" height="50" as="geometry" />
        </mxCell>
        <mxCell id="tg_note" value="Evidence: docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md · npm run test:cloud:full regenerates user guides" style="text;html=1;fillColor=#fffde7;strokeColor=#d6b656;fontSize=10;rounded=1;align=center;" vertex="1" parent="1">
          <mxGeometry x="30" y="450" width="1200" height="32" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>`;
}

function buildMasterXml(pages) {
  const parts = pages.map(
    (p) => `  <diagram name="${p.name}" id="${p.id}">\n    ${p.model}\n  </diagram>`,
  );
  return `<mxfile host="app.diagrams.net" agent="IsaraAnywhere" version="21.0.0" pages="${pages.length}">\n${parts.join('\n')}\n</mxfile>\n`;
}

// --- Fix standalone source files ---
const systemRaw = fs.readFileSync(systemPath, 'utf8');
const fullRaw = fs.readFileSync(fullPath, 'utf8');
const completeRaw = fs.readFileSync(completePath, 'utf8');
const masterRaw = fs.existsSync(masterPath) ? fs.readFileSync(masterPath, 'utf8') : '';

const systemFixed = patchVersionLabels(
  wrapSingleFile(systemRaw, 'System Architecture Overview', 'sys-overview-v1748'),
);
const fullFixed = patchVersionLabels(
  wrapSingleFile(fullRaw, 'Full Platform Diagram', 'full-platform-v1748'),
);

const completeBlocks = extractDiagramBlocks(completeRaw).map((b) => ({
  ...b,
  model: patchVersionLabels(b.model),
  name: patchVersionLabels(b.name),
}));
const completeFixed = patchVersionLabels(wrapMultiFile(completeBlocks));

fs.writeFileSync(systemPath, systemFixed);
fs.writeFileSync(fullPath, fullFixed);
fs.writeFileSync(completePath, completeFixed);
console.log('Fixed standalone drawio files (mxfile wrapper + XML escapes)');

// --- Pull unique legacy pages from old master (PHR, Living Will, ERD, E2E) ---
const legacyBlocks = masterRaw ? extractDiagramBlocks(masterRaw) : [];
const legacyKeep = legacyBlocks.filter((b) => LEGACY_KEEP_IDS.has(b.id));

const legacyNames = {
  '1713': 'Health Records (PHR-EMR)',
  '1714': 'Living Will',
  '1716': 'Database ERD',
  '1718': 'E2E Workflow Steps',
};

// --- Assemble clean master (12 pages, no duplicates) ---
const completeLabels = [
  'System Architecture',
  'Login &amp; Auth Flow',
  'Appointment Workflow',
  'AI Meeting Pipeline',
  'Realtime &amp; Notifications',
  'Deployment Architecture',
];

const pages = [];
let n = 1;

pages.push({
  name: `${n++}. System Overview (Portal Map)`,
  id: '1748-sys',
  model: patchVersionLabels(extractMxGraphModel(systemRaw)),
});

pages.push({
  name: `${n++}. Full Platform Diagram`,
  id: '1748-full',
  model: patchVersionLabels(extractMxGraphModel(fullRaw)),
});

completeBlocks.forEach((block, i) => {
  pages.push({
    name: `${n++}. ${completeLabels[i] || block.name}`,
    id: `1748-complete-${i + 1}`,
    model: block.model,
  });
});

for (const block of legacyKeep) {
  pages.push({
    name: `${n++}. ${legacyNames[block.id] || block.name.replace(/^\d+\.\s*/, '')}`,
    id: block.id,
    model: patchVersionLabels(block.model),
  });
}

// 12 pages — no Testing & Quality Gates tab (removed per product scope)
fs.writeFileSync(masterPath, buildMasterXml(pages));

console.log(`Built clean diagrams.drawio — ${pages.length} pages (no Testing tab):`);
pages.forEach((p) => console.log(`  · ${p.name}`));

try {
  execSync('node scripts/rebuild-erd-diagram.mjs', { cwd: root, stdio: 'inherit' });
} catch {
  console.warn('Warning: rebuild-erd-diagram.mjs failed — ERD page unchanged');
}
console.log('Done.');
