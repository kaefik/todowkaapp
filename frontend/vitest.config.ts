import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    alias: {
      '@dnd-kit/core': path.resolve(__dirname, 'src/test/stubs/dnd-kit-core.ts'),
      '@dnd-kit/sortable': path.resolve(__dirname, 'src/test/stubs/dnd-kit-sortable.ts'),
      '@dnd-kit/utilities': path.resolve(__dirname, 'src/test/stubs/dnd-kit-utilities.ts'),
    },
  },
})
