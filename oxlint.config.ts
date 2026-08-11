import { defineConfig } from 'oxlint'

export default defineConfig({
  options: {
    typeAware: true,
  },
  ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  rules: {
    // Private fields / window boot stash use leading underscores by convention.
    'eslint/no-underscore-dangle': [
      'warn',
      {
        allow: [
          '__LIFE_BOOT__',
          '_acc',
          '_centerOnAlive',
          '_emit',
          '_gridColor',
          '_onChange',
          '_renderQueued',
        ],
      },
    ],
  },
})
