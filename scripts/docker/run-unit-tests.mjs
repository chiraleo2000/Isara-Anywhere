#!/usr/bin/env node
/**
 * Run tests/unit inside Node 20 Docker.
 * Mounts New-Isara-Anywhere parent so sibling portals resolve.
 * Also symlinks issara-* under workspace for older contracts that join(workspace, 'issara-doctor/...').
 *
 * Usage: npm run test:unit:docker
 *        npm run test:unit:docker:coverage
 *
 * Coverage path runs `npm run test:coverage` (maxWorkers=1) and writes
 * html + json-summary + lcov to host tests/unit/coverage/ via the bind mount.
 *
 * SERIALIZE: Never run host `npm run test:unit:*` packs while this script is
 * mutating bind-mounted tests/unit/node_modules (Docker npm ci + host restore).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const anywhereRoot = path.resolve(repoRoot, '..');
const unitDir = path.join(repoRoot, 'tests/unit');
const toMount = (p) => (process.platform === 'win32' ? p.replaceAll('\\', '/') : p);

const wantCoverage = process.argv.includes('--coverage') || process.env.USE_DOCKER_COVERAGE === '1';
// Install deps inside an anonymous volume so Linux npm ci does not corrupt host node_modules.
const testCmd = wantCoverage
  ? 'npm ci && npm run test:coverage'
  : 'npm ci && npm test';

if (wantCoverage) {
  fs.mkdirSync(path.join(unitDir, 'coverage'), { recursive: true });
}

/** Recreate Windows directory junctions after Docker (ln -sfn leaves Linux symlinks Windows cannot read). */
function ensureWindowsSiblingJunctions() {
  if (process.platform !== 'win32') return;
  for (const name of ['issara-doctor', 'issara-patient', 'issara-jitsi']) {
    const link = path.join(repoRoot, name);
    const target = path.join(anywhereRoot, name);
    if (!fs.existsSync(target)) continue;
    try {
      fs.rmSync(link, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    const r = spawnSync('cmd', ['/c', 'mklink', '/J', link, target], { stdio: 'ignore' });
    if ((r.status ?? 1) !== 0) {
      console.warn(`[docker] warning: could not recreate junction ${name}`);
    }
  }
}

/** Ensure host Vitest can resolve esbuild after npm ci (npm 11 may skip postinstall). */
function ensureHostEsbuild() {
  const mainJs = path.join(unitDir, 'node_modules/esbuild/lib/main.js');
  const installJs = path.join(unitDir, 'node_modules/esbuild/install.js');
  const binPath = path.join(unitDir, 'node_modules/esbuild/bin/esbuild');
  const winPlatform = path.join(unitDir, 'node_modules/@esbuild/win32-x64/esbuild.exe');

  const ok = () =>
    fs.existsSync(mainJs) && (fs.existsSync(binPath) || fs.existsSync(winPlatform));

  if (ok()) return true;

  if (fs.existsSync(installJs)) {
    console.log('[docker] Running esbuild install.js (postinstall was skipped)…');
    spawnSync(process.execPath, [installJs], { cwd: unitDir, stdio: 'inherit' });
    if (ok()) return true;
  }

  console.log('[docker] Rebuilding esbuild…');
  const rebuild = spawnSync('npm', ['rebuild', 'esbuild'], {
    cwd: unitDir,
    stdio: 'inherit',
    shell: true,
  });
  if ((rebuild.status ?? 1) === 0 && ok()) return true;

  // Last resort: force optional platform package
  spawnSync('npm', ['install', '@esbuild/win32-x64@0.21.5', '--no-save'], {
    cwd: unitDir,
    stdio: 'inherit',
    shell: true,
  });
  spawnSync(process.execPath, [installJs], { cwd: unitDir, stdio: 'inherit' });
  return ok();
}

ensureWindowsSiblingJunctions();

const shellScript = [
  'cd /anywhere/issara-workspace',
  // Symlinks for legacy contracts that join(workspace, "issara-*"); vitest aliases use /anywhere/issara-* directly.
  'ln -sfn /anywhere/issara-doctor issara-doctor',
  'ln -sfn /anywhere/issara-patient issara-patient',
  'ln -sfn /anywhere/issara-jitsi issara-jitsi',
  'cd /anywhere/issara-workspace/tests/unit',
  testCmd,
].join(' && ');

const dockerArgs = [
  'run',
  '--rm',
  // Parent tree first, then overlay node_modules so Linux npm ci never mutates host.
  '-v',
  `${toMount(anywhereRoot)}:/anywhere`,
  '-v',
  'izara-unit-node-modules:/anywhere/issara-workspace/tests/unit/node_modules',
  '-w',
  '/anywhere/issara-workspace/tests/unit',
];

if (wantCoverage) {
  dockerArgs.push('-e', 'VITEST_COVERAGE=1');
}

dockerArgs.push('node:20-alpine', 'sh', '-c', shellScript);

console.log(
  `[docker] Running unit ${wantCoverage ? 'coverage' : 'tests'} in node:20-alpine (mount ${anywhereRoot})…`,
);
console.log('[docker] SERIALIZE: do not run host test:unit:* packs until this script exits.');
const result = spawnSync('docker', dockerArgs, { stdio: 'inherit', shell: false });
ensureWindowsSiblingJunctions();

// Host node_modules was not mutated by Docker (anon volume). Still ensure esbuild is present for packs.
if (process.platform === 'win32') {
  if (!fs.existsSync(path.join(unitDir, 'node_modules'))) {
    console.log('[docker] Host tests/unit/node_modules missing — running npm ci…');
    spawnSync('npm', ['ci'], {
      cwd: unitDir,
      stdio: 'inherit',
      shell: true,
    });
  }
  if (!ensureHostEsbuild()) {
    console.error('[docker] FATAL: esbuild missing after restore — host unit packs will fail.');
    process.exit(1);
  }
  console.log('[docker] Host esbuild OK.');
}

if (result.error) {
  console.error('[docker] Failed to start container:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
