import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

/**
 * Vitest config for the API package.
 *
 * Scope: the engine under apps/api/src/insights/engine is pure functions over
 * NormalizedTxn[] — no Nest DI, no DB — so unit tests run fast and need no
 * bootstrap. Path aliases mirror apps/api/tsconfig.json so imports of
 * @equiscore/shared resolve to source (the package ships TS, no build step).
 *
 * Run: `pnpm test` (or `pnpm test:watch`). Tests live next to the code as
 * `*.spec.ts`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@equiscore/shared': resolve(__dirname, '../../packages/shared/src'),
      '@equiscore/database': resolve(__dirname, '../../packages/database/src'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    // The engine is pure TS; no DOM, no jsdom needed. Node environment.
    environment: 'node',
    globals: false,
  },
})
