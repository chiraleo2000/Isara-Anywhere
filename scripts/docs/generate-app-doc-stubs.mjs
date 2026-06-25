#!/usr/bin/env node
/**
 * Generate README, WORKFLOWS, FEATURES, API, TEST_COVERAGE stubs per app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const APPS = {
  'Isara-patient-portal': {
    name: 'Isara Patient Portal',
    port: 3005,
    pgPort: 5434,
    pages: 16,
    workflows: ['A-auth', 'B-patient-portal', 'G-livingwill-pdpa', 'H-content-resources', 'I-admin-notifications', 'J-ai-timeline-map'],
    workflowSources: [
      'Processes/Appointment_Workflows.md (book, pool submit)',
      'Processes/VIDEO_MEETING_JITSI_GEMINI.md (patient join)',
      'Processes/POST_MEETING_WORKFLOW.md (results delivery)',
      'Processes/Separated_Workflows_And_Functions.md (A,B,H,I,J,K,N)',
    ],
    features: ['Auth & registration', 'PHR & health records', 'Appointments', 'Living will & PDPA', 'AI doctor triage', 'Notifications', 'Medical content library'],
    apiPrefix: '/api',
  },
  'Isara-doctor-portal': {
    name: 'Isara Doctor Portal',
    port: 3010,
    pgPort: 5435,
    pages: 22,
    workflows: ['A-auth', 'C-doctor-portal', 'D-appointments', 'E-meeting-clinical', 'F-phr-health-records', 'L-lab-ordering'],
    workflowSources: [
      'Processes/Appointment_Workflows.md (pool admin, schedule)',
      'Processes/VIDEO_MEETING_JITSI_GEMINI.md (doctor HOST)',
      'Processes/POST_MEETING_WORKFLOW.md (man-in-loop)',
      'Processes/Separated_Workflows_And_Functions.md (A,B,E–G,O,P,K,L)',
    ],
    features: ['Auth & admin approval', 'EMR editor', 'Appointment pool & scheduling', 'Prescribing & lab orders', 'Virtual meeting host', 'Clinical resources', 'Queue management'],
    apiPrefix: '/api',
  },
  'Izara-jitsi-server': {
    name: 'Izara Meeting Server',
    port: 3020,
    pgPort: 5436,
    pages: 4,
    workflows: ['Q-meeting-lifecycle', 'Q2-post-meeting-doctor', 'test:meeting-server:contract'],
    workflowSources: [
      'Processes/VIDEO_MEETING_JITSI_GEMINI.md (primary)',
      'Processes/POST_MEETING_WORKFLOW.md (primary)',
      'Processes/Appointment_Workflows.md (appointment→meeting)',
      'Processes/Separated_Workflows_And_Functions.md (C,D)',
    ],
    features: ['Jitsi lobby & roles', 'Meeting lifecycle API', 'Transcription pipeline', 'Gemini AI summary', 'Post-meeting results', 'Recording crypto'],
    apiPrefix: '/api/meeting',
  },
};

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function writeAlways(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

for (const [dir, cfg] of Object.entries(APPS)) {
  const docsDir = path.join(repoRoot, dir, 'docs');
  fs.mkdirSync(path.join(docsDir, 'workflows'), { recursive: true });

  const readme = `# ${cfg.name} — Documentation

**Port:** ${cfg.port} · **Standalone PG:** ${cfg.pgPort} · **Page specs:** ${cfg.pages}

## Contents

| Doc | Description |
|-----|-------------|
| [pages/](pages/) | UI page specs from \`Processes/Pages/\` |
| [WORKFLOWS.md](WORKFLOWS.md) | Workflow excerpts & E2E project mapping |
| [FEATURES.md](FEATURES.md) | Feature list |
| [API.md](API.md) | HTTP/WebSocket API overview |
| [DATABASE.md](DATABASE.md) | Table ownership (generated) |
| [TEST_COVERAGE.md](TEST_COVERAGE.md) | Test IDs per workflow |

## Refresh

From platform repo root:

\`\`\`bash
npm run docs:sync-to-apps
\`\`\`

See [docs/APP_DOCS_SYNC.md](../../docs/APP_DOCS_SYNC.md).
`;

  const workflows = `# ${cfg.name} — Workflows

## E2E projects (standalone smoke)

${cfg.workflows.map((w) => `- \`${w}\``).join('\n')}

## Platform sources

${cfg.workflowSources.map((s) => `- ${s}`).join('\n')}

## Standalone mode

Set \`STANDALONE_MODE=1\` and base URL \`http://localhost:${cfg.port}\` when running \`npm run test:standalone\`.
`;

  const features = `# ${cfg.name} — Features

${cfg.features.map((f) => `- ${f}`).join('\n')}
`;

  const api = `# ${cfg.name} — API Overview

**Base URL:** \`http://localhost:${cfg.port}\`  
**Health:** \`GET /health\`

Primary routes under \`${cfg.apiPrefix}\`. Full OpenAPI-style detail lives in backend source and platform \`Processes/\` workflow docs.

## Auth

JWT/session alignment with platform \`shared/corsPolicy.cjs\` (vendored in \`shared/\` for standalone builds).
`;

  const testCoverage = `# ${cfg.name} — Test Coverage

Generated header — map each WORKFLOWS item to a test ID or N/A.

| Workflow | Unit | E2E / Contract | Standalone |
|----------|------|----------------|------------|
${cfg.workflows.map((w) => `| ${w} | see tests/unit | Playwright / contract | \`test:standalone\` |`).join('\n')}

Platform matrix: \`docs/COMBINED_TEST_COVERAGE.md\` · \`tests/PROCESS_COVERAGE_MATRIX.md\`
`;

  writeAlways(path.join(docsDir, 'README.md'), readme);
  writeAlways(path.join(docsDir, 'WORKFLOWS.md'), workflows);
  writeAlways(path.join(docsDir, 'FEATURES.md'), features);
  writeAlways(path.join(docsDir, 'API.md'), api);
  writeAlways(path.join(docsDir, 'TEST_COVERAGE.md'), testCoverage);
  console.log(`✅ ${dir}/docs stubs`);
}
