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
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'require-await': 'warn',
  },
};

const configPath = path.join(root, 'scripts', 'lint', '.eslint.deep.jitsi.cjs');
fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};\n`);

const result = spawnSync(
  'npx',
  ['eslint', '-c', configPath, 'server/**/*.js', '--max-warnings', '99999'],
  { cwd, stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);
