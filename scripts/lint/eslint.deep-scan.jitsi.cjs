#!/usr/bin/env node
/**
 * Deep ESLint pass for Izara-jitsi-server — no --fix.
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const root = path.resolve(__dirname, '../..');
const cwd = path.join(root, 'Izara-jitsi-server');

const config = {
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  ignorePatterns: ['node_modules/**', '**/*.test.*', 'dist/**'],
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-console': 'off',
    'require-await': 'off',
  },
};

const configPath = path.join(root, 'scripts', 'lint', '.eslint.deep.jitsi.cjs');
fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};\n`);

const eslintBin = path.join(root, 'Isara-doctor-portal', 'node_modules', 'eslint', 'bin', 'eslint.js');
const backendGlob = path.join(cwd, 'backend', '**', '*.js');
const result = spawnSync(
  process.execPath,
  [eslintBin, '-c', configPath, backendGlob, '--max-warnings', '0'],
  { cwd: root, stdio: 'pipe', shell: false, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
