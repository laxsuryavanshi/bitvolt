/** @type {import("eslint").Linter.Config} */
module.exports = {
  env: {
    node: true,
  },
  plugins: ['@typescript-eslint', 'index'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
    'turbo',
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    'prettier/prettier': 'warn',
    'no-alert': 'error',
    'no-console': 'error',
    'index/only-import-export': 'error',
  },
  reportUnusedDisableDirectives: true,
}
