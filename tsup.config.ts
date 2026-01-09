import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    target: 'node18',
    banner: { js: '#!/usr/bin/env node' },
    outDir: 'dist',
  },
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    target: 'node18',
    outDir: 'dist',
  },
])
