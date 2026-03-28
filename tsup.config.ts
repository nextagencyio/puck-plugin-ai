import { defineConfig } from 'tsup'

export default defineConfig([
  // Client-side entry (plugin + chat component)
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['react', 'react-dom', '@puckeditor/core'],
    jsx: 'automatic',
  },
  // Server-side entry (Groq handler + utilities)
  {
    entry: { 'server/index': 'src/server/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external: ['groq-sdk'],
  },
])
