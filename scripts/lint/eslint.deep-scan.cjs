#!/usr/bin/env node
/**
 * Deep ESLint pass (doctor or patient portal) — no --fix.
 * Usage: node scripts/lint/eslint.deep-scan.cjs --portal doctor|patient
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const portalArg = process.argv.find((a) => a.startsWith('--portal='))
  || (process.argv.includes('--portal') ? `--portal=${process.argv[process.argv.indexOf('--portal') + 1]}` : '--portal=doctor');
const portal = portalArg.split('=')[1] || 'doctor';
const dir = portal === 'patient' ? 'Isara-patient-portal' : 'Isara-doctor-portal';
const cwd = path.join(root, dir);

const config = {
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks', 'sonarjs', 'promise'],
  extends: [],
  ignorePatterns: ['dist/**', 'node_modules/**', '**/*.test.*', '**/*.spec.*', 'coverage/**'],
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'require-await': 'off',
    'no-console': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'sonarjs/no-identical-functions': 'off',
    'sonarjs/cognitive-complexity': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-return-wrap': 'error',
  },
};

const configPath = path.join(cwd, `.eslint.deep.${portal}.cjs`);
require('node:fs').writeFileSync(
  configPath,
  `module.exports = ${JSON.stringify(config, null, 2)};\n`,
);

const globs = ['frontend/**/*.{ts,tsx}', 'backend/**/*.{ts,js,cjs}'];
const eslintBin = path.join(cwd, 'node_modules', 'eslint', 'bin', 'eslint.js');
const result = spawnSync(
  process.execPath,
  [eslintBin, '-c', configPath, ...globs, '--max-warnings', '0'],
  { cwd, stdio: 'pipe', shell: false, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
