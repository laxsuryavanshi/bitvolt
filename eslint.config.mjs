import { defineConfig, globalIgnores } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { fileURLToPath, URL } from 'node:url';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  // Include ignores from .gitignore.
  includeIgnoreFile(gitignorePath),
]);

export default eslintConfig;
