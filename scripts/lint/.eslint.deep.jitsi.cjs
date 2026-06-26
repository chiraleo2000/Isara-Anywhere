module.exports = {
  "env": {
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "ignorePatterns": [
    "node_modules/**",
    "**/*.test.*",
    "dist/**"
  ],
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-console": "off",
    "require-await": "off"
  }
};
