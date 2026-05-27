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
    'require-await': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/cognitive-complexity': ['warn', 25],
    'promise/catch-or-return': 'error',
    'promise/no-return-wrap': 'error',
  },
};

const configPath = path.join(root, 'scripts', 'lint', `.eslint.deep.${portal}.cjs`);
require('node:fs').writeFileSync(
  configPath,
  `module.exports = ${JSON.stringify(config, null, 2)};\n`,
);

const globs = ['src/**/*.{ts,tsx}', 'server/**/*.{ts,js,cjs}'];
const result = spawnSync(
  'npx',
  ['eslint', '-c', configPath, ...globs, '--max-warnings', '99999'],
  { cwd, stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);
