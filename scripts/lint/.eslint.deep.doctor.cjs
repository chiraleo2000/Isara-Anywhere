module.exports = {
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": [
    "@typescript-eslint",
    "react-hooks",
    "sonarjs",
    "promise"
  ],
  "extends": [],
  "ignorePatterns": [
    "dist/**",
    "node_modules/**",
    "**/*.test.*",
    "**/*.spec.*",
    "coverage/**"
  ],
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "require-await": "warn",
    "no-console": [
      "warn",
      {
        "allow": [
          "warn",
          "error"
        ]
      }
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "sonarjs/no-identical-functions": "warn",
    "sonarjs/cognitive-complexity": [
      "warn",
      25
    ],
    "promise/catch-or-return": "error",
    "promise/no-return-wrap": "error"
  }
};
