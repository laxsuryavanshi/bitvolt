/** @type {import("eslint").Linter.Config} */
module.exports = {
  env: { browser: true, es2020: true },
  extends: ['bitvolt/react'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.cjs', 'vite.config.ts'],
}
