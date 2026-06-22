#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { composeFile, envFile, repoRoot } from '../../docker/e2eDockerCommon.mjs';

const DOCKER_SERVICES = ['meeting-server', 'doctor-portal', 'patient-portal'];

function safeLabel(label) {
  return String(label || 'gate-failure').replace(/[^\w.-]+/g, '_');
}

/**
 * @param {string} dir
 * @param {(name: string, fullPath: string) => boolean} filter
 * @param {string[]} results
 */
function walkDir(dir, filter, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, filter, results);
    } else if (filter(entry.name, full)) {
      results.push(full);
    }
  }
  return results;
}

function copyInto(destRoot, subfolder, src, baseDir) {
  const rel = path.relative(baseDir, src);
  const target = path.join(destRoot, subfolder, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(src, target);
  return target;
}

/**
 * Copy Playwright traces, failed screenshots, and docker logs to reports/local-failures/.
 * @param {{ round: number|string, label?: string }} opts
 * @returns {string} archive directory path
 */
export function archiveFailure({ round, label = 'gate-failure' }) {
  const destDir = path.join(repoRoot, 'reports', 'local-failures', `round-${round}`, safeLabel(label));
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`\n[archive-failure] Collecting artifacts → ${destDir}`);

  const testResults = path.join(repoRoot, 'test-results');
  const traces = walkDir(
    testResults,
    (name) => name === 'trace.zip' || (name.endsWith('.zip') && name.includes('trace')),
  );
  const screenshots = walkDir(
    testResults,
    (name) => name.startsWith('test-failed') && name.endsWith('.png'),
  );

  for (const file of traces) {
    copyInto(destDir, 'traces', file, testResults);
  }
  for (const file of screenshots) {
    copyInto(destDir, 'screenshots', file, testResults);
  }

  const logResult = spawnSync(
    'docker',
    ['compose', '-f', composeFile, '--env-file', envFile, 'logs', '--tail', '200', ...DOCKER_SERVICES],
    { cwd: repoRoot, encoding: 'utf8', shell: false },
  );
  const logPath = path.join(destDir, 'docker-compose-logs-tail200.txt');
  fs.writeFileSync(
    logPath,
    [
      `# docker compose logs --tail 200 ${DOCKER_SERVICES.join(' ')}`,
      `# exit ${logResult.status ?? '?'}`,
      logResult.stdout || '',
      logResult.stderr || '',
    ].join('\n'),
  );

  const manifest = {
    archivedAt: new Date().toISOString(),
    round,
    label,
    traces: traces.length,
    screenshots: screenshots.length,
    destDir,
  };
  fs.writeFileSync(path.join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(
    `[archive-failure] archived ${traces.length} trace(s), ${screenshots.length} screenshot(s), docker logs`,
  );
  return destDir;
}

/**
 * Archive failure artifacts and exit with code 1.
 * @param {number|string} round
 * @param {string} [label]
 */
export function bailWithArchive(round, label) {
  archiveFailure({ round, label });
  process.exit(1);
}
