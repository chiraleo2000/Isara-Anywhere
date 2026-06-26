/** ESLint config for meeting-server backend (Sonar gate — max-warnings 0). */
module.exports = {
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  ignorePatterns: ['node_modules/**', 'dist/**', 'tests/**'],
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-console': 'off',
  },
};
