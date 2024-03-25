/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['bitvolt'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.cjs', 'jest.config.ts'],
  overrides: [
    {
      extends: ['bitvolt/jest'],
      files: ['__tests__/**'],
      rules: {
        'jest/expect-expect': ['error', { assertFunctionNames: ['expect*', 'template.*'] }],
      },
    },
  ],
}
