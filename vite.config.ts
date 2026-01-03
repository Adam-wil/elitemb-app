import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsconfigPaths(),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
  ssr: {
    // Mark MUI X packages as external for SSR to avoid CSS import issues
    external: [
      '@mui/x-data-grid',
      '@mui/x-data-grid-pro',
      '@mui/x-data-grid-premium',
      '@mui/x-date-pickers',
    ],
  },
  optimizeDeps: {
    // Prevent Vite from pre-bundling server-only packages for the client
    exclude: ['@prisma/adapter-pg', '@prisma/client', 'pg', 'postgres-bytea', 'pg-types'],
  },
})
