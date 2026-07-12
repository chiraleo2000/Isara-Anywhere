module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh', 'jsx-a11y', 'sonarjs'],
  ignorePatterns: ['dist', 'node_modules', 'node_modules/**', 'node_modules_*', '_trash_*'],
  rules: {},
};
